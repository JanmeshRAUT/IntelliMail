pipeline {
    agent any

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
                    // Version format
                    env.VERSION = "v1.0.${env.BUILD_NUMBER}"
                    env.IMAGE_TAG = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}".toLowerCase()

                    echo "Version: ${env.VERSION}"
                    echo "Tag: ${env.IMAGE_TAG}"
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    bat """
                    docker build -f docker/frontend.Dockerfile -t ${env.IMAGE_NAME}:${env.IMAGE_TAG} .
                    docker tag ${env.IMAGE_NAME}:${env.IMAGE_TAG} ${env.IMAGE_NAME}:${env.VERSION}
                    """
                }
            }
        }

        stage('Tag Latest (Main Only)') {
            when {
                branch 'main'
            }
            steps {
                script {
                    bat """
                    docker tag ${env.IMAGE_NAME}:${env.IMAGE_TAG} ${env.IMAGE_NAME}:latest
                    """
                }
            }
        }

        stage('Deploy (Main Only)') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "Deploying version ${env.VERSION}..."

                    bat '''
                    docker rm -f email-detection-container >nul 2>&1 || exit 0
                    '''

                    bat """
                    docker run -d ^
                    --name email-detection-container ^
                    -p 5000:5000 ^
                    ${env.IMAGE_NAME}:${env.VERSION}
                    """

                    echo "Deployed: ${env.IMAGE_NAME}:${env.VERSION}"
                }
            }
        }

        stage('Non-Main Branch Info') {
            when { 
                not {
                    branch 'main'
                }
            }
            steps {
                echo "Branch ${env.BRANCH_NAME} built successfully. No deployment."
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