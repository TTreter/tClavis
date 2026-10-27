const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const { buildElectron } = require('./build-electron');

process.env.NODE_ENV = 'development';

function waitForServer(url, timeoutMs = 20000) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error(`Timeout waiting for ${url}`));
        } else {
          setTimeout(check, 300);
        }
      });
    };
    check();
  });
}

async function startDev() {
  console.log('🚀 [tClavis] Starting development environment...');

  // 1. Start Vite dev server
  const isWindows = process.platform === 'win32';
  const npxCmd = isWindows ? 'npx.cmd' : 'npx';

  const vite = spawn(npxCmd, ['vite'], {
    stdio: 'inherit',
    shell: true,
  });

  // 2. Build Electron main & preload
  await buildElectron();

  // 3. Wait for Vite server at 5173
  console.log('⏳ [tClavis] Waiting for Vite dev server...');
  await waitForServer('http://localhost:5173');
  console.log('✅ [tClavis] Vite dev server is ready.');

  // 4. Start Electron
  const electronPkg = require('electron');
  const electronProcess = spawn(electronPkg, ['.'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  });

  electronProcess.on('close', () => {
    vite.kill();
    process.exit();
  });

  vite.on('close', () => {
    electronProcess.kill();
    process.exit();
  });
}

startDev().catch((err) => {
  console.error('❌ Error starting dev:', err);
  process.exit(1);
});
