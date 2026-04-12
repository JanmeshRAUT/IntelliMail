pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '10'))
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
    DOCKER = '"C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe"'
  }

  stages {

    stage('Checkout') {
      steps {
        retry(2) {
          checkout scm
        }
      }
    }

    stage('Load .env from Jenkins') {
      steps {
        withCredentials([file(credentialsId: 'env-files', variable: 'ENV_FILE')]) {
          bat '''
            echo Copying .env from Jenkins credentials...
            copy "%ENV_FILE%" .env
          '''
        }
      }
    }

    stage('Validate Docker') {
      steps {
        retry(2) {
          bat '%DOCKER% --version'
          bat '%DOCKER% compose version'
        }
      }
    }

    stage('Deploy Stack') {
      steps {
        script {
          retry(2) {
            bat '%DOCKER% compose -f "%COMPOSE_FILE%" down --remove-orphans || exit /b 0'

            if (params.REBUILD_IMAGES) {
              bat '%DOCKER% compose -f "%COMPOSE_FILE%" up -d --build --remove-orphans'
            } else {
              bat '%DOCKER% compose -f "%COMPOSE_FILE%" up -d --remove-orphans'
            }
          }
        }
      }
    }

    // 🔥 SMART WAIT (NO HARDCODED SLEEP)
    stage('Wait for Services (Health Check)') {
      steps {
        script {
          retry(10) {
            def status = bat(
              script: '''
              powershell -Command ^
              "try {
                $r1 = Invoke-WebRequest http://127.0.0.1:3000 -UseBasicParsing -TimeoutSec 5
                $r2 = Invoke-WebRequest http://127.0.0.1:5000 -UseBasicParsing -TimeoutSec 5
                if ($r1.StatusCode -eq 200 -and $r2.StatusCode -eq 200) { exit 0 }
                else { exit 1 }
              } catch { exit 1 }"
              ''',
              returnStatus: true
            )

            if (status != 0) {
              echo "Services not ready yet... retrying"
              sleep(time: 5, unit: 'SECONDS')
              error("Retrying...")
            }
          }
        }
      }
    }

    stage('Smoke Tests') {
      when {
        expression { return params.RUN_SMOKE_TESTS }
      }
      steps {
        retry(2) {
          bat '''
            powershell -Command ^
            "Invoke-WebRequest http://127.0.0.1:3000 -UseBasicParsing; ^
             Invoke-WebRequest http://127.0.0.1:5000 -UseBasicParsing"
          '''
        }
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
      echo "Build failed! Showing logs..."
      bat '%DOCKER% compose -f "%COMPOSE_FILE%" logs --tail 200'
    }

    success {
      echo "Deployment successful 🚀"
    }

    always {
      cleanWs notFailBuild: true
    }
  }
}