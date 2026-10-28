const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function generateIcon() {
  const buildDir = path.resolve(__dirname, '../build');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  const pngPath = path.join(buildDir, 'icon.png');
  const icoPath = path.join(buildDir, 'icon.ico');

  // Generate 256x256 PNG using PowerShell GDI+ drawing matching tClavis brand
  const psScript = `
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap(256, 256)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Background dark rounded tile
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 10, 15, 29))
$g.FillRectangle($bgBrush, 0, 0, 256, 256)

# Outer glow / border
$borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 56, 189, 248), 6)
$g.DrawRectangle($borderPen, 8, 8, 240, 240)

# Wi-Fi waves
$wavePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 56, 189, 248), 8)
$g.DrawArc($wavePen, 48, 40, 160, 160, 200, 140)
$g.DrawArc($wavePen, 72, 64, 112, 112, 200, 140)

# Center key hub
$hubBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 99, 102, 241))
$g.FillEllipse($hubBrush, 108, 96, 40, 40)

# Key stem (t)
$stemPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 56, 189, 248), 12)
$g.DrawLine($stemPen, 128, 126, 128, 210)
# Crossbar
$g.DrawLine($stemPen, 106, 155, 150, 155)
# Teeth
$teethPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 168, 85, 247), 10)
$g.DrawLine($teethPen, 128, 182, 155, 182)
$g.DrawLine($teethPen, 128, 202, 148, 202)

$bmp.Save('${pngPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
`;

  execSync(`powershell -NoProfile -Command "${psScript.replace(/\r?\n/g, '; ')}"`);

  // Convert PNG to valid Windows 256x256 ICO format
  const pngBuffer = fs.readFileSync(pngPath);
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type: 1 for Icon
  icoHeader.writeUInt16LE(1, 4); // Count: 1 image

  const icoEntry = Buffer.alloc(16);
  icoEntry.writeUInt8(0, 0); // 0 means 256px width
  icoEntry.writeUInt8(0, 1); // 0 means 256px height
  icoEntry.writeUInt8(0, 2); // Color count
  icoEntry.writeUInt8(0, 3); // Reserved
  icoEntry.writeUInt16LE(1, 4); // Color planes
  icoEntry.writeUInt16LE(32, 6); // Bits per pixel
  icoEntry.writeUInt32LE(pngBuffer.length, 8); // Image size in bytes
  icoEntry.writeUInt32LE(22, 12); // Image offset (6 + 16 = 22)

  const icoFile = Buffer.concat([icoHeader, icoEntry, pngBuffer]);
  fs.writeFileSync(icoPath, icoFile);

  console.log('✅ Generated build/icon.png and build/icon.ico successfully.');
}

if (require.main === module) {
  generateIcon();
}

module.exports = { generateIcon };
