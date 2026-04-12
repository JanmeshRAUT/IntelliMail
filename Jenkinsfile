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
    DOCKER_EXE = 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe'
    CURL_IMAGE = 'curlimages/curl:8.8.0'
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
          bat '"%DOCKER_EXE%" --version'
          bat '"%DOCKER_EXE%" compose version'
          bat '"%DOCKER_EXE%" info >nul'
          bat '"%DOCKER_EXE%" compose -f "%COMPOSE_FILE%" config >nul'
        }
      }
    }

    stage('Deploy Stack') {
      steps {
        script {
          retry(2) {
            bat '"%DOCKER_EXE%" compose -f "%COMPOSE_FILE%" down --remove-orphans || exit /b 0'

            if (params.REBUILD_IMAGES) {
              bat '"%DOCKER_EXE%" compose -f "%COMPOSE_FILE%" up -d --build --remove-orphans'
            } else {
              bat '"%DOCKER_EXE%" compose -f "%COMPOSE_FILE%" up -d --remove-orphans'
            }
          }
        }
      }
    }

    stage('Wait for Services') {
      steps {
        bat '''
        echo Checking running containers...
        "%DOCKER_EXE%" compose ps
        '''
      }
    }

    stage('Smoke Tests') {
      when {
        expression { return params.RUN_SMOKE_TESTS }
      }
      steps {
        script {
          retry(12) {
            def status = bat(
              script: '"%DOCKER_EXE%" run --rm --network %COMPOSE_PROJECT_NAME%_default %CURL_IMAGE% -fsS http://app:3000/ >nul',
              returnStatus: true
            )

            if (status != 0) {
              echo "App not ready yet. Retrying in 5 seconds..."
              sleep(time: 5, unit: 'SECONDS')
              error("Retrying app smoke test")
            }
          }
        }
      }
    }

    stage('Compose Status') {
      steps {
        bat '"%DOCKER_EXE%" compose -f "%COMPOSE_FILE%" ps'
      }
    }

    stage('Optional Teardown') {
      when {
        expression { return params.TEARDOWN_AFTER_DEPLOY }
      }
      steps {
        bat '"%DOCKER_EXE%" compose -f "%COMPOSE_FILE%" down --remove-orphans'
      }
    }
  }

  post {
    failure {
      echo "Build failed! Showing logs..."
      bat '"%DOCKER_EXE%" compose -f "%COMPOSE_FILE%" logs --tail 200'
    }

    success {
      echo "Deployment successful 🚀"
    }

    always {
      cleanWs notFailBuild: true
    }
  }
}