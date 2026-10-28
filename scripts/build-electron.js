const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

async function buildElectron() {
  const isDev = process.env.NODE_ENV === 'development';

  // Ensure output directories exist
  const mainOutDir = path.resolve(__dirname, '../dist-electron/main');
  const preloadOutDir = path.resolve(__dirname, '../dist-electron/preload');
  fs.mkdirSync(mainOutDir, { recursive: true });
  fs.mkdirSync(preloadOutDir, { recursive: true });

  // Main process
  await esbuild.build({
    entryPoints: [path.resolve(__dirname, '../src/main/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: path.join(mainOutDir, 'index.js'),
    external: ['electron', 'sql.js'],
    sourcemap: isDev,
    minify: !isDev,
  });

  // Preload script
  await esbuild.build({
    entryPoints: [path.resolve(__dirname, '../src/preload/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: path.join(preloadOutDir, 'index.js'),
    external: ['electron'],
    sourcemap: isDev,
    minify: !isDev,
  });

  // Copy sql-wasm.wasm to dist-electron/main
  const wasmSrc = path.resolve(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm');
  const wasmDest = path.join(mainOutDir, 'sql-wasm.wasm');
  if (fs.existsSync(wasmSrc)) {
    fs.copyFileSync(wasmSrc, wasmDest);
  }

  // Copy icon assets to dist-electron/main/assets
  const assetsDir = path.join(mainOutDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  ['icon.png', 'icon.ico', 'tray-icon.png'].forEach((file) => {
    const src = path.resolve(__dirname, '../build', file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(assetsDir, file));
    }
  });

  console.log('⚡ [tClavis] Electron main and preload built successfully (with bundled assets).');
}

if (require.main === module) {
  buildElectron().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { buildElectron };
