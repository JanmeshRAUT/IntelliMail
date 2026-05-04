pipeline {
    agent any

    options {
        timestamps()
    }

    environment {
        IMAGE_NAME = "email-detection-3"
        DOCKER_CONTENT_TRUST = "0"
        // Build-time environment variables (with defaults)
        VITE_API_URL = "${env.VITE_API_URL ?: 'http://localhost:3000'}"
        VITE_GOOGLE_CLIENT_ID = "${env.VITE_GOOGLE_CLIENT_ID ?: ''}"
        VITE_ML_SERVICE_URL = "${env.VITE_ML_SERVICE_URL ?: 'https://JerryJR1705-intellmail.hf.space/'}"
        NODE_ENV = "${env.NODE_ENV ?: 'production'}"
        // Runtime environment variables (with defaults)
        DATABASEURL = "${env.DATABASEURL ?: ''}"
        HUGGINGFACE_API_KEY = "${env.HUGGINGFACE_API_KEY ?: ''}"
        ML_SERVICE_URL = "${env.ML_SERVICE_URL ?: ''}"
        PORT = "${env.PORT ?: '3000'}"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Set Version') {
            steps {
                script {
                    env.VERSION = "v1.0.${env.BUILD_NUMBER}"
                    env.IMAGE_TAG = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}".toLowerCase()

                    echo "Version: ${env.VERSION}"
                    echo "Tag: ${env.IMAGE_TAG}"
                    echo "API URL: ${env.VITE_API_URL}"
                    echo "Environment: ${env.NODE_ENV}"
                }
            }
        }

        stage('Build Docker Image (Main Only)') {
            when { branch 'main' }
            steps {
                script {
                    bat """
                    docker build ^
                    -f docker/frontend.Dockerfile ^
                    --build-arg VITE_API_URL=${env.VITE_API_URL} ^
                    --build-arg VITE_GOOGLE_CLIENT_ID=${env.VITE_GOOGLE_CLIENT_ID} ^
                    --build-arg VITE_ML_SERVICE_URL=${env.VITE_ML_SERVICE_URL} ^
                    --build-arg NODE_ENV=${env.NODE_ENV} ^
                    -t ${env.IMAGE_NAME}:${env.IMAGE_TAG} . || exit /b
                    docker tag ${env.IMAGE_NAME}:${env.IMAGE_TAG} ${env.IMAGE_NAME}:${env.VERSION} || exit /b
                    """
                }
            }
        }

        stage('Tag Latest (Main Only)') {
            when { branch 'main' }
            steps {
                bat "docker tag ${env.IMAGE_NAME}:${env.IMAGE_TAG} ${env.IMAGE_NAME}:latest || exit /b"
            }
        }

        stage('Deploy Docker (Main Only)') {
            when { branch 'main' }
            steps {
                script {
                    echo "Deploying version ${env.VERSION}..."

                    bat '''
                    docker rm -f email-detection-container >nul 2>&1 || echo Container not found
                    '''

                    // Build environment variable flags for docker run
                    bat """
                    docker run -d ^
                    --name email-detection-container ^
                    -p 5000:3000 ^
                    -e VITE_API_URL=${env.VITE_API_URL} ^
                    -e NODE_ENV=${env.NODE_ENV} ^
                    -e PORT=${env.PORT} ^
                    -e DATABASEURL=${env.DATABASEURL} ^
                    -e VITE_GOOGLE_CLIENT_ID=${env.VITE_GOOGLE_CLIENT_ID} ^
                    -e HUGGINGFACE_API_KEY=${env.HUGGINGFACE_API_KEY} ^
                    -e VITE_ML_SERVICE_URL=${env.VITE_ML_SERVICE_URL} ^
                    -e ML_SERVICE_URL=${env.ML_SERVICE_URL} ^
                    ${env.IMAGE_NAME}:${env.VERSION} || exit /b
                    """

                    echo "Deployed: ${env.IMAGE_NAME}:${env.VERSION}"
                    echo "Container running on port 5000 (mapped to 3000)"
                }
            }
        }

        stage('Build & Test (Feature Branch Only)') {
            when { not { branch 'main' } }
            steps {
                script {
                    echo "Branch ${env.BRANCH_NAME}: Building application in Docker..."

                    bat """
                    docker build ^
                    -f docker/frontend.Dockerfile ^
                    --build-arg VITE_API_URL=${env.VITE_API_URL} ^
                    --build-arg VITE_GOOGLE_CLIENT_ID=${env.VITE_GOOGLE_CLIENT_ID} ^
                    --build-arg VITE_ML_SERVICE_URL=${env.VITE_ML_SERVICE_URL} ^
                    --build-arg NODE_ENV=${env.NODE_ENV} ^
                    -t ${env.IMAGE_NAME}:${env.IMAGE_TAG} . || exit /b
                    echo Build completed successfully for feature branch
                    """
                }
            }
        }

        // ✅ SAFE CLEANUP (DELETION DISABLED TO PRESERVE IMAGES)
        stage('Cleanup (Log only)') {
            steps {
                script {
                    echo "Image deletion disabled. Image preserved: ${env.IMAGE_NAME}:${env.IMAGE_TAG}"
                }
            }
        }   
    }

    post {
        success {
            echo "Pipeline SUCCESS for ${env.BRANCH_NAME}"
        }
        failure {
            echo "Pipeline FAILED for ${env.BRANCH_NAME}"
        }
        always {
            echo "Pipeline finished for ${env.BRANCH_NAME}"
        }
    }
}