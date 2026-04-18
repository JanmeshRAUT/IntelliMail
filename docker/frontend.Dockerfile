# Frontend Dockerfile
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN rm -rf node_modules package-lock.json && npm install --legacy-peer-deps && npm rebuild
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
