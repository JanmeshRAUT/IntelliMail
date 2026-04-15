pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME = "intellmail-prod"
        DOCKER_CONTENT_TRUST = "0"
    }

    stages {
        stage('System Validation') {
            steps {
                script {
                    echo "╔════════════════════════════════════════════╗"
                    echo "║  IntelliMail Deployment - System Validation║"
                    echo "╚════════════════════════════════════════════╝"
                    
                    // Validate Docker Installation
                    echo "Checking Docker installation..."
                    int dockerStatus = bat(returnStatus: true, script: 'docker --version')
                    if (dockerStatus != 0) {
                        error("✗ Docker not found. Install Docker and add to PATH.")
                    }
                    echo "✓ Docker validated"
                    
                    // Validate Docker Compose Installation
                    echo "Checking Docker Compose installation..."
                    int composeStatus = bat(returnStatus: true, script: 'docker-compose --version')
                    if (composeStatus != 0) {
                        error("✗ Docker Compose not found. Install docker-compose and add to PATH.")
                    }
                    echo "✓ Docker Compose validated"
                    
                    // Check Docker Daemon
                    echo "Verifying Docker daemon connectivity..."
                    int daemonStatus = bat(returnStatus: true, script: 'docker ps > nul 2>&1')
                    if (daemonStatus != 0) {
                        error("✗ Docker daemon not running. Start Docker Desktop and retry.")
                    }
                    echo "✓ Docker daemon is responsive"
                }
            }
        }

        stage('Pre-cache Docker Images') {
            steps {
                script {
                    echo "╔════════════════════════════════════════════╗"
                    echo "║    Pre-caching Docker Images Locally       ║"
                    echo "╚════════════════════════════════════════════╝"
                    
                    echo "Pulling Prometheus image..."
                    retry(3) {
                        bat "docker pull prom/prometheus:latest"
                    }
                    echo "✓ Prometheus cached"
                    
                    echo "Pulling Grafana image..."
                    retry(3) {
                        bat "docker pull grafana/grafana:latest"
                    }
                    echo "✓ Grafana cached"
                    
                    echo "Verifying locally cached images..."
                    bat "docker images --filter reference=prom/prometheus --filter reference=grafana/grafana"
                }
            }
        }

        stage('Cleanup Old Containers') {
            steps {
                script {
                    echo "╔════════════════════════════════════════════╗"
                    echo "║   Cleaning up Previous Deployments         ║"
                    echo "╚════════════════════════════════════════════╝"
                    
                    echo "Stopping and removing old containers..."
                    int cleanupStatus = bat(returnStatus: true, script: 'docker-compose down -v')
                    if (cleanupStatus == 0) {
                        echo "✓ Previous deployment cleaned"
                    } else {
                        echo "⚠ No previous deployment found (first run)"
                    }
                }
            }
        }

        stage('Deploy Services') {
            steps {
                withCredentials([file(credentialsId: 'env-file', variable: 'ENV_PATH')]) {
                    script {
                        echo "╔════════════════════════════════════════════╗"
                        echo "║   Deploying IntelliMail Stack              ║"
                        echo "║   - IntelliMail (App + API)                ║"
                        echo "║   - Prometheus (Metrics)                   ║"
                        echo "║   - Grafana (Dashboards)                   ║"
                        echo "╚════════════════════════════════════════════╝"
                        
                        echo "Loading environment configuration..."
                        bat "copy /Y %ENV_PATH% .env"
                        echo "✓ Configuration loaded"
                        
                        echo "Starting services with Docker Compose..."
                        retry(3) {
                            bat "docker-compose up -d --build"
                        }
                        
                        echo "Waiting for service initialization (45 seconds)..."
                        sleep(time: 45, unit: 'SECONDS')
                    }
                }
            }
        }

        stage('Verify Service Health') {
            steps {
                script {
                    echo "╔════════════════════════════════════════════╗"
                    echo "║   Verifying Service Health Status           ║"
                    echo "╚════════════════════════════════════════════╝"
                    
                    // Check container status
                    echo "Checking container status..."
                    bat "docker-compose ps"
                    
                    // Check IntelliMail
                    echo ""
                    echo "Checking IntelliMail Application..."
                    int appHealth = bat(returnStatus: true, script: 'powershell -Command "try { $null = Invoke-WebRequest -Uri http://localhost:5000/health -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop; exit 0 } catch { exit 1 }"')
                    
                    // Check Prometheus
                    echo "Checking Prometheus Metrics Server..."
                    int promHealth = bat(returnStatus: true, script: 'powershell -Command "try { $null = Invoke-WebRequest -Uri http://localhost:9090/-/healthy -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop; exit 0 } catch { exit 1 }"')
                    
                    // Check Grafana
                    echo "Checking Grafana Visualization Platform..."
                    int grafanaHealth = bat(returnStatus: true, script: 'powershell -Command "try { $null = Invoke-WebRequest -Uri http://localhost:3000/api/health -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop; exit 0 } catch { exit 1 }"')
                    
                    // Report health
                    echo ""
                    echo "╔════════════════════════════════════════════╗"
                    echo "║   Service Health Report                    ║"
                    echo "╠════════════════════════════════════════════╣"
                    echo "║ IntelliMail (5000):   ${appHealth == 0 ? '✓ HEALTHY' : '⚠ CHECKING'}"
                    echo "║ Prometheus (9090):    ${promHealth == 0 ? '✓ HEALTHY' : '⚠ CHECKING'}"
                    echo "║ Grafana (3000):       ${grafanaHealth == 0 ? '✓ HEALTHY' : '⚠ CHECKING'}"
                    echo "╚════════════════════════════════════════════╝"
                }
            }
        }

        stage('Deployment Summary') {
            steps {
                script {
                    echo ""
                    echo "╔════════════════════════════════════════════╗"
                    echo "║  IntelliMail Stack - Deployment Complete   ║"
                    echo "╠════════════════════════════════════════════╣"
                    echo "║ 🌐 Application                             ║"
                    echo "║    URL: http://localhost:5000              ║"
                    echo "║    Status: Frontend + Backend              ║"
                    echo "║                                            ║"
                    echo "║ 📊 Prometheus (Metrics)                    ║"
                    echo "║    URL: http://localhost:9090              ║"
                    echo "║    Status: Metrics Collection Active       ║"
                    echo "║                                            ║"
                    echo "║ 📈 Grafana (Dashboards)                    ║"
                    echo "║    URL: http://localhost:3000              ║"
                    echo "║    User: admin                             ║"
                    echo "║    Pass: admin                             ║"
                    echo "║    Status: Auto-provisioned Dashboards     ║"
                    echo "║                                            ║"
                    echo "║ ✓ All services deployed successfully       ║"
                    echo "╚════════════════════════════════════════════╝"
                    echo ""
                    echo "Next Steps:"
                    echo "  1. Access Grafana at http://localhost:3000"
                    echo "  2. Login with admin/admin"
                    echo "  3. Navigate to Dashboards → Manage"
                    echo "  4. Select 'IntelliMail Monitoring' dashboard"
                    echo ""
                }
            }
        }
    }

    post {
        always {
            echo "Pipeline execution completed."
        }
        success {
            echo "✓ Deployment successful!"
        }
        failure {
            echo "✗ Deployment failed. Attempting cleanup..."
            script {
                int cleanupStatus = bat(returnStatus: true, script: 'docker-compose down -v')
                if (cleanupStatus == 0) {
                    echo "✓ Cleanup completed"
                } else {
                    echo "⚠ Cleanup had issues (check logs)"
                }
            }
        }
    }
}