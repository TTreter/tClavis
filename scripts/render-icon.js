const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: {
      offscreen: true,
    },
  });

  const svgPath = path.resolve(__dirname, '../public/tclavis-icon.svg');
  await win.loadFile(svgPath);
  await new Promise((r) => setTimeout(r, 400));

  // Capture full resolution 512x512 image
  const nativeImg = await win.capturePage({ x: 0, y: 0, width: 512, height: 512 });
  const png512 = nativeImg.toPNG();

  const buildDir = path.resolve(__dirname, '../build');
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

  const pngPath = path.join(buildDir, 'icon.png');
  fs.writeFileSync(pngPath, png512);

  // Also write 256x256 for the ICO entry
  const img256 = nativeImg.resize({ width: 256, height: 256 });
  const png256 = img256.toPNG();

  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type 1: Icon
  icoHeader.writeUInt16LE(1, 4); // Count 1

  const icoEntry = Buffer.alloc(16);
  icoEntry.writeUInt8(0, 0); // 0 = 256px
  icoEntry.writeUInt8(0, 1); // 0 = 256px
  icoEntry.writeUInt8(0, 2); // Color palette
  icoEntry.writeUInt8(0, 3); // Reserved
  icoEntry.writeUInt16LE(1, 4); // Color planes
  icoEntry.writeUInt16LE(32, 6); // Bits per pixel
  icoEntry.writeUInt32LE(png256.length, 8); // Size
  icoEntry.writeUInt32LE(22, 12); // Offset

  const icoPath = path.join(buildDir, 'icon.ico');
  fs.writeFileSync(icoPath, Buffer.concat([icoHeader, icoEntry, png256]));

  // Now render high-contrast transparent Tray Icon (tray-icon.png)
  const traySvgPath = path.resolve(__dirname, '../public/tclavis-tray.svg');
  await win.loadFile(traySvgPath);
  await new Promise((r) => setTimeout(r, 400));
  const trayNativeImg = await win.capturePage({ x: 0, y: 0, width: 512, height: 512 });
  const tray32 = trayNativeImg.resize({ width: 32, height: 32, quality: 'best' });
  const trayPath = path.join(buildDir, 'tray-icon.png');
  fs.writeFileSync(trayPath, tray32.toPNG());

  console.log('✨ [tClavis] Crystal clear icon.png (512x512), icon.ico, and high-contrast tray-icon.png (32x32) rendered directly from SVG!');
  app.quit();
});
