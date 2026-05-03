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
                    env.VERSION = "dev-${env.BUILD_NUMBER}"
                    env.IMAGE_TAG = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}".toLowerCase()

                    echo "Dev Version: ${env.VERSION}"
                    echo "Tag: ${env.IMAGE_TAG}"
                }
            }
        }

        stage('Build & Test') {
            steps {
                script {
                    echo "Branch ${env.BRANCH_NAME}: Building and verifying application..."

                    retry(3) {
                        bat """
                        set DOCKER_BUILDKIT=0
                        docker build -f docker/frontend.Dockerfile -t ${env.IMAGE_NAME}:${env.IMAGE_TAG} . || exit /b
                        echo Build completed successfully for ${env.BRANCH_NAME}
                        """
                    }
                }
            }
        }

        stage('Cleanup') {
            steps {
                script {
                    echo "Feature branch image preserved: ${env.IMAGE_NAME}:${env.IMAGE_TAG}"
                }
            }
        }   
    }

    post {
        success {
            echo "Feature Branch Pipeline SUCCESS for ${env.BRANCH_NAME}"
        }
        failure {
            echo "Feature Branch Pipeline FAILED for ${env.BRANCH_NAME}"
        }
    }
}