# Stage 1: Builder
FROM node:20-slim AS builder

WORKDIR /app

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

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["node", "server.ts"]

# Start the application
CMD ["npm", "start"]
