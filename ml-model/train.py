"""
Training Script for Phishing URL Detection Model
Run this script to train and save the model
"""

import os
import sys
from model import PhishingURLModel


def main():
    """Main training function"""
    
    # Model configuration
    data_path = 'data/phishing_urls.csv'
    model_path = 'phishing_url_model.pkl'
    
    # Check if data file exists
    if not os.path.exists(data_path):
        print(f"Error: Data file not found at {data_path}")
        print(f"Please ensure the phishing URLs dataset is placed in the data/ folder")
        print(f"\nExpected format:")
        print(f"  - URL column: 'url', 'URL', or first column")
        print(f"  - Label column: 'label', 'Label', or last column")
        print(f"  - Labels: 0 for legitimate, 1 for phishing")
        sys.exit(1)
    
    # Create model
    print("Initializing Phishing URL Detection Model...")
    model = PhishingURLModel(n_estimators=100)
    
    # Prepare data
    X, y = model.prepare_training_data(data_path)
    
    # Train model
    metrics = model.train(X, y, test_size=0.2)
    
    # Save model
    print(f"\nSaving model to {model_path}...")
    model.save(model_path)
    
    print("\n=== Training Complete ===")
    print(f"Model saved successfully!")
    print(f"Model file: {model_path}")
    print(f"You can now use this model for predictions.")


if __name__ == '__main__':
    main()
