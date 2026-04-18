pipeline {
    agent any

    options {
        timestamps()
    }

    environment {
        IMAGE_NAME = "email-detection"
        DOCKER_CONTENT_TRUST = "0"
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
                }
            }
        }

        stage('Build Docker Image (Main Only)') {
            when { branch 'main' }
            steps {
                script {
                    bat """
                    docker build -f docker/frontend.Dockerfile -t ${env.IMAGE_NAME}:${env.IMAGE_TAG} . || exit /b
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

                    bat """
                    docker run -d ^
                    --name email-detection-container ^
                    -p 5000:5000 ^
                    ${env.IMAGE_NAME}:${env.VERSION} || exit /b
                    """

                    echo "Deployed: ${env.IMAGE_NAME}:${env.VERSION}"
                }
            }
        }

        stage('Build & Test (Feature Branch Only)') {
            when { not { branch 'main' } }
            steps {
                script {
                    echo "Branch ${env.BRANCH_NAME}: Building application in Docker..."

                    bat """
                    docker build -f docker/frontend.Dockerfile -t ${env.IMAGE_NAME}:${env.IMAGE_TAG} . || exit /b
                    echo Build completed successfully for feature branch
                    """
                }
            }
        }

        stage('Cleanup') {
            steps {
                bat 'docker system prune -f'
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