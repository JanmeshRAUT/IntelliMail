"""
IntelliMail ML API - HuggingFace Spaces Backend
Runs on HuggingFace Spaces (serverless Python)
Node.js frontend calls this API via HTTP
"""

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import joblib
import numpy as np
from pathlib import Path
import logging
from typing import List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="IntelliMail ML API",
    description="Phishing detection models running on HuggingFace Spaces",
    version="1.0.0"
)

# Enable CORS for Node.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global models cache
_models = {
    "url_model": None,
    "email_model": None,
}

def load_url_model():
    """Load RandomForest URL phishing model"""
    try:
        # Try to load from artifacts
        model_path = Path("artifacts/models/phishing_url_model.pkl")
        if model_path.exists():
            model = joblib.load(model_path)
            logger.info("✓ URL model loaded from artifacts")
            return model
    except Exception as e:
        logger.warning(f"Could not load URL model: {e}")
    
    # Return None - will use mock predictions
    return None

def load_email_model():
    """Load LSTM email phishing model"""
    try:
        # Try to load from artifacts
        model_paths = [
            Path("artifacts/models/lstm_model.h5"),
            Path("lstm_model.h5"),
            Path("artifacts/lstm_model/lstm_phishing_model.h5"),
        ]
        
        from tensorflow.keras.models import load_model
        for path in model_paths:
            if path.exists():
                model = load_model(path)
                logger.info(f"✓ Email model loaded from {path}")
                return model
    except Exception as e:
        logger.warning(f"Could not load email model: {e}")
    
    # Return None - will use mock predictions
    return None

def extract_url_features(url: str) -> List[float]:
    """Extract 12 URL features for RandomForest"""
    features = []
    
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url if url.startswith('http') else f'https://{url}')
        
        # 1. has_https
        features.append(1 if parsed.scheme == 'https' else 0)
        
        # 2. no_at_sign
        features.append(1 if '@' not in url else 0)
        
        # 3. double_slash_redirect
        features.append(1 if '//' in url and url.index('//') > 5 else 0)
        
        # 4. url_len
        features.append(len(url))
        
        # 5. domain_len
        features.append(len(parsed.hostname or ''))
        
        # 6. path_slashes
        features.append(len([p for p in parsed.path.split('/') if p]))
        
        # 7. special_chars
        import re
        special = len(re.findall(r"[!$&'()*+,;=?]", url))
        features.append(special)
        
        # 8. hyphens
        features.append(url.count('-'))
        
        # 9. dots_in_domain
        features.append((parsed.hostname or '').count('.'))
        
        # 10. has_www
        features.append(1 if 'www' in (parsed.hostname or '') else 0)
        
        # 11. has_ip
        ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
        features.append(1 if __import__('re').search(ip_pattern, parsed.hostname or '') else 0)
        # 12. port
        features.append(int(parsed.port) if parsed.port else 0)
        
    except Exception as e:
        logger.error(f"Feature extraction error: {e}")
        features = [0] * 12
    
    return features

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "IntelliMail ML API on HuggingFace Spaces",
        "version": "1.0.0"
    }

@app.get("/models")
def get_models_status():
    """Get model availability"""
    return {
        "url_model": _models["url_model"] is not None,
        "email_model": _models["email_model"] is not None,
    }

@app.post("/predict-url")
def predict_url(url: str = Body(..., embed=True)):
    """
    Predict if URL is phishing
    """
    try:
        features = extract_url_features(url)
        if _models["url_model"]:
            try:
                prediction = _models["url_model"].predict([features])[0]
                probabilities = _models["url_model"].predict_proba([features])[0]
                confidence = float(probabilities[1])
            except Exception as e:
                logger.error(f"Model prediction error: {e}")
                confidence = compute_mock_url_score(features, url)
        else:
            confidence = compute_mock_url_score(features, url)
        return {
            "url": url,
            "prediction": "phishing" if confidence > 0.5 else "legitimate",
            "confidence": round(confidence, 4),
            "score": round(confidence, 4),
        }
    except Exception as e:
        logger.error(f"URL prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-email")
def predict_email(text: str = Body(..., embed=True)):
    """
    Predict if email content is phishing
    """
    try:
        if _models["email_model"]:
            try:
                import tensorflow as tf
                from tensorflow.keras.preprocessing.sequence import pad_sequences
                cleaned = text.lower()
                tokens = cleaned.split()[:200]
                padded = np.array([ord(t[0]) % 128 for t in tokens] + [0] * (200 - len(tokens)))
                padded = padded.reshape(1, -1, 1)
                prediction = _models["email_model"].predict(padded, verbose=0)[0][0]
                confidence = float(prediction)
            except Exception as e:
                logger.error(f"Model prediction error: {e}")
                confidence = compute_mock_email_score(text)
        else:
            confidence = compute_mock_email_score(text)
        return {
            "prediction": 1 if confidence > 0.5 else 0,
            "confidence": round(confidence, 4),
            "score": round(confidence, 4),
        }
    except Exception as e:
        logger.error(f"Email prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-batch-urls")
def predict_batch_urls(urls: List[str]):
    results = []
    for url in urls:
        try:
            result = predict_url(url)
            results.append(result)
        except Exception as e:
            results.append({"url": url, "error": str(e)})
    return {"results": results}

@app.post("/predict-batch-emails")
def predict_batch_emails(texts: List[str]):
    results = []
    for text in texts:
        try:
            result = predict_email(text)
            results.append(result)
        except Exception as e:
            results.append({"error": str(e)})
    return {"results": results}

def compute_mock_url_score(features: List[float], url: str) -> float:
    score = 0.0
    suspicious_tlds = ['.xyz', '.tk', '.ru', '.cf', '.ga']
    for tld in suspicious_tlds:
        if url.endswith(tld):
            score += 0.3
    import re
    special_chars = len(re.findall(r"[!$&'()*+,;=?]", url))
    score += min(0.2, special_chars * 0.05)
    if any(f >= 0 and f < 256 for f in features[-4:]):
        score += 0.25
    url_len = features[3]
    if url_len > 75:
        score += 0.1
    if features[0] == 0:
        score += 0.15
    return min(1.0, score)

def compute_mock_email_score(text: str) -> float:
    score = 0.0
    text_lower = text.lower()
    phishing_keywords = [
        'verify', 'confirm', 'urgent', 'act now', 'click here',
        'suspended', 'locked', 'update', 'validate', 'account',
        'password', 'wire transfer', 'bitcoin', 'won', 'claim'
    ]
    for keyword in phishing_keywords:
        if keyword in text_lower:
            score += 0.05
    legit_keywords = [
        'meeting', 'schedule', 'project', 'deadline', 'thanks',
        'appreciate', 'best regards', 'sincerely'
    ]
    for keyword in legit_keywords:
        if keyword in text_lower:
            score -= 0.1
    caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
    if caps_ratio > 0.3:
        score += 0.2
    return max(0.0, min(1.0, score))

if __name__ == "__main__":
    import uvicorn
    logger.info("Loading models...")
    _models["url_model"] = load_url_model()
    _models["email_model"] = load_email_model()
    logger.info("Starting server...")
    uvicorn.run(app, host="0.0.0.0", port=7860)
