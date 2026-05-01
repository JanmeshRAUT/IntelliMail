pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds(abortPreviousBuilds: true)
    }

    environment {
        IMAGE_NAME = "email-detection-3"
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
                    echo "Deploying version ${env.VERSION} on port 5000..."

                    withCredentials([file(credentialsId: 'env-file', variable: 'ENV_FILE')]) {
                        bat "copy /Y %ENV_FILE% .env"
                        
                        // Use unique project name and set ports
                        // Scale grafana to 0 to disable it for Multibranch
                        bat '''
                        set APP_PORT=5000
                        set MONGO_PORT=27017
                        set PORT=3000
                        docker-compose -p intellimail-multibranch up -d --build --scale grafana=0 --remove-orphans
                        '''
                    }

                    echo "Deployed: ${env.IMAGE_NAME}:${env.VERSION} at http://localhost:5000"
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