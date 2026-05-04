# Environment Variables Setup Guide

This guide explains how to configure environment variables for the IntelliMail application with Docker and Jenkins.

## Overview

The updated Docker and Jenkins setup supports three ways to configure environment variables:

1. **Build-time variables** (via `--build-arg` in Docker)
2. **Runtime variables** (via `-e` flag in `docker run`)
3. **.env file** (mounted or copied into container)

## Build-Time Environment Variables

Build-time variables are used during the Docker build process and embedded in the image. These are typically used for frontend (Vite) variables.

### Supported Build Args

- `VITE_API_URL` - API endpoint (default: `http://localhost:3000`)
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth Client ID (default: empty)
- `VITE_ML_SERVICE_URL` - ML service URL (default: `https://JerryJR1705-intellmail.hf.space/`)
- `NODE_ENV` - Environment mode (default: `production`)

### Building with Custom Build Args

```bash
docker build \
  --build-arg VITE_API_URL=https://api.example.com \
  --build-arg VITE_GOOGLE_CLIENT_ID=your_client_id \
  --build-arg VITE_ML_SERVICE_URL=https://ml.example.com \
  --build-arg NODE_ENV=production \
  -f docker/frontend.Dockerfile \
  -t email-detection-3:latest \
  .
```

## Runtime Environment Variables

Runtime variables are passed to the container when it starts and can be changed without rebuilding the image.

### Supported Runtime Variables

- `VITE_API_URL` - API endpoint
- `PORT` - Server port (default: `3000`)
- `NODE_ENV` - Environment mode (default: `production`)
- `DATABASEURL` - MongoDB connection string
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth Client ID
- `HUGGINGFACE_API_KEY` - HuggingFace API key
- `VITE_ML_SERVICE_URL` - ML service URL
- `ML_SERVICE_URL` - ML service URL (backend)
- `LSTM_SERVICE_URL` - LSTM service URL
- `VITE_LSTM_SERVICE_URL` - LSTM service URL (frontend)

### Running Container with Environment Variables

```bash
docker run -d \
  --name email-detection-container \
  -p 5000:3000 \
  -e VITE_API_URL=https://api.example.com \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e DATABASEURL=mongodb+srv://user:pass@cluster.mongodb.net/db \
  -e VITE_GOOGLE_CLIENT_ID=your_client_id \
  -e HUGGINGFACE_API_KEY=your_key \
  email-detection-3:latest
```

## Using .env File

The Dockerfile includes an entrypoint script that automatically loads environment variables from a `.env` file if it exists in the container.

### Option 1: Copy .env During Build

Place a `.env` file in the project root before building:

```bash
# .env file
VITE_API_URL=https://api.example.com
DATABASEURL=mongodb+srv://user:pass@cluster.mongodb.net/db
PORT=3000
```

Then build and run normally:
```bash
docker build -f docker/frontend.Dockerfile -t email-detection-3:latest .
docker run -d -p 5000:3000 email-detection-3:latest
```

### Option 2: Mount .env at Runtime

```bash
docker run -d \
  --name email-detection-container \
  -p 5000:3000 \
  -v /path/to/.env:/app/.env:ro \
  email-detection-3:latest
```

### Option 3: Combine Build Args and Runtime Variables

```bash
docker build \
  --build-arg VITE_API_URL=https://api.example.com \
  -f docker/frontend.Dockerfile \
  -t email-detection-3:latest \
  .

docker run -d \
  --name email-detection-container \
  -p 5000:3000 \
  -e NODE_ENV=production \
  -e DATABASEURL=mongodb+srv://user:pass@cluster.mongodb.net/db \
  email-detection-3:latest
```

## Jenkins Pipeline Integration

The updated Jenkins pipeline (`Jenkinsfile`) automatically handles environment variables:

### Build Stage

The build stage passes build arguments to Docker:

```groovy
docker build \
  --build-arg VITE_API_URL=${env.VITE_API_URL} \
  --build-arg VITE_GOOGLE_CLIENT_ID=${env.VITE_GOOGLE_CLIENT_ID} \
  --build-arg VITE_ML_SERVICE_URL=${env.VITE_ML_SERVICE_URL} \
  --build-arg NODE_ENV=${env.NODE_ENV} \
  -f docker/frontend.Dockerfile \
  -t email-detection-3:latest .
```

### Deploy Stage

The deploy stage passes runtime environment variables:

```groovy
docker run -d \
  --name email-detection-container \
  -p 5000:3000 \
  -e VITE_API_URL=${env.VITE_API_URL} \
  -e NODE_ENV=${env.NODE_ENV} \
  -e PORT=${env.PORT} \
  -e DATABASEURL=${env.DATABASEURL} \
  -e VITE_GOOGLE_CLIENT_ID=${env.VITE_GOOGLE_CLIENT_ID} \
  -e HUGGINGFACE_API_KEY=${env.HUGGINGFACE_API_KEY} \
  -e VITE_ML_SERVICE_URL=${env.VITE_ML_SERVICE_URL} \
  -e ML_SERVICE_URL=${env.ML_SERVICE_URL} \
  email-detection-3:latest
```

### Setting Environment Variables in Jenkins

You can configure these variables in Jenkins in multiple ways:

#### 1. Via Jenkins UI
- Go to job configuration
- Add environment variables in the "Build Environment" section:
  ```
  VITE_API_URL=https://api.example.com
  DATABASEURL=mongodb+srv://user:pass@cluster.mongodb.net/db
  NODE_ENV=production
  ```

#### 2. Via Jenkins Credentials
- Store sensitive values (API keys, database URLs) as Jenkins credentials
- Reference them in the pipeline:
  ```groovy
  environment {
      DATABASEURL = credentials('mongodb-url')
      HUGGINGFACE_API_KEY = credentials('huggingface-key')
  }
  ```

#### 3. Via .env.jenkins File
- Create `.env.jenkins` file (not in version control)
- Load it in the Jenkinsfile:
  ```groovy
  stage('Load Environment') {
      steps {
          sh 'source .env.jenkins'
      }
  }
  ```

## Default Values

If no environment variables are provided, the system uses these defaults:

| Variable | Default |
|----------|---------|
| `VITE_API_URL` | `http://localhost:3000` |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |
| `VITE_ML_SERVICE_URL` | `https://JerryJR1705-intellmail.hf.space/` |
| `DATABASEURL` | (empty) |
| `VITE_GOOGLE_CLIENT_ID` | (empty) |
| `HUGGINGFACE_API_KEY` | (empty) |
| `ML_SERVICE_URL` | (empty) |

## Docker Compose Example

You can also use `docker-compose.yml` with environment variables:

```yaml
version: '3.8'

services:
  email-detection:
    build:
      context: .
      dockerfile: docker/frontend.Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL:-http://localhost:3000}
        VITE_GOOGLE_CLIENT_ID: ${VITE_GOOGLE_CLIENT_ID}
        VITE_ML_SERVICE_URL: ${VITE_ML_SERVICE_URL:-https://JerryJR1705-intellmail.hf.space/}
        NODE_ENV: ${NODE_ENV:-production}
    ports:
      - "5000:3000"
    environment:
      - VITE_API_URL=${VITE_API_URL:-http://localhost:3000}
      - NODE_ENV=${NODE_ENV:-production}
      - PORT=3000
      - DATABASEURL=${DATABASEURL}
      - VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
      - HUGGINGFACE_API_KEY=${HUGGINGFACE_API_KEY}
      - VITE_ML_SERVICE_URL=${VITE_ML_SERVICE_URL:-https://JerryJR1705-intellmail.hf.space/}
    env_file:
      - .env
```

Run with:
```bash
# Create .env file with your variables
cp .env.example .env
# Edit .env with your actual values
nano .env

# Start the container
docker-compose up -d
```

## Security Best Practices

1. **Never commit `.env` files** - The `.env` file is already in `.gitignore`
2. **Use `.env.example`** - Commit this as a template for required variables
3. **Store secrets in Jenkins Credentials** - Don't put API keys in pipeline code
4. **Use read-only mounts** - When mounting `.env` in docker: `-v /path/.env:/app/.env:ro`
5. **Validate environment variables** - The application should validate required variables at startup
6. **Rotate API keys** - Regularly rotate sensitive keys stored in Jenkins

## Troubleshooting

### Variables Not Being Applied

1. Check if `.env` file exists in container: `docker exec <container> cat /app/.env`
2. Verify environment variables are passed: `docker inspect <container> | grep -A 20 Env`
3. Check container logs: `docker logs <container>`

### Build Arguments Not Taking Effect

Ensure you're passing them during build:
```bash
docker build \
  --build-arg VITE_API_URL=your_value \
  -f docker/frontend.Dockerfile \
  -t image:tag .
```

### Port Already in Use

Change the mapped port:
```bash
docker run -p 5001:3000 email-detection-3:latest
```

## Next Steps

1. Set up Jenkins credentials for sensitive variables
2. Create `.env.example` with required variable names
3. Update deployment documentation for your team
4. Test with different environment configurations
