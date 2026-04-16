# Stage 1: Builder
FROM node:20-slim AS builder

WORKDIR /app

# Add build arguments for Vite environment variables
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_ML_SERVICE_URL
ARG VITE_LSTM_SERVICE_URL

# Set environment variables for the build process
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_ML_SERVICE_URL=$VITE_ML_SERVICE_URL
ENV VITE_LSTM_SERVICE_URL=$VITE_LSTM_SERVICE_URL

# Copy package manifest files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build tools like TypeScript)
RUN npm ci && npm cache clean --force

# Copy application code
COPY . .

# Build the frontend assets
RUN npm run build

# Prune dev dependencies for runtime stage
RUN npm prune --omit=dev

# Stage 2: Runtime (minimal image)
FROM node:20-slim

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/src ./src

# Expose the server port
EXPOSE 5000

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Start the application using tsx (TypeScript executor)
CMD ["npx", "tsx", "server.ts"]
