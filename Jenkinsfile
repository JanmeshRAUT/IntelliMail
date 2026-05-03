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
                        set PROM_PORT=9091
                        set PORT=3000
                        docker-compose -p intellimail-main down --remove-orphans
                        docker-compose -p intellimail-main up -d --build --scale grafana=0 --remove-orphans
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
    }
}