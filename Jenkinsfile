pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  parameters {
    string(name: 'APP_URL', defaultValue: '', description: 'App public URL injected into compose environment')
    booleanParam(name: 'REBUILD_IMAGES', defaultValue: true, description: 'Rebuild Docker images before deploy')
    booleanParam(name: 'RUN_SMOKE_TESTS', defaultValue: true, description: 'Run health and API smoke checks after deploy')
    booleanParam(name: 'TEARDOWN_AFTER_DEPLOY', defaultValue: false, description: 'Stop stack after successful deployment checks')
  }

  environment {
    COMPOSE_FILE = 'docker-compose.yml'
    COMPOSE_PROJECT_NAME = 'intellimail'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Prepare .env') {
      steps {
        bat '''
          > .env echo APP_URL=%APP_URL%
        '''
      }
    }

    stage('Validate Docker') {
      steps {
        bat '''
          docker --version
          docker compose version
        '''
      }
    }

    stage('Deploy Stack') {
      steps {
        script {
          if (params.REBUILD_IMAGES) {
            bat 'set "APP_URL=%APP_URL%" && docker compose -f "%COMPOSE_FILE%" down --remove-orphans || exit /b 0'
            bat 'set "APP_URL=%APP_URL%" && docker compose -f "%COMPOSE_FILE%" up -d --build --remove-orphans'
          } else {
            bat 'set "APP_URL=%APP_URL%" && docker compose -f "%COMPOSE_FILE%" down --remove-orphans || exit /b 0'
            bat 'set "APP_URL=%APP_URL%" && docker compose -f "%COMPOSE_FILE%" up -d --remove-orphans'
          }
        }
      }
    }

    stage('Smoke Tests') {
      when {
        expression { return params.RUN_SMOKE_TESTS }
      }
      steps {
        bat '''
          powershell -NoProfile -Command "$ErrorActionPreference = 'Stop'; for ($i=0; $i -lt 40; $i++) { try { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000/health | Out-Null; break } catch { Start-Sleep -Seconds 2 } }; Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000/health | Out-Null; Invoke-WebRequest -UseBasicParsing -Method Post -Uri http://127.0.0.1:5000/predict-url -ContentType 'application/json' -Body '{\"url\":\"https://example.com\"}' | Out-Null"
        '''
      }
    }

    stage('Compose Status') {
      steps {
        bat 'docker compose -f "%COMPOSE_FILE%" ps'
      }
    }

    stage('Optional Teardown') {
      when {
        expression { return params.TEARDOWN_AFTER_DEPLOY }
      }
      steps {
        bat 'docker compose -f "%COMPOSE_FILE%" down --remove-orphans'
      }
    }
  }

  post {
    failure {
      bat 'docker compose -f "%COMPOSE_FILE%" logs --tail 200'
    }
    always {
      cleanWs notFailBuild: true
    }
  }
}