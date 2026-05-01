"""
Flask API for Phishing URL Detection
Exposes the ML model as a REST API service
"""

from flask import Flask, request, jsonify
import os
import sys
from datetime import datetime
from predict import PhishingURLPredictor

# Initialize Flask app
app = Flask(__name__)

# Model initialization flag
model_initialized = False


def initialize_model():
    """Initialize the ML model on app startup"""
    global model_initialized
    
    model_path = 'phishing_url_model.pkl'
    
    if not os.path.exists(model_path):
        print(f"Warning: Model file not found at {model_path}")
        print("The model needs to be trained first. Run: python train.py")
        return False
    
    try:
        PhishingURLPredictor.initialize(model_path)
        model_initialized = True
        print("Model initialized successfully!")
        return True
    except Exception as e:
        print(f"Error initializing model: {e}")
        return False


@app.before_request
def before_request():
    """Check if model is initialized before handling requests"""
    if not model_initialized:
        return jsonify({
            "success": False,
            "error": "Model not initialized. Please train the model first.",
            "message": "Run 'python train.py' to train the model"
        }), 503


@app.route('/predict-url', methods=['POST'])
def predict_url():
    """
    Predict if a URL is phishing
    
    Request format:
    {
        "url": "http://example.com"
    }
    
    Response format:
    {
        "success": true,
        "url": "http://example.com",
        "prediction": "legitimate",
        "confidence": 0.95,
        "risk_level": "low"
    }
    """
    try:
        # Get request data
        data = request.get_json()
        
        if not data or 'url' not in data:
            return jsonify({
                "success": False,
                "error": "Missing required field: 'url'"
            }), 400
        
        url = data.get('url', '').strip()
        
        if not url:
            return jsonify({
                "success": False,
                "error": "URL cannot be empty"
            }), 400
        
        # Make prediction
        result = PhishingURLPredictor.predict(url)
        
        if result.get('success'):
            return jsonify({
                "success": True,
                "url": url,
                "prediction": result['prediction'],
                "confidence": round(result['confidence'], 4),
                "risk_level": result['risk_level'],
                "timestamp": datetime.utcnow().isoformat(),
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": result.get('error', 'Prediction failed')
            }), 500
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/predict-batch', methods=['POST'])
def predict_batch():
    """
    Predict multiple URLs in batch
    
    Request format:
    {
        "urls": ["http://example.com", "http://phishing.com"]
    }
    
    Response format:
    {
        "success": true,
        "results": [
            {
                "url": "http://example.com",
                "prediction": "legitimate",
                "confidence": 0.95,
                "risk_level": "low"
            },
            ...
        ],
        "summary": {
            "total": 2,
            "phishing_count": 1,
            "legitimate_count": 1
        }
    }
    """
    try:
        # Get request data
        data = request.get_json()
        
        if not data or 'urls' not in data:
            return jsonify({
                "success": False,
                "error": "Missing required field: 'urls'"
            }), 400
        
        urls = data.get('urls', [])
        
        if not isinstance(urls, list):
            return jsonify({
                "success": False,
                "error": "'urls' must be a list"
            }), 400
        
        if len(urls) == 0:
            return jsonify({
                "success": False,
                "error": "URLs list cannot be empty"
            }), 400
        
        if len(urls) > 100:
            return jsonify({
                "success": False,
                "error": "Maximum 100 URLs per request"
            }), 400
        
        # Make predictions
        results = []
        phishing_count = 0
        legitimate_count = 0
        
        for url in urls:
            result = PhishingURLPredictor.predict(url)
            
            if result.get('success'):
                results.append({
                    "url": url,
                    "prediction": result['prediction'],
                    "confidence": round(result['confidence'], 4),
                    "risk_level": result['risk_level'],
                })
                
                if result['prediction'] == 'phishing':
                    phishing_count += 1
                else:
                    legitimate_count += 1
            else:
                results.append({
                    "url": url,
                    "error": result.get('error', 'Prediction failed')
                })
        
        return jsonify({
            "success": True,
            "results": results,
            "summary": {
                "total": len(urls),
                "phishing_count": phishing_count,
                "legitimate_count": legitimate_count
            },
            "timestamp": datetime.utcnow().isoformat(),
        }), 200
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "model_initialized": model_initialized,
        "timestamp": datetime.utcnow().isoformat(),
    }), 200


@app.route('/info', methods=['GET'])
def info():
    """Service information endpoint"""
    return jsonify({
        "service": "Phishing URL Detection API",
        "version": "1.0.0",
        "description": "ML-based phishing URL detection service",
        "endpoints": {
            "POST /predict-url": "Predict single URL",
            "POST /predict-batch": "Predict multiple URLs",
            "GET /health": "Health check",
            "GET /info": "Service information"
        },
        "model_initialized": model_initialized,
    }), 200


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        "success": False,
        "error": "Endpoint not found",
        "message": "See GET /info for available endpoints"
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({
        "success": False,
        "error": "Internal server error"
    }), 500


if __name__ == '__main__':
    print("=" * 50)
    print("Phishing URL Detection API")
    print("=" * 50)
    
    # Initialize model
    if not initialize_model():
        print("\nWarning: Running without trained model")
        print("Endpoints will return 503 Service Unavailable")
    
    # Start Flask server
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', False)
    
    print(f"\nStarting server on port {port}...")
    print(f"API endpoint: http://localhost:{port}/predict-url")
    print(f"Health check: http://localhost:{port}/health")
    print(f"Service info: http://localhost:{port}/info")
    print("\nPress Ctrl+C to stop the server")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
