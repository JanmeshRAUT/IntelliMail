# Use Node.js as the base image
FROM node:20-slim

# Create app directory
WORKDIR /app

# Copy package manifest files
COPY package*.json ./

# Install all dependencies (including devDependencies for tsx)
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the frontend assets
RUN npm run build

# Expose the server port (aligned with .env and server.ts)
EXPOSE 5000

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Start the application (server.ts handles both API and Frontend serving)
CMD ["npm", "start"]
