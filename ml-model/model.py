"""
Phishing URL Detection Model
Random Forest Classifier for detecting malicious URLs
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, confusion_matrix, classification_report
from sklearn.preprocessing import StandardScaler
import joblib
from typing import Tuple, Dict
import os

from utils import extract_features, get_feature_names, features_to_list


class PhishingURLModel:
    """Random Forest model for phishing URL detection"""
    
    def __init__(self, n_estimators: int = 100, random_state: int = 42):
        """
        Initialize the model
        
        Args:
            n_estimators: Number of trees in the forest
            random_state: Random state for reproducibility
        """
        self.model = RandomForestClassifier(
            n_estimators=n_estimators,
            random_state=random_state,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            n_jobs=-1,
        )
        self.scaler = StandardScaler()
        self.feature_names = get_feature_names()
        self.is_trained = False
    
    def prepare_training_data(self, csv_path: str) -> Tuple[np.ndarray, np.ndarray]:
        """
        Load and prepare training data from CSV
        
        Expected CSV format:
        - URL column (url, URL, or first column)
        - Label column (label, label, or last column with 0/1 values)
        
        Args:
            csv_path: Path to CSV file
            
        Returns:
            Tuple of (feature_matrix, labels)
        """
        print(f"Loading data from {csv_path}...")
        
        # Load CSV
        df = pd.read_csv(csv_path)
        print(f"Loaded {len(df)} URLs")
        
        # Find URL column
        url_column = None
        for col in ['url', 'URL', 'link', 'Link', df.columns[0]]:
            if col in df.columns:
                url_column = col
                break
        
        if url_column is None:
            url_column = df.columns[0]
        
        # Find label column
        label_column = None
        for col in ['label', 'Label', 'is_phishing', 'phishing', df.columns[-1]]:
            if col in df.columns:
                label_column = col
                break
        
        if label_column is None:
            label_column = df.columns[-1]
        
        print(f"Using URL column: {url_column}")
        print(f"Using Label column: {label_column}")
        
        # Extract URLs and labels
        urls = df[url_column].astype(str).values
        labels = df[label_column].astype(int).values
        
        # Check label distribution
        unique, counts = np.unique(labels, return_counts=True)
        print(f"Label distribution: {dict(zip(unique, counts))}")
        
        # Extract features
        print("Extracting features...")
        features_list = []
        for i, url in enumerate(urls):
            if i % 1000 == 0:
                print(f"  Processed {i}/{len(urls)} URLs")
            
            features = extract_features(url)
            features_list.append(features_to_list(features, self.feature_names))
        
        X = np.array(features_list)
        y = labels
        
        print(f"Feature matrix shape: {X.shape}")
        print(f"Feature names: {self.feature_names}")
        
        return X, y
    
    def train(self, X: np.ndarray, y: np.ndarray, test_size: float = 0.2) -> Dict:
        """
        Train the model
        
        Args:
            X: Feature matrix
            y: Labels
            test_size: Proportion of data to use for testing
            
        Returns:
            Dictionary with training metrics
        """
        print(f"\nTraining model with {len(X)} samples...")
        
        # Split dataset
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y
        )
        
        print(f"Training set size: {len(X_train)}")
        print(f"Test set size: {len(X_test)}")
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        print("Training Random Forest Classifier...")
        self.model.fit(X_train_scaled, y_train)
        self.is_trained = True
        
        # Make predictions
        y_pred_train = self.model.predict(X_train_scaled)
        y_pred_test = self.model.predict(X_test_scaled)
        
        # Evaluate
        metrics = {
            'train_accuracy': accuracy_score(y_train, y_pred_train),
            'test_accuracy': accuracy_score(y_test, y_pred_test),
            'precision': precision_score(y_test, y_pred_test),
            'recall': recall_score(y_test, y_pred_test),
            'confusion_matrix': confusion_matrix(y_test, y_pred_test).tolist(),
            'classification_report': classification_report(y_test, y_pred_test),
        }
        
        # Print results
        print("\n=== Model Training Results ===")
        print(f"Train Accuracy: {metrics['train_accuracy']:.4f}")
        print(f"Test Accuracy:  {metrics['test_accuracy']:.4f}")
        print(f"Precision:      {metrics['precision']:.4f}")
        print(f"Recall:         {metrics['recall']:.4f}")
        print(f"\nConfusion Matrix:\n{np.array(metrics['confusion_matrix'])}")
        print(f"\nClassification Report:\n{metrics['classification_report']}")
        
        # Feature importance
        feature_importance = {
            name: importance
            for name, importance in zip(self.feature_names, self.model.feature_importances_)
        }
        feature_importance_sorted = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
        
        print("\n=== Top 10 Important Features ===")
        for feature, importance in feature_importance_sorted[:10]:
            print(f"{feature}: {importance:.4f}")
        
        return metrics
    
    def predict(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Make predictions
        
        Args:
            X: Feature matrix
            
        Returns:
            Tuple of (predictions, probabilities)
        """
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        X_scaled = self.scaler.transform(X)
        predictions = self.model.predict(X_scaled)
        probabilities = self.model.predict_proba(X_scaled)
        
        return predictions, probabilities
    
    def predict_url(self, url: str) -> Tuple[str, float]:
        """
        Predict if a single URL is phishing
        
        Args:
            url: URL to predict
            
        Returns:
            Tuple of (prediction, confidence)
        """
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        # Extract features
        from utils import extract_features
        features = extract_features(url)
        X = np.array([features_to_list(features, self.feature_names)])
        
        # Predict
        predictions, probabilities = self.predict(X)
        prediction = predictions[0]
        confidence = max(probabilities[0])
        
        label = "phishing" if prediction == 1 else "legitimate"
        
        return label, float(confidence)
    
    def save(self, model_path: str) -> None:
        """
        Save trained model and scaler to disk
        
        Args:
            model_path: Path to save model file
        """
        if not self.is_trained:
            raise ValueError("Cannot save untrained model")
        
        model_dir = os.path.dirname(model_path)
        if model_dir and not os.path.exists(model_dir):
            os.makedirs(model_dir)
        
        # Save model and scaler
        joblib.dump(self.model, model_path)
        
        # Save scaler
        scaler_path = model_path.replace('.pkl', '_scaler.pkl')
        joblib.dump(self.scaler, scaler_path)
        
        # Save feature names
        feature_names_path = model_path.replace('.pkl', '_features.pkl')
        joblib.dump(self.feature_names, feature_names_path)
        
        print(f"Model saved to {model_path}")
        print(f"Scaler saved to {scaler_path}")
        print(f"Feature names saved to {feature_names_path}")
    
    @classmethod
    def load(cls, model_path: str) -> 'PhishingURLModel':
        """
        Load trained model from disk
        
        Args:
            model_path: Path to model file
            
        Returns:
            Loaded PhishingURLModel instance
        """
        instance = cls()
        
        # Load model
        instance.model = joblib.load(model_path)
        
        # Load scaler
        scaler_path = model_path.replace('.pkl', '_scaler.pkl')
        instance.scaler = joblib.load(scaler_path)
        
        # Load feature names
        feature_names_path = model_path.replace('.pkl', '_features.pkl')
        instance.feature_names = joblib.load(feature_names_path)
        
        instance.is_trained = True
        
        print(f"Model loaded from {model_path}")
        
        return instance
