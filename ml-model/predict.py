"""
Prediction Module for Phishing URL Detection
Provides functions to predict if a URL is phishing
"""

import os
from typing import Tuple, Dict
from model import PhishingURLModel


class PhishingURLPredictor:
    """Predictor class for loading and using the trained model"""
    
    _instance = None
    _model = None
    
    def __new__(cls):
        """Singleton pattern - ensure only one model is loaded"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    def initialize(cls, model_path: str = 'phishing_url_model.pkl'):
        """
        Initialize the predictor with a trained model
        
        Args:
            model_path: Path to the trained model file
        """
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        
        print(f"Loading model from {model_path}...")
        cls._model = PhishingURLModel.load(model_path)
        print("Model loaded successfully!")
    
    @classmethod
    def predict(cls, url: str) -> Dict[str, any]:
        """
        Predict if a URL is phishing
        
        Args:
            url: URL to predict
            
        Returns:
            Dictionary with prediction results:
            {
                "url": str,
                "prediction": "phishing" or "legitimate",
                "confidence": float (0-1),
                "risk_level": "high", "medium", or "low"
            }
        """
        if cls._model is None:
            raise RuntimeError("Model not initialized. Call initialize() first.")
        
        try:
            prediction, confidence = cls._model.predict_url(url)
            
            # Determine risk level based on confidence and prediction
            if prediction == "phishing":
                if confidence > 0.8:
                    risk_level = "high"
                elif confidence > 0.6:
                    risk_level = "medium"
                else:
                    risk_level = "low"
            else:
                risk_level = "low"
            
            return {
                "url": url,
                "prediction": prediction,
                "confidence": confidence,
                "risk_level": risk_level,
                "success": True,
            }
        except Exception as e:
            return {
                "url": url,
                "prediction": None,
                "confidence": None,
                "risk_level": None,
                "error": str(e),
                "success": False,
            }


# Convenience functions
def predict_url(url: str) -> Dict[str, any]:
    """
    Predict if a URL is phishing
    
    Args:
        url: URL to predict
        
    Returns:
        Dictionary with prediction results
    """
    predictor = PhishingURLPredictor()
    return predictor.predict(url)


def predict_urls(urls: list) -> list:
    """
    Predict multiple URLs
    
    Args:
        urls: List of URLs to predict
        
    Returns:
        List of prediction results
    """
    results = []
    for url in urls:
        result = predict_url(url)
        results.append(result)
    return results


if __name__ == '__main__':
    import sys
    
    # Example usage
    if len(sys.argv) < 2:
        print("Usage: python predict.py <url>")
        print("\nExample:")
        print("  python predict.py 'https://www.google.com'")
        print("  python predict.py 'http://verify-account-login.malicious.com'")
        sys.exit(1)
    
    url = sys.argv[1]
    
    # Initialize and predict
    try:
        PhishingURLPredictor.initialize()
        result = predict_url(url)
        
        print("\n=== Prediction Result ===")
        print(f"URL: {result['url']}")
        print(f"Prediction: {result['prediction'].upper()}")
        print(f"Confidence: {result['confidence']:.1%}")
        print(f"Risk Level: {result['risk_level'].upper()}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
