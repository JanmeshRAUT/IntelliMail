# -------------------------------
# 🔨 BUILD STAGE
# -------------------------------
FROM python:3.11-slim AS builder

WORKDIR /app

ENV VIRTUAL_ENV=/opt/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install system deps (if needed for ML libs)
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first (for caching)
COPY ml-model/requirements-prod.txt ./requirements.txt

RUN python -m venv "$VIRTUAL_ENV" && \
    pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    python -c "import flask, sklearn, numpy"


# -------------------------------
# 🚀 RUNTIME STAGE
# -------------------------------
FROM python:3.11-slim AS runtime

WORKDIR /app

# Environment optimizations
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV VIRTUAL_ENV=/opt/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install minimal runtime tools
RUN apt-get update && apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user 🔐
RUN useradd -m appuser

# Copy dependencies
COPY --from=builder /opt/venv /opt/venv

# Copy app files
COPY ml-model/api.py ./api.py
COPY ml-model/lstm_api.py ./lstm_api.py
COPY ml-model/predict.py ./predict.py
COPY ml-model/predict_email.py ./predict_email.py
COPY ml-model/model.py ./model.py
COPY ml-model/startup.py ./startup.py
COPY ml-model/utils.py ./utils.py

# Copy model artifacts only
COPY ml-model/artifacts/models/phishing_url_model.pkl ./artifacts/models/
COPY ml-model/artifacts/models/phishing_url_model_features.pkl ./artifacts/models/
COPY ml-model/artifacts/models/lstm_model.h5 ./artifacts/models/
COPY ml-model/artifacts/models/tokenizer.pkl ./artifacts/models/

# Set ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user 🔐
USER appuser

# Expose ports
EXPOSE 5000 5001

# ✅ PROPER HEALTHCHECK (HTTP-based)
HEALTHCHECK --interval=30s --timeout=5s --retries=5 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start application
CMD ["python", "startup.py"]