pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "intellmail-backend"
        DOCKER_TAG = "latest"
        CONTAINER_NAME = "intellmail-service"
    }

    stages {
        stage('Preflight') {
            steps {
                script {
                    echo "Validating Docker availability on Jenkins node..."
                    int dockerPathStatus = bat(returnStatus: true, script: '@echo off\r\nwhere docker')
                    if (dockerPathStatus != 0) {
                        error("Docker CLI is not available on this Jenkins agent. Install Docker Desktop/Engine and ensure 'docker' is in PATH for the Jenkins service account, then restart Jenkins.")
                    }

                    int dockerVersionStatus = bat(returnStatus: true, script: '@echo off\r\ndocker version --format "{{.Server.Version}}"')
                    if (dockerVersionStatus != 0) {
                        error("Docker CLI was found, but Docker daemon is not reachable. Start Docker and verify Jenkins can access it.")
                    }
                }
            }
        }

        stage('Cleanup') {
            steps {
                script {
                    echo "Cleaning up old containers..."
                    try {
                        bat "docker rm -f ${CONTAINER_NAME}"
                    } catch (Exception e) {
                        echo "No existing container to stop/remove."
                    }
                }
            }
        }

        stage('Build Image') {
            steps {
                dir('intellmail') {
                    echo "Building Docker image: ${DOCKER_IMAGE}..."
                    bat "docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} ."
                }
            }
        }

        stage('Deploy with Env') {
            steps {
                // Using the 'env-file' Secret File credential from Jenkins
                withCredentials([file(credentialsId: 'env-file', variable: 'ENV_FILE_PATH')]) {
                    echo "Deploying container using env file from credentials..."
                    bat "docker run -d --name ${CONTAINER_NAME} -p 7860:7860 --env-file %ENV_FILE_PATH% ${DOCKER_IMAGE}:${DOCKER_TAG}"
                }
            }
        }

        stage('Verify') {
            steps {
                echo "Verifying deployment..."
                bat "docker ps | findstr ${CONTAINER_NAME}"
                echo "Deployment successful! Service running at http://localhost:7860"
            }
        }
    }

    post {
        always {
            echo "Pipeline finished."
        }
        success {
            echo "IntelliMail Backend successfully deployed via Jenkins."
        }
        failure {
            echo "Pipeline failed. Check logs for details."
        }
    }
}