#!/usr/bin/env python
"""Production API startup - validates models before starting servers."""

import os
import sys
from pathlib import Path

def check_models():
    """Verify required models are present before starting API."""
    models_dir = Path("artifacts/models")
    required_files = [
        "phishing_url_model.pkl",
        "phishing_url_model_features.pkl",
        "lstm_model.h5",
        "tokenizer.pkl",
    ]
    
    missing = []
    for fname in required_files:
        fpath = models_dir / fname
        if not fpath.exists():
            missing.append(str(fpath))
    
    if missing:
        print("ERROR: Missing required model files:", file=sys.stderr)
        for fpath in missing:
            print(f"  - {fpath}", file=sys.stderr)
        print("", file=sys.stderr)
        print("Place pre-trained models in ml-model/artifacts/models/ before starting.", file=sys.stderr)
        return False
    
    print("✓ All required models found")
    return True

def start_apis():
    """Start both API services."""
    import subprocess
    import threading
    import time
    
    print("Starting ML API services...")
    
    # Start both Flask apps in the same process (simplified for Docker)
    # In production, you may want to use gunicorn or separate containers
    try:
        from api import app as url_api, predict_url_endpoint
        from lstm_api import app as lstm_api
        import logging
        
        # Disable Flask's debug logging spam
        logging.getLogger('werkzeug').setLevel(logging.WARNING)
        
        print("✓ API modules loaded successfully")
        print("✓ Starting URL prediction API on port 5000...")
        print("✓ Starting LSTM email API on port 5001...")
        
        # Start both apps
        def run_url_api():
            url_api.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
        
        def run_lstm_api():
            lstm_api.run(host="0.0.0.0", port=5001, debug=False, use_reloader=False)
        
        t1 = threading.Thread(target=run_url_api, daemon=True)
        t2 = threading.Thread(target=run_lstm_api, daemon=True)
        
        t1.start()
        time.sleep(1)  # Small delay between starts
        t2.start()
        
        # Keep main thread alive
        t1.join()
        t2.join()
        
    except Exception as e:
        print(f"ERROR: Failed to start APIs: {e}", file=sys.stderr)
        return False
    
    return True

if __name__ == "__main__":
    if not check_models():
        sys.exit(1)
    
    if not start_apis():
        sys.exit(1)
