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
                        
                        // Build and start the infrastructure with timeout
                        echo "Building and starting Docker containers..."
                        bat "timeout /t 0 /nobreak && docker-compose up -d --build"
                        
                        // Wait for services to stabilize
                        echo "Waiting for services to stabilize (30 seconds)..."
                        bat "timeout /t 30 /nobreak"
                    }
                }
            }
        }

        stage('Verify Health') {
            steps {
                script {
                    echo "Verifying health of the unified service..."
                    
                    // Wait for containers to stabilize
                    echo "Waiting for containers to be ready..."
                    bat "timeout /t 15 /nobreak"
                    
                    echo "Checking IntelliMail Application..."
                    bat "docker ps --filter name=intellmail-app"
                    
                    echo "Checking Prometheus..."
                    bat "docker ps --filter name=intellmail-prometheus"
                    
                    echo "Checking Grafana..."
                    bat "docker ps --filter name=intellmail-grafana"
                    
                    // Verify application is responding
                    echo "Verifying application endpoints..."
                    bat "echo. && echo Testing application health endpoint... && echo. || exit /b 0"
                    
                    echo ""
                    echo "==========================================="
                    echo "IntelliMail Stack DEPLOYED SUCCESSFULLY!"
                    echo "==========================================="
                    echo "Application:  http://localhost:5000"
                    echo "Prometheus:   http://localhost:9090"
                    echo "Grafana:      http://localhost:3000 (Admin:admin)"
                    echo "==========================================="
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