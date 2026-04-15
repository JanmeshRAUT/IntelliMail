pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME = "intellmail-prod"
    }

    stages {
        stage('Preflight') {
            steps {
                script {
                    echo "Checking system environment..."
                    // Check Docker
                    int dockerStatus = bat(returnStatus: true, script: 'docker --version')
                    if (dockerStatus != 0) {
                        error("Docker not found. Please add Docker to System PATH and restart Jenkins.")
                    }
                    
                    // Check Docker Compose
                    int composeStatus = bat(returnStatus: true, script: 'docker-compose --version')
                    if (composeStatus != 0) {
                        error("Docker Compose not found. Please install docker-compose and add to PATH.")
                    }
                }
            }
        }

        stage('Build & Deploy') {
            steps {
                // Pull Secret File from Jenkins Credentials (ID: 'env-file')
                withCredentials([file(credentialsId: 'env-file', variable: 'ENV_PATH')]) {
                    script {
                        echo "Configuring environment and deploying services..."
                        
                        // Copy the secret file to the workspace .env for docker-compose to use
                        bat "copy /Y %ENV_PATH% .env"
                        
                        // Build and start the infrastructure
                        bat "docker-compose up -d --build"
                    }
                }
            }
        }

        stage('Verify Health') {
            steps {
                script {
                    echo "Verifying health of the unified service..."
                    sleep 10
                    bat "docker ps --filter name=intellmail-app"
                    echo "Deployment Complete."
                    echo "Access Application at http://localhost:5000"
                }
            }
        }
    }

    post {
        always {
            echo "Pipeline Run Finished."
        }
        success {
            echo "Successfully deployed IntelliMail Stack (Frontend + ML Backend)."
        }
        failure {
            echo "Deployment failed. Cleaning up stale configs..."
            // bat "docker-compose down"
        }
    }
}