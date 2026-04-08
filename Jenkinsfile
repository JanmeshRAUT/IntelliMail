pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  parameters {
    string(name: 'APP_URL', defaultValue: '', description: 'Public app URL injected into docker compose env')
    string(name: 'ENV_FILE_CREDENTIALS_ID', defaultValue: 'env-files', description: 'Jenkins file credential ID for .env (leave empty to auto-generate minimal .env)')
    booleanParam(name: 'REBUILD_IMAGES', defaultValue: true, description: 'Rebuild images before starting containers')
    booleanParam(name: 'RUN_SMOKE_TESTS', defaultValue: true, description: 'Run post-deploy smoke checks')
    booleanParam(name: 'TEARDOWN_AFTER_DEPLOY', defaultValue: false, description: 'Stop and remove containers after successful verification')
  }

  environment {
    CI = 'true'
    COMPOSE_FILE = 'docker-compose.yml'
    COMPOSE_PROJECT_NAME = 'intellimail'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Prepare Environment File') {
      steps {
        script {
          def credentialId = (params.ENV_FILE_CREDENTIALS_ID ?: '').trim()

          if (credentialId) {
            withCredentials([file(credentialsId: credentialId, variable: 'ENV_FILE')]) {
              if (isUnix()) {
                sh 'cp "$ENV_FILE" .env'
              } else {
                bat 'copy /Y "%ENV_FILE%" .env'
              }
            }
          } else {
            if (isUnix()) {
              sh '''
                cat > .env <<EOF
APP_URL=${APP_URL}
EOF
              '''
            } else {
              bat '''
                > .env echo APP_URL=%APP_URL%
              '''
            }
          }
        }
      }
    }

    stage('Validate Docker Tooling') {
      steps {
        script {
          if (isUnix()) {
            sh '''
              docker --version
              docker compose version
            '''
          } else {
            bat '''
              docker --version
              docker compose version
            '''
          }
        }
      }
    }

    stage('Deploy With Docker Compose') {
      steps {
        script {
          if (isUnix()) {
            if (params.REBUILD_IMAGES) {
              sh 'APP_URL="${APP_URL}" docker compose -f "${COMPOSE_FILE}" up -d --build --remove-orphans'
            } else {
              sh 'APP_URL="${APP_URL}" docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans'
            }
          } else {
            if (params.REBUILD_IMAGES) {
              bat 'set "APP_URL=%APP_URL%" && docker compose -f "%COMPOSE_FILE%" up -d --build --remove-orphans'
            } else {
              bat 'set "APP_URL=%APP_URL%" && docker compose -f "%COMPOSE_FILE%" up -d --remove-orphans'
            }
          }
        }
      }
    }

    stage('Smoke Test Deployment') {
      when {
        expression { return params.RUN_SMOKE_TESTS }
      }
      steps {
        script {
          if (isUnix()) {
            sh '''
              set -e
              for i in $(seq 1 30); do
                if curl -fsS http://127.0.0.1:3000/health >/dev/null; then
                  break
                fi
                sleep 2
              done

              curl -fsS http://127.0.0.1:3000/health
              curl -fsS -X POST http://127.0.0.1:5000/predict-url \
                -H "Content-Type: application/json" \
                -d '{"url":"https://example.com"}'
            '''
          } else {
            bat '''
              powershell -NoProfile -Command "$ErrorActionPreference = 'Stop'; for ($i=0; $i -lt 30; $i++) { try { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000/health | Out-Null; break } catch { Start-Sleep -Seconds 2 } }; Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000/health | Out-Null; Invoke-WebRequest -UseBasicParsing -Method Post -Uri http://127.0.0.1:5000/predict-url -ContentType 'application/json' -Body '{\"url\":\"https://example.com\"}' | Out-Null"
            '''
          }
        }
      }
    }

    stage('Compose Status') {
      steps {
        script {
          if (isUnix()) {
            sh 'docker compose -f "${COMPOSE_FILE}" ps'
          } else {
            bat 'docker compose -f "%COMPOSE_FILE%" ps'
          }
        }
      }
    }

    stage('Teardown') {
      when {
        expression { return params.TEARDOWN_AFTER_DEPLOY }
      }
      steps {
        script {
          if (isUnix()) {
            sh 'docker compose -f "${COMPOSE_FILE}" down --remove-orphans'
          } else {
            bat 'docker compose -f "%COMPOSE_FILE%" down --remove-orphans'
          }
        }
      }
    }
  }

  post {
    failure {
      script {
        if (isUnix()) {
          sh 'docker compose -f "${COMPOSE_FILE}" logs --tail 200 || true'
        } else {
          bat 'docker compose -f "%COMPOSE_FILE%" logs --tail 200'
        }
      }
    }
  }
}