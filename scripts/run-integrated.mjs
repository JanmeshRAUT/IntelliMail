import { spawn, execSync } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const mlRoot = path.join(repoRoot, 'ml-model');

const localPythonExe = path.join(repoRoot, '.venv', 'Scripts', 'python.exe');
const pythonExe = fs.existsSync(localPythonExe) ? localPythonExe : 'python';
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];
let isShuttingDown = false;

if (process.env.INTEGRATED_STACK_ACTIVE === '1') {
  console.error('[bootstrap] Detected nested integrated launcher invocation. Exiting to prevent recursion.');
  process.exit(1);
}

function cleanupPorts() {
  const cmd = "$ports = 3000,5000,5001,24678; foreach ($p in $ports) { $ids = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($procId in $ids) { if ($procId -and $procId -ne 0) { try { Stop-Process -Id $procId -Force -ErrorAction Stop } catch {} } } }; Write-Output 'ports-cleaned'";
  try {
    const output = execSync(`powershell -NoProfile -Command "${cmd}"`, {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    process.stdout.write(`[bootstrap] ${output}`);
  } catch (error) {
    process.stderr.write('[bootstrap] port cleanup skipped or failed\n');
  }
}

function waitForPort(port, timeoutMs = 45000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);

      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });

      const onRetry = () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for port ${port}`));
          return;
        }
        setTimeout(tryConnect, 400);
      };

      socket.once('error', onRetry);
      socket.once('timeout', onRetry);
      socket.connect(port, '127.0.0.1');
    };

    tryConnect();
  });
}

function spawnManagedProcess(service) {
  const child = spawn(service.commandLine, {
    cwd: service.cwd,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      INTEGRATED_STACK_ACTIVE: '1',
    },
  });

  child.stdout.on('data', (data) => {
    process.stdout.write(`[${service.name}] ${data}`);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(`[${service.name}] ${data}`);
  });

  child.on('exit', (code, signal) => {
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    console.log(`[${service.name}] exited with ${reason}`);
    if (!isShuttingDown) {
      shutdown(code ?? 1);
    }
  });

  child.on('error', (error) => {
    console.error(`[${service.name}] failed to start: ${error.message}`);
    if (!isShuttingDown) {
      shutdown(1);
    }
  });

  children.push({ name: service.name, child });
  return child;
}

async function startAndWait(service) {
  const child = spawnManagedProcess(service);

  const exitedEarly = new Promise((_, reject) => {
    child.once('exit', (code) => {
      reject(new Error(`${service.name} exited before becoming ready (code ${code})`));
    });
    child.once('error', (err) => {
      reject(new Error(`${service.name} failed to spawn: ${err.message}`));
    });
  });

  await Promise.race([waitForPort(service.port), exitedEarly]);
  console.log(`[bootstrap] ${service.name} ready on port ${service.port}`);
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log('\nShutting down integrated services...');
  for (const { child } of children) {
    if (!child.killed) {
      try {
        child.kill();
      } catch {
        // Ignore individual shutdown errors.
      }
    }
  }

  setTimeout(() => process.exit(exitCode), 600);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('uncaughtException', (error) => {
  console.error('[bootstrap] uncaughtException:', error);
  shutdown(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[bootstrap] unhandledRejection:', reason);
  shutdown(1);
});

async function main() {
  console.log('Starting integrated stack: URL ML API (5000), LSTM API (5001), App (3000)');
  cleanupPorts();

  const services = [
    {
      name: 'ml-url-api',
      commandLine: `"${pythonExe}" api.py`,
      cwd: mlRoot,
      port: 5000,
    },
    {
      name: 'ml-lstm-api',
      commandLine: `"${pythonExe}" lstm_api.py`,
      cwd: mlRoot,
      port: 5001,
    },
    {
      name: 'app',
      commandLine: `${npmCmd} run dev:app`,
      cwd: repoRoot,
      port: 3000,
    },
  ];

  for (const service of services) {
    await startAndWait(service);
  }

  console.log('[bootstrap] all services are up');
}

main().catch((error) => {
  console.error(`[bootstrap] startup failed: ${error.message}`);
  shutdown(1);
});
