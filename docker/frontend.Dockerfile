# ----------- BUILD STAGE -----------
FROM node:22-alpine AS builder

WORKDIR /app

ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

COPY package*.json ./
RUN npm install
# Fix for Rollup/Vite/LightningCSS issue on Alpine and missing git warning
RUN apk add --no-cache git && npm install @rollup/rollup-linux-x64-musl lightningcss-linux-x64-musl

COPY . .

RUN npm run build
RUN npm run build:server

# Prune devDependencies to reduce size before copying
RUN npm prune --omit=dev

# ----------- PRODUCTION STAGE -----------
FROM node:22-alpine

WORKDIR /app

# Copy built assets and production-only dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 3000

CMD ["node", "server.js"]
