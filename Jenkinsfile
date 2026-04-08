pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  parameters {
    string(name: 'APP_URL', defaultValue: '', description: 'App public URL')
    booleanParam(name: 'REBUILD_IMAGES', defaultValue: true, description: 'Rebuild Docker images')
    booleanParam(name: 'RUN_SMOKE_TESTS', defaultValue: true, description: 'Run tests')
    booleanParam(name: 'TEARDOWN_AFTER_DEPLOY', defaultValue: false, description: 'Stop after deploy')
  }

  environment {
    COMPOSE_FILE = 'docker-compose.yml'
    COMPOSE_PROJECT_NAME = 'intellimail'

    // 🔥 FORCE DOCKER PATH
    DOCKER = '"C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe"'
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Prepare .env') {
      steps {
        bat 'echo APP_URL=%APP_URL% > .env'
      }
    }

    stage('Validate Docker') {
      steps {
        bat '%DOCKER% --version'
        bat '%DOCKER% compose version'
      }
    }

    stage('Deploy Stack') {
      steps {
        script {
          if (params.REBUILD_IMAGES) {
            bat '%DOCKER% compose -f "%COMPOSE_FILE%" down --remove-orphans || exit /b 0'
            bat '%DOCKER% compose -f "%COMPOSE_FILE%" up -d --build --remove-orphans'
          } else {
            bat '%DOCKER% compose -f "%COMPOSE_FILE%" down --remove-orphans || exit /b 0'
            bat '%DOCKER% compose -f "%COMPOSE_FILE%" up -d --remove-orphans'
          }
        }
      }
    }

    stage('Wait') {
      steps {
        bat 'timeout /t 15 >nul'
      }
    }

    stage('Smoke Tests') {
      when {
        expression { return params.RUN_SMOKE_TESTS }
      }
      steps {
        bat '''
          powershell -Command ^
          "Invoke-WebRequest http://127.0.0.1:3000 -UseBasicParsing; ^
           Invoke-WebRequest http://127.0.0.1:5000 -UseBasicParsing"
        '''
      }
    }

    stage('Compose Status') {
      steps {
        bat '%DOCKER% compose -f "%COMPOSE_FILE%" ps'
      }
    }

    stage('Optional Teardown') {
      when {
        expression { return params.TEARDOWN_AFTER_DEPLOY }
      }
      steps {
        bat '%DOCKER% compose -f "%COMPOSE_FILE%" down --remove-orphans'
      }
    }
  }

  post {
    failure {
      bat '%DOCKER% compose -f "%COMPOSE_FILE%" logs --tail 200'
    }
    always {
      cleanWs notFailBuild: true
    }
  }
}