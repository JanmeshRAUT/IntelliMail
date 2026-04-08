# ML API Production Dockerfile
FROM python:3.11-slim AS builder

WORKDIR /app

COPY ml-model/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --user -r requirements.txt

FROM python:3.11-slim AS runtime

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Copy Python dependencies from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy only necessary API code and models (exclude training data)
COPY ml-model/api.py ./api.py
COPY ml-model/lstm_api.py ./lstm_api.py
COPY ml-model/predict.py ./predict.py
COPY ml-model/predict_email.py ./predict_email.py
COPY ml-model/model.py ./model.py
COPY ml-model/startup.py ./startup.py
COPY ml-model/utils.py ./utils.py

# Copy only pre-trained model artifacts (exclude training data)
COPY ml-model/artifacts/models/phishing_url_model.pkl ./artifacts/models/
COPY ml-model/artifacts/models/phishing_url_model_features.pkl ./artifacts/models/
COPY ml-model/artifacts/models/lstm_model.h5 ./artifacts/models/
COPY ml-model/artifacts/models/tokenizer.pkl ./artifacts/models/

EXPOSE 5000 5001

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD python -c "import socket; s=socket.socket(); s.connect(('localhost', 5000)); s.close()" || exit 1

CMD ["python", "startup.py"]
