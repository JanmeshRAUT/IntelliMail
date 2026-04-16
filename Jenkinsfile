pipeline {
agent any

```
environment {
    COMPOSE_PROJECT_NAME = "intellmail-prod"
    DOCKER_CONTENT_TRUST = "0"
}

stages {

    stage('System Validation') {
        steps {
            script {
                echo "Checking Docker..."
                bat 'docker --version'

                echo "Checking Docker Compose..."
                bat 'docker-compose --version'

                echo "Checking Docker Daemon..."
                bat 'docker ps > nul 2>&1'
            }
        }
    }

    stage('Pre-cache Images') {
        steps {
            script {
                echo "Pulling required images..."
                bat 'docker pull prom/prometheus:latest'
                bat 'docker pull grafana/grafana:latest'
            }
        }
    }

    stage('Cleanup') {
        steps {
            script {
                echo "Cleaning old deployment..."

                bat 'docker rm -f intellmail-app >nul 2>&1 || exit 0'
                bat 'docker-compose down -v --remove-orphans >nul 2>&1 || exit 0'
                bat 'docker container prune -f'
                bat 'docker network prune -f'

                echo "Cleanup completed"
            }
        }
    }

    stage('Deploy') {
        steps {
            withCredentials([file(credentialsId: 'env-file', variable: 'ENV_PATH')]) {
                script {
                    echo "Deploying application..."

                    bat 'copy /Y %ENV_PATH% .env'

                    bat '''
                    docker rm -f intellmail-app >nul 2>&1
                    docker-compose up -d --build --remove-orphans
                    '''

                    echo "Waiting for services..."
                    sleep(time: 30, unit: 'SECONDS')
                }
            }
        }
    }

    stage('Verify') {
        steps {
            script {
                echo "Checking running containers..."
                bat 'docker-compose ps'
            }
        }
    }

    stage('Summary') {
        steps {
            script {
                echo "Deployment Successful!"
                echo "App: http://localhost:5000"
                echo "Prometheus: http://localhost:9090"
                echo "Grafana: http://localhost:3000"
            }
        }
    }
}

post {
    always {
        echo "Pipeline finished."
    }
    success {
        echo "Deployment successful!"
    }
    failure {
        echo "Deployment failed. Cleaning..."
        bat 'docker-compose down -v'
    }
}
```

}
