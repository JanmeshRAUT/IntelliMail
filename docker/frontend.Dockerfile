# Frontend Dockerfile
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps --force && npm cache clean --force
COPY . .
RUN npm run build

FROM node:18
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server.ts ./
RUN npm install --production
RUN npm install -g tsx
EXPOSE 3000
CMD ["tsx", "server.ts"]
