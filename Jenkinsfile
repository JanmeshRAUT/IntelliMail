pipeline {
  agent any

  environment {
    DOCKER = '"C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe"'
  }

  stages {

    stage('Checkout') {
      steps {
        git branch: 'main', url: 'https://github.com/JanmeshRAUT/IntelliMail.git/'
      }
    }

    stage('Debug') {
      steps {
        bat 'echo USING DOCKER PATH: %DOCKER%'
      }
    }

    stage('Check Docker') {
      steps {
        bat '%DOCKER% --version'
        bat '%DOCKER% compose version'
      }
    }

    stage('Stop Old Containers') {
      steps {
        bat '%DOCKER% compose down || exit /b 0'
      }
    }

    stage('Build Containers') {
      steps {
        bat '%DOCKER% compose build'
      }
    }

    stage('Start Containers') {
      steps {
        bat '%DOCKER% compose up -d'
      }
    }

    stage('Wait for Services') {
      steps {
        bat '''
          timeout /t 15 >nul
          powershell -Command "Invoke-WebRequest http://127.0.0.1:5000 -UseBasicParsing"
          powershell -Command "Invoke-WebRequest http://127.0.0.1:3000 -UseBasicParsing"
        '''
      }
    }
  }

  post {
    always {
      cleanWs notFailBuild: true
    }
  }
}