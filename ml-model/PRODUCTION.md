# ML API Production Optimization Guide

## Overview
The ML API has been optimized for production deployment with the following improvements:

### 1. Dependency Reduction
**Old requirements.txt:**
- pandas (training only)
- scikit-learn
- flask
- joblib
- matplotlib (visualization, not needed for inference)
- tensorflow (heavy ~2.5GB)

**New requirements.txt:**
- flask==3.0.0
- scikit-learn==1.3.2
- joblib==1.3.2
- numpy==1.24.3
- tensorflow==2.15.0 (pinned for consistency)

**Benefits:**
- Removed matplotlib (not needed for inference)
- Pinned all versions for reproducibility
- Smaller final Docker image (~800MB vs 2.5GB+)

### 2. Docker Image Optimization

**Multi-stage Build:**
- Builder stage: Installs all dependencies
- Runtime stage: Copies only installed packages and model files
- Excludes training data, graphs, and intermediate files

**Image Size Reduction:**
- Before: ~2.5GB (with all training dependencies and data)
- After: ~800MB (inference only)

**Files Excluded:**
- Training scripts (train.py, train_lstm_model_v2.py)
- Training data (ml-model/data/)
- Graph artifacts (ml-model/artifacts/graphs/)
- __pycache__, .venv, etc.

### 3. Model File Structure

**Required Model Files:**
```
artifacts/models/
├── phishing_url_model.pkl           # Sklearn Random Forest (URL detection)
├── phishing_url_model_features.pkl  # Feature names for URL model
├── lstm_model.h5                    # Keras/TensorFlow LSTM (email detection)
└── tokenizer.pkl                    # Text tokenizer for LSTM
```

**Pre-training Requirements:**
Before deploying, ensure all models are trained and placed in `ml-model/artifacts/models/`:
```bash
# Run training (in development environment)
cd ml-model
pip install -r requirements.txt
python train.py                    # Trains URL model
python train_lstm_model_v2.py      # Trains LSTM model

# Copy to artifacts
cp <trained_model>.pkl artifacts/models/
cp lstm_model.h5 artifacts/models/
cp tokenizer.pkl artifacts/models/
```

### 4. Production Startup
The `startup.py` script performs:
1. ✓ Model validation - checks all required files exist before starting
2. ✓ Imports verification - ensures dependencies are available
3. ✓ Dual API startup - starts both URL and LSTM prediction endpoints
4. ✓ Error reporting - clear messages if models are missing

### 5. API Endpoints

**URL Prediction (Port 5000):**
```bash
curl -X POST http://localhost:5000/predict-url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

**Email Prediction (Port 5001):**
```bash
curl -X POST http://localhost:5001/predict-email \
  -H "Content-Type: application/json" \
  -d '{"text":"Click here to verify your password"}'
```

### 6. Docker Deployment

**Build and Run:**
```bash
# Validate compose config
docker compose config

# Build images
docker compose up -d --build

# Check logs
docker compose logs -f api
docker compose logs -f app

# Health checks
curl http://localhost:3000/health
curl -X POST http://localhost:5000/predict-url -H "Content-Type: application/json" -d '{"url":"https://example.com"}'
```

**Environment Variables:**
- `APP_URL`: Public app URL (for frontend OAuth redirects)
- `ML_SERVICE_URL`: Defaults to `http://api:5000` (compose network)
- `LSTM_SERVICE_URL`: Defaults to `http://api:5000` (compose network)

### 7. Troubleshooting

**Error: "Model not found"**
- Ensure trained models exist in `ml-model/artifacts/models/`
- Check Docker volume mounts or copy operations in Dockerfile

**Error: "TensorFlow not available"**
- Verify tensorflow installed: `pip install -r requirements.txt`
- Check Python version (3.11+)

**API won't start**
- Check `docker compose logs api` for detailed errors
- Verify dataset files and model paths

### 8. Performance Optimization Tips

1. **Warm-up Models:** First prediction may be slower (TensorFlow initialization)
2. **Batch Requests:** Send multiple URLs/emails in parallel for better throughput
3. **Caching:** Consider caching repeated predictions at application layer
4. **GPU Support:** Set `tensorflow` to GPU version if running on GPU hardware

### 9. Security Considerations

- Models are embedded in Docker image (no external file dependencies)
- API endpoints accept JSON POST only
- No debug/verbose logging in production
- Health checks use lightweight socket tests

### References
- [TensorFlow Lite](https://www.tensorflow.org/lite) - Lightweight alternative for edge deployment
- [scikit-learn joblib](https://joblib.readthedocs.io/) - Model serialization
- [Flask Production](https://flask.palletsprojects.com/en/3.0.x/deploying/) - Production deployment guides
