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
import os
import pickle
from typing import List
from huggingface_hub import hf_hub_download
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

REPO_ID = "JerryJR1705/ThreadDetection"

app = FastAPI(
    title="IntelliMail ML API",
    description="Phishing detection models running on HuggingFace Spaces",
    version="1.0.0"
)

from fastapi.responses import HTMLResponse
from datetime import datetime

# Request logging storage
_recent_requests = []

def log_api_call(endpoint: str, payload: dict):
    """Log the last 10 API calls for visual debugging"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    _recent_requests.insert(0, {
        "timestamp": timestamp,
        "endpoint": endpoint,
        "payload": str(payload)[:100] + "..." if len(str(payload)) > 100 else str(payload)
    })
    if len(_recent_requests) > 10:
        _recent_requests.pop()

# Enable CORS for Node.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", response_class=HTMLResponse)
def root():
    """Welcome page with Live API Logs"""
    log_rows = ""
    for req in _recent_requests:
        log_rows += f"""
        <tr>
            <td style="color: #64748b; padding: 1.25rem 1.5rem; font-size: 0.85rem; border-bottom: 1px solid #f1f5f9;">{req['timestamp']}</td>
            <td style="padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9;">
                <span style="color: #2563eb; background: #eff6ff; padding: 0.25rem 0.6rem; border-radius: 0.5rem; font-weight: 600; font-size: 0.75rem;">{req['endpoint']}</span>
            </td>
            <td style="color: #334155; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9; line-height: 1.5;">{req['payload']}</td>
        </tr>
        """
    
    if not log_rows:
        log_rows = "<tr><td colspan='3' style='text-align:center; padding: 4rem; color: #94a3b8; font-style: italic;'>Waiting for inbound API requests...</td></tr>"

    # Dynamic status based on models
    models_ready = _models["url_model"] is not None and _models["email_model"] is not None
    status_text = "SYSTEM ACTIVE" if models_ready else "MODELS LOADING"
    status_color = "#10b981" if models_ready else "#f59e0b"
    status_bg = "#f0fdf4" if models_ready else "#fffbeb"
    status_border = "#dcfce7" if models_ready else "#fef3c7"

    return f"""
    <html>
        <head>
            <title>IntelliMail Monitor</title>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                :root {{
                    --primary: #2563eb;
                    --bg: #ffffff;
                    --text-main: #0f172a;
                    --text-muted: #64748b;
                    --border: #f1f5f9;
                }}
                body {{ 
                    font-family: 'Outfit', sans-serif; 
                    background: var(--bg); 
                    color: var(--text-main); 
                    margin: 0; 
                    padding: 3rem 1.5rem; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    min-height: 100vh; 
                }}
                .container {{ width: 100%; max-width: 1000px; }}
                .top-bar {{
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 3rem;
                    border-bottom: 2px solid var(--border);
                    padding-bottom: 1.5rem;
                }}
                h1 {{ 
                    margin: 0; 
                    font-size: 1.75rem; 
                    font-weight: 700; 
                    display: flex; 
                    align-items: center; 
                    gap: 0.75rem;
                    letter-spacing: -0.02em;
                }}
                .status-badge {{ 
                    display: inline-flex; 
                    align-items: center; 
                    gap: 0.6rem; 
                    padding: 0.5rem 1rem; 
                    background: {status_bg}; 
                    color: {status_color}; 
                    border-radius: 999px; 
                    font-weight: 700; 
                    font-size: 0.75rem; 
                    border: 1px solid {status_border};
                    letter-spacing: 0.05em;
                }}
                .status-dot {{ 
                    width: 10px; 
                    height: 10px; 
                    background: {status_color}; 
                    border-radius: 50%; 
                    box-shadow: 0 0 0 4px {status_bg};
                    animation: blink 1.5s infinite; 
                }}
                @keyframes blink {{ 0% {{ opacity: 1; }} 50% {{ opacity: 0.4; }} 100% {{ opacity: 1; }} }}
                
                .log-card {{
                    background: #ffffff;
                    border: 1px solid var(--border);
                    border-radius: 1.25rem;
                    overflow: hidden;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.04);
                }}
                table {{ width: 100%; border-collapse: collapse; }}
                th {{ 
                    text-align: left; 
                    padding: 1.25rem 1.5rem; 
                    background: #fbfcfd; 
                    font-size: 0.8rem; 
                    font-weight: 600;
                    text-transform: uppercase; 
                    letter-spacing: 0.05em; 
                    color: var(--text-muted);
                    border-bottom: 1px solid var(--border);
                }}
                .endpoints {{
                    display: flex;
                    gap: 0.75rem;
                    margin-top: 1rem;
                }}
                .pill {{
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    background: #f8fafc;
                    padding: 0.3rem 0.75rem;
                    border-radius: 0.5rem;
                    border: 1px solid var(--border);
                }}
                footer {{
                    margin-top: 4rem;
                    text-align: center;
                    color: #cbd5e1;
                    font-size: 0.85rem;
                    font-weight: 500;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="top-bar">
                    <div>
                        <h1>IntelliMail Monitor</h1>
                        <div class="endpoints">
                            <span class="pill">/predict-url</span>
                            <span class="pill">/predict-email</span>
                            <span class="pill">/health</span>
                        </div>
                    </div>
                    <div class="status-badge">
                        <div class="status-dot"></div>
                        {status_text}
                    </div>
                </div>

                <div class="log-card">
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 160px;">Timestamp</th>
                                <th style="width: 180px;">Endpoint</th>
                                <th>Payload Summary</th>
                            </tr>
                        </thead>
                        <tbody>
                            {log_rows}
                        </tbody>
                    </table>
                </div>
                
                <footer>
                    &copy; 2026 IntelliMail Security • Private Analytical Instance v1.2
                </footer>
            </div>
        </body>
    </html>
    """

# Global models cache
_models = {
    "url_model": None,
    "email_model": None,
    "tokenizer": None,
}

def ensure_models_downloaded():
    """Download models from HF Hub if not present"""
    model_files = [
        "artifacts/models/phishing_url_model.pkl",
        "artifacts/models/lstm_model.h5",
        "artifacts/models/tokenizer.pkl"
    ]
    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_API_KEY")
    for filename in model_files:
        if not os.path.exists(filename):
            try:
                logger.info(f"Downloading {filename} from {REPO_ID}...")
                hf_hub_download(repo_id=REPO_ID, filename=filename, local_dir=".", token=token)
            except Exception as e:
                logger.error(f"Failed to download {filename}: {e}")

def load_url_model():
    """Load RandomForest URL phishing model"""
    try:
        # Ensure models are downloaded
        ensure_models_downloaded()
        
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
    """Load LSTM email phishing model and tokenizer"""
    try:
        # Ensure models are downloaded
        ensure_models_downloaded()
        
        # Load labels/tokenizer
        tokenizer_path = Path("artifacts/models/tokenizer.pkl")
        if tokenizer_path.exists():
            with open(tokenizer_path, "rb") as f:
                _models["tokenizer"] = pickle.load(f)
                logger.info("✓ Tokenizer loaded")

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
    
    Args:
        url: URL to analyze
    
    Returns:
        {
            "url": str,
            "prediction": "phishing" | "legitimate",
            "confidence": float (0-1),
            "score": float (0-1)
        }
    """
    try:
        log_api_call("/predict-url", {"url": url})
        features = extract_url_features(url)
        
        # Use model if loaded
        if _models["url_model"]:
            try:
                prediction = _models["url_model"].predict([features])[0]
                probabilities = _models["url_model"].predict_proba([features])[0]
                confidence = float(probabilities[1])  # Probability of phishing
            except Exception as e:
                logger.error(f"Model prediction error: {e}")
                # Fallback: mock prediction based on features
                confidence = compute_mock_url_score(features, url)
        else:
            # No model loaded - use heuristic scoring
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
    
    Args:
        text: Email body text
    
    Returns:
        {
            "prediction": 0 | 1,
            "confidence": float (0-1),
            "score": float (0-1)
        }
    """
    try:
        log_api_call("/predict-email", {"text_length": len(text)})
        # Use model if loaded
        if _models["email_model"] and _models["tokenizer"]:
            try:
                from tensorflow.keras.preprocessing.sequence import pad_sequences
                
                # Proper cleaning and tokenization
                import re
                cleaned = str(text).lower()
                cleaned = re.sub(r"[^a-z0-9\s]", " ", cleaned)
                cleaned = re.sub(r"\s+", " ", cleaned).strip()
                
                sequence = _models["tokenizer"].texts_to_sequences([cleaned])
                padded = pad_sequences(sequence, maxlen=200)
                
                prediction = _models["email_model"].predict(padded, verbose=0)[0][0]
                confidence = float(prediction)
            except Exception as e:
                logger.error(f"Model prediction error: {e}")
                confidence = compute_mock_email_score(text)
        else:
            # No model loaded - use heuristic scoring
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
    """Predict multiple URLs"""
    log_api_call("/predict-batch-urls", {"count": len(urls)})
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
    """Predict multiple emails"""
    log_api_call("/predict-batch-emails", {"count": len(texts)})
    results = []
    for text in texts:
        try:
            result = predict_email(text)
            results.append(result)
        except Exception as e:
            results.append({"error": str(e)})
    return {"results": results}

def compute_mock_url_score(features: List[float], url: str) -> float:
    """
    Compute score based on features (fallback when model unavailable)
    """
    score = 0.0
    
    # Suspicious indicators
    suspicious_tlds = ['.xyz', '.tk', '.ru', '.cf', '.ga']
    for tld in suspicious_tlds:
        if url.endswith(tld):
            score += 0.3
    
    # Check for special characters (common in phishing URLs)
    import re
    special_chars = len(re.findall(r"[!$&'()*+,;=?]", url))
    score += min(0.2, special_chars * 0.05)
    
    # Check for IP address
    if any(f >= 0 and f < 256 for f in features[-4:]):  # Port/IP features
        score += 0.25
    
    # Check URL length
    url_len = features[3]
    if url_len > 75:
        score += 0.1
    
    # Missing HTTPS
    if features[0] == 0:
        score += 0.15
    
    return min(1.0, score)

def compute_mock_email_score(text: str) -> float:
    """
    Compute score based on text features (fallback when model unavailable)
    """
    score = 0.0
    text_lower = text.lower()
    
    # Phishing keywords
    phishing_keywords = [
        'verify', 'confirm', 'urgent', 'act now', 'click here',
        'suspended', 'locked', 'update', 'validate', 'account',
        'password', 'wire transfer', 'bitcoin', 'won', 'claim'
    ]
    
    for keyword in phishing_keywords:
        if keyword in text_lower:
            score += 0.05
    
    # Legitimate keywords
    legit_keywords = [
        'meeting', 'schedule', 'project', 'deadline', 'thanks',
        'appreciate', 'best regards', 'sincerely'
    ]
    
    for keyword in legit_keywords:
        if keyword in text_lower:
            score -= 0.1
    
    # All caps (suspicious)
    caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
    if caps_ratio > 0.3:
        score += 0.2
    
    return max(0.0, min(1.0, score))

if __name__ == "__main__":
    import uvicorn
    
    # Try to load models on startup
    logger.info("Loading models...")
    _models["url_model"] = load_url_model()
    _models["email_model"] = load_email_model()
    
    logger.info("Starting server...")
    uvicorn.run(app, host="0.0.0.0", port=7860)
