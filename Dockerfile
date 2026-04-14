# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for building
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Production Stage
FROM node:20-alpine

WORKDIR /app

# Install tsx globally or locally to run the server.ts
COPY package*.json ./
RUN npm install --production

# Copy built frontend assets
COPY --from=builder /app/dist ./dist
# Copy server source (it will run via tsx in production for simplicity in this setup)
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/src ./src

# Default environment variables
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start the server using npx tsx
CMD ["npx", "tsx", "server.ts"]
