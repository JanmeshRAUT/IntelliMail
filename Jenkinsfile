pipeline {
  agent any

  tools {
    nodejs "node18"
  }

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  parameters {
    booleanParam(name: 'RUN_INTEGRATED_STACK_CHECK', defaultValue: false, description: 'Start npm run dev and verify app + ML APIs health endpoints')
  }

  environment {
    CI = 'true'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Dependencies') {
      steps {
        script {
          if (isUnix()) {
            sh 'npm ci || npm install'
          } else {
            bat 'call npm ci || call npm install'
          }
        }
      }
    }

    stage('Type Check') {
      steps {
        script {
          if (isUnix()) {
            sh 'npm run lint'
          } else {
            bat 'call npm run lint'
          }
        }
      }
    }

    stage('Build') {
      steps {
        script {
          if (isUnix()) {
            sh 'npm run build'
          } else {
            bat 'call npm run build'
          }
        }
      }
    }

    stage('Prepare ML Python Environment') {
      when {
        expression { return params.RUN_INTEGRATED_STACK_CHECK }
      }
      steps {
        script {
          if (isUnix()) {
            sh '''
              cd ml-model
              python3 -m venv .venv
              . .venv/bin/activate
              python -m pip install --upgrade pip
              pip install -r requirements.txt
            '''
          } else {
            bat '''
              cd ml-model
              py -3 -m venv .venv
              call .venv\Scripts\activate
              python -m pip install --upgrade pip
              pip install -r requirements.txt
            '''
          }
        }
      }
    }

    stage('Integrated Stack Check') {
      when {
        expression { return params.RUN_INTEGRATED_STACK_CHECK }
      }
      steps {
        script {
          if (isUnix()) {
            sh '''
              # Cleanup stale listeners on known service ports.
              for port in 3000 5000 5001 24678; do
                if command -v lsof >/dev/null 2>&1; then
                  pids=$(lsof -ti tcp:$port || true)
                  if [ -n "$pids" ]; then
                    kill -9 $pids || true
                  fi
                fi
              done

              npm run dev > integrated-dev.log 2>&1 &
              DEV_PID=$!

              cleanup() {
                kill $DEV_PID 2>/dev/null || true
                pkill -f "run-integrated.mjs" || true
                pkill -f "python" || true
              }
              trap cleanup EXIT

              # Give services time to boot before probing.
              sleep 5

              for i in $(seq 1 120); do
                if curl -fsS http://127.0.0.1:3000/health >/dev/null \
                  && curl -fsS http://127.0.0.1:5000/health >/dev/null \
                  && curl -fsS http://127.0.0.1:5001/health >/dev/null; then
                  echo "Integrated stack is healthy"
                  exit 0
                fi
                sleep 2
              done

              echo "Integrated stack failed health check"
              tail -n 200 integrated-dev.log || true
              exit 1
            '''
          } else {
            bat '''
              powershell -NoProfile -Command "$ErrorActionPreference = 'Stop'; $log='integrated-dev.log'; foreach ($port in 3000,5000,5001,24678) { $pids = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($pid in $pids) { if ($pid -and $pid -ne 0) { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } } }; if (Test-Path $log) { Remove-Item $log -Force }; $p = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run dev' -RedirectStandardOutput $log -RedirectStandardError $log -PassThru; try { Start-Sleep -Seconds 5; $ok=$false; for ($i=0; $i -lt 120; $i++) { try { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000/health | Out-Null; Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5000/health | Out-Null; Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5001/health | Out-Null; $ok=$true; break } catch {}; Start-Sleep -Seconds 2 }; if (-not $ok) { if (Test-Path $log) { Get-Content $log -Tail 200 }; throw 'Integrated stack failed health check' } else { Write-Output 'Integrated stack is healthy' } } finally { if (-not $p.HasExited) { cmd /c taskkill /PID $($p.Id) /T /F >nul 2>&1 }; foreach ($port in 3000,5000,5001,24678) { $pids = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($pid in $pids) { if ($pid -and $pid -ne 0) { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } } } }"
            '''
          }
        }
      }
    }

    stage('Archive Frontend Build') {
      steps {
        archiveArtifacts artifacts: 'dist/**', fingerprint: true, onlyIfSuccessful: true
      }
    }

  }

  post {
    always {
      script {
        deleteDir()
      }
    }
  }
}