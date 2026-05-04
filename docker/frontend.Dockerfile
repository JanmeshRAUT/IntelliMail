# ----------- BUILD STAGE -----------
FROM node:22-alpine AS builder

WORKDIR /app

# Accept build-time environment variables
ARG VITE_API_URL=http://localhost:3000
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_ML_SERVICE_URL="https://JerryJR1705-intellmail.hf.space/"
ARG NODE_ENV=production

# Set build-time environment variables
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV VITE_ML_SERVICE_URL=${VITE_ML_SERVICE_URL}
ENV NODE_ENV=${NODE_ENV}

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build
RUN npm run build:server


# ----------- PRODUCTION STAGE -----------
FROM node:22-alpine

WORKDIR /app

# Accept runtime environment variables with defaults
ENV VITE_API_URL=http://localhost:3000 \
    PORT=3000 \
    NODE_ENV=production \
    DATABASEURL="" \
    VITE_GOOGLE_CLIENT_ID="" \
    HUGGINGFACE_API_KEY="" \
    ML_SERVICE_URL="" \
    VITE_ML_SERVICE_URL="https://JerryJR1705-intellmail.hf.space/" \
    LSTM_SERVICE_URL="" \
    VITE_LSTM_SERVICE_URL=""

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./
COPY --from=builder /app/package*.json ./

RUN npm ci --omit=dev

EXPOSE 3000

# Create entrypoint script to handle environment variables
RUN echo '#!/bin/sh\n\
# Load .env file if it exists\n\
if [ -f /app/.env ]; then\n\
  set -a\n\
  . /app/.env\n\
  set +a\n\
fi\n\
\n\
# Start the application\n\
exec node server.js' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
