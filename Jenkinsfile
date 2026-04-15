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
                        
                        // Build and start the infrastructure with retry logic
                        echo "Building and starting Docker containers (with automatic retry)..."
                        retry(3) {
                            bat "docker-compose up -d --build"
                        }
                        
                        // Wait for services to stabilize (30 seconds)
                        echo "Waiting for services to stabilize..."
                        sleep(time: 30, unit: 'SECONDS')
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
                    sleep(time: 15, unit: 'SECONDS')
                    
                    echo "Checking running containers..."
                    bat "docker ps --filter name=intellmail"
                    
                    echo ""
                    echo "Checking service availability..."
                    
                    // Check Application Health (port 5000)
                    int appHealth = bat(returnStatus: true, script: 'powershell -Command "try { $null = Invoke-WebRequest -Uri http://localhost:5000/health -TimeoutSec 5 -ErrorAction Stop; exit 0 } catch { exit 1 }"')
                    
                    // Check Prometheus (port 9090)
                    int promHealth = bat(returnStatus: true, script: 'powershell -Command "try { $null = Invoke-WebRequest -Uri http://localhost:9090/-/healthy -TimeoutSec 5 -ErrorAction Stop; exit 0 } catch { exit 1 }"')
                    
                    // Check Grafana (port 3000)
                    int grafanaHealth = bat(returnStatus: true, script: 'powershell -Command "try { $null = Invoke-WebRequest -Uri http://localhost:3000/api/health -TimeoutSec 5 -ErrorAction Stop; exit 0 } catch { exit 1 }"')
                    
                    echo ""
                    echo "==========================================="
                    echo "IntelliMail Stack DEPLOYMENT REPORT"
                    echo "==========================================="
                    echo "Application (5000):  ${appHealth == 0 ? '✓ HEALTHY' : '✗ CHECKING'}"
                    echo "Prometheus (9090):   ${promHealth == 0 ? '✓ HEALTHY' : '✗ CHECKING'}"
                    echo "Grafana (3000):      ${grafanaHealth == 0 ? '✓ HEALTHY' : '✗ CHECKING'}"
                    echo "==========================================="
                    echo ""
                    echo "Access the services at:"
                    echo "  🌐 Application:  http://localhost:5000"
                    echo "  📊 Prometheus:   http://localhost:9090"
                    echo "  📈 Grafana:      http://localhost:3000 (user: admin | pass: admin)"
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
            echo "✓ Successfully deployed IntelliMail Stack (Frontend + ML Backend + Monitoring)."
        }
        failure {
            echo "✗ Deployment failed. Attempting cleanup..."
            script {
                int cleanupStatus = bat(returnStatus: true, script: 'docker-compose down -v')
                if (cleanupStatus == 0) {
                    echo "✓ Cleanup completed successfully."
                } else {
                    echo "⚠ Cleanup encountered issues (non-critical)."
                }
            }
        }
    }
}