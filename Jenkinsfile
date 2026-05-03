pipeline {
    agent any

    options {
        timestamps()
    }

    environment {
        IMAGE_NAME = "email-detection-3"
        DOCKER_CONTENT_TRUST = "0"
    }

    stages {
        stage('Pre-Cleanup') {
            steps {
                script {
                    echo "Freeing up disk space before build..."
                    bat "docker container prune -f || echo prune failed"
                }
            }
        }

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Set Version') {
            steps {
                script {
                    env.VERSION = "v1.0.${env.BUILD_NUMBER}"
                    env.IMAGE_TAG = "main-${env.BUILD_NUMBER}".toLowerCase()

                    echo "Version: ${env.VERSION}"
                    echo "Tag: ${env.IMAGE_TAG}"
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    bat """
                    docker build -f docker/frontend.Dockerfile -t ${env.IMAGE_NAME}:${env.IMAGE_TAG} . || exit /b
                    docker tag ${env.IMAGE_NAME}:${env.IMAGE_TAG} ${env.IMAGE_NAME}:${env.VERSION} || exit /b
                    """
                }
            }
        }

        stage('Tag Latest') {
            steps {
                bat "docker tag ${env.IMAGE_NAME}:${env.IMAGE_TAG} ${env.IMAGE_NAME}:latest || exit /b"
            }
        }

        stage('Deploy Docker') {
            steps {
                script {
                    echo "Deploying version ${env.VERSION} on port 5000..."

                    withCredentials([file(credentialsId: 'env-file', variable: 'ENV_FILE')]) {
                        bat "copy /Y %ENV_FILE% .env"
                        
                        bat '''
                        set APP_PORT=5000
                        set MONGO_PORT=27017
                        set PROM_PORT=9090
                        set PORT=3000
                        
                        docker-compose -p intellimail-multibranch down --remove-orphans
                        ping 127.0.0.1 -n 6 > nul
                        set DOCKER_BUILDKIT=0
                        docker-compose -p intellimail-multibranch up -d --build --scale grafana=0 --remove-orphans
                        '''
                    }

                    echo "Deployed: ${env.IMAGE_NAME}:${env.VERSION} at http://localhost:5000"
                }
            }
        }

        stage('Cleanup') {
            steps {
                script {
                    echo "Image preserved: ${env.IMAGE_NAME}:${env.IMAGE_TAG}"
                }
            }
        }   
    }

    post {
        success {
            echo "Production Pipeline SUCCESS"
        }
        failure {
            echo "Production Pipeline FAILED"
        }
        always {
            script {
                echo "Cleaning up Docker resources to save space..."
                bat "docker image prune -f --filter \"until=24h\" || echo Cleanup failed"
                echo "Production Pipeline finished"
            }
        }
    }
}