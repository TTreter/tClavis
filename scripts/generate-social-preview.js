const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 640,
    show: false,
    frame: false,
    transparent: false,
    webPreferences: {
      offscreen: true,
    },
  });

  const iconSvgPath = path.resolve(__dirname, '../public/tclavis-icon.svg');
  let iconSvg = fs.readFileSync(iconSvgPath, 'utf8');

  // Enhanced Icon with brighter border and glow
  const enhancedIconSvg = iconSvg
    .replace('stroke-opacity="0.25"', 'stroke-opacity="0.6"')
    .replace('opacity="0.08"', 'opacity="0.18"');

  // ==========================================
  // TEMPLATE 1: REFINED REPO CARD (CENTERED)
  // ==========================================
  const htmlTemplate1 = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>tClavis Social Preview - Classic</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600;700&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      width: 1280px;
      height: 640px;
      overflow: hidden;
      background-color: #050811;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #f8fafc;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Background Geometric Network Grid */
    .bg-grid {
      position: absolute;
      inset: 0;
      background-image: 
        radial-gradient(circle at 1px 1px, rgba(56, 189, 248, 0.12) 1px, transparent 0),
        linear-gradient(to right, rgba(56, 189, 248, 0.035) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(56, 189, 248, 0.035) 1px, transparent 1px);
      background-size: 36px 36px, 36px 36px, 36px 36px;
      opacity: 0.85;
    }

    /* Ambient Glows */
    .glow-cyan {
      position: absolute;
      top: -100px;
      left: 50%;
      transform: translateX(-50%);
      width: 760px;
      height: 440px;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, rgba(14, 165, 233, 0.1) 45%, transparent 70%);
      filter: blur(50px);
      pointer-events: none;
    }

    .glow-purple {
      position: absolute;
      bottom: -120px;
      right: 60px;
      width: 580px;
      height: 380px;
      background: radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, rgba(99, 102, 241, 0.06) 50%, transparent 70%);
      filter: blur(55px);
      pointer-events: none;
    }

    .glow-indigo {
      position: absolute;
      bottom: -120px;
      left: 60px;
      width: 520px;
      height: 380px;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.16) 0%, transparent 65%);
      filter: blur(55px);
      pointer-events: none;
    }

    /* Safe Area Card Container (44px margins, well over 40pt safe border) */
    .card-container {
      position: relative;
      z-index: 10;
      width: 1192px;
      height: 556px;
      border-radius: 26px;
      background: linear-gradient(145deg, rgba(15, 23, 42, 0.82) 0%, rgba(9, 14, 26, 0.75) 100%);
      border: 1px solid rgba(56, 189, 248, 0.25);
      box-shadow: 
        0 25px 60px -15px rgba(0, 0, 0, 0.8),
        inset 0 1px 0 rgba(255, 255, 255, 0.15),
        inset 0 0 40px rgba(56, 189, 248, 0.03),
        0 0 50px -15px rgba(56, 189, 248, 0.18);
      padding: 30px 48px 24px 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
    }

    /* Top Metadata Bar */
    .top-bar {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .top-pill {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      padding: 6px 16px;
      border-radius: 9999px;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(56, 189, 248, 0.3);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #7dd3fc;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .top-pill .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 10px #38bdf8;
    }

    .top-pill.alt {
      border-color: rgba(168, 85, 247, 0.35);
      color: #d8b4fe;
    }

    .top-pill.alt .dot {
      background: #c084fc;
      box-shadow: 0 0 10px #c084fc;
    }

    /* Main Center Hero Area */
    .hero-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 14px;
      margin-top: -4px;
    }

    .icon-halo {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon-halo::before {
      content: '';
      position: absolute;
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, rgba(99, 102, 241, 0.15) 50%, transparent 70%);
      filter: blur(16px);
      z-index: 0;
    }

    .icon-wrapper {
      position: relative;
      z-index: 1;
      width: 112px;
      height: 112px;
      border-radius: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 16px 36px -6px rgba(0, 0, 0, 0.6);
    }

    .icon-wrapper svg {
      width: 112px;
      height: 112px;
      filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.5));
    }

    .title-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
    }

    .brand-title {
      font-size: 56px;
      font-weight: 900;
      letter-spacing: -0.5px;
      line-height: 1.05;
      background: linear-gradient(180deg, #ffffff 20%, #f1f5f9 65%, #93c5fd 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 4px 20px rgba(56, 189, 248, 0.2);
    }

    .brand-subtitle {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.3px;
      color: #38bdf8;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .brand-desc {
      font-size: 15.5px;
      font-weight: 400;
      line-height: 1.5;
      color: #94a3b8;
      max-width: 890px;
      margin-top: 2px;
    }

    /* Badges Row */
    .badges-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
      margin-top: 6px;
    }

    .feature-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 12px;
      background: rgba(30, 41, 59, 0.65);
      border: 1px solid rgba(148, 163, 184, 0.18);
      font-size: 13px;
      font-weight: 600;
      color: #f1f5f9;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
    }

    .feature-badge svg {
      width: 16px;
      height: 16px;
      color: #38bdf8;
      flex-shrink: 0;
    }

    .feature-badge.cyan {
      background: rgba(14, 165, 233, 0.12);
      border-color: rgba(56, 189, 248, 0.32);
    }
    .feature-badge.cyan svg { color: #38bdf8; }

    .feature-badge.amber {
      background: rgba(245, 158, 11, 0.1);
      border-color: rgba(251, 191, 36, 0.3);
    }
    .feature-badge.amber svg { color: #fbbf24; }

    .feature-badge.emerald {
      background: rgba(16, 185, 129, 0.1);
      border-color: rgba(52, 211, 153, 0.3);
    }
    .feature-badge.emerald svg { color: #34d399; }

    .feature-badge.purple {
      background: rgba(168, 85, 247, 0.1);
      border-color: rgba(192, 132, 252, 0.3);
    }
    .feature-badge.purple svg { color: #c084fc; }

    .feature-badge.indigo {
      background: rgba(99, 102, 241, 0.1);
      border-color: rgba(129, 140, 248, 0.3);
    }
    .feature-badge.indigo svg { color: #818cf8; }

    /* Bottom Bar */
    .bottom-bar {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 14px;
      border-top: 1px solid rgba(148, 163, 184, 0.12);
      font-size: 12px;
      color: #64748b;
    }

    .repo-link {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'JetBrains Mono', monospace;
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 500;
    }

    .repo-link svg {
      width: 17px;
      height: 17px;
      fill: #e2e8f0;
    }

    .tech-stack {
      display: flex;
      align-items: center;
      gap: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #64748b;
    }

    .tech-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .tech-item span {
      color: #38bdf8;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="glow-cyan"></div>
  <div class="glow-purple"></div>
  <div class="glow-indigo"></div>

  <div class="card-container">
    <!-- Top Bar -->
    <div class="top-bar">
      <div class="top-pill">
        <span class="dot"></span>
        MIKROTIK ROUTEROS • HOTSPOT SYNC
      </div>
      <div class="top-pill alt">
        <span class="dot"></span>
        DESKTOP APP • v2.1
      </div>
    </div>

    <!-- Center Hero -->
    <div class="hero-center">
      <div class="icon-halo">
        <div class="icon-wrapper">
          ${enhancedIconSvg}
        </div>
      </div>

      <div class="title-group">
        <h1 class="brand-title">tClavis</h1>
        <h2 class="brand-subtitle">MikroTik Hotspot Multi-Router Sync Manager</h2>
        <p class="brand-desc">
          Gestão centralizada e sincronização automática de usuários, senhas e perfis em clusters MikroTik.
          Emissão em lote de vouchers com QR Code, fila resiliente offline e monitoramento de sessões ativas em tempo real.
        </p>
      </div>

      <!-- Feature Badges -->
      <div class="badges-row">
        <div class="feature-badge cyan">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
          Multi-Router Sync
        </div>

        <div class="feature-badge amber">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          Fila Offline Resiliente
        </div>

        <div class="feature-badge emerald">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Vouchers & QR Code
        </div>

        <div class="feature-badge purple">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
            <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
            <circle cx="12" cy="12" r="2"/>
            <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
            <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
          </svg>
          Monitor de Sessões Ativas
        </div>

        <div class="feature-badge indigo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Bypass IP & MAC Binding
        </div>
      </div>
    </div>

    <!-- Bottom Bar -->
    <div class="bottom-bar">
      <div class="repo-link">
        <svg viewBox="0 0 24 24">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        github.com/TTreter/tClavis
      </div>

      <div class="tech-stack">
        <div class="tech-item"><span>API:</span> RouterOS v6 / v7</div>
        <div class="tech-item">•</div>
        <div class="tech-item"><span>Stack:</span> Electron + React + SQLite</div>
        <div class="tech-item">•</div>
        <div class="tech-item"><span>Security:</span> AES-256 Vault</div>
      </div>
    </div>
  </div>
</body>
</html>`;

  // Write and render Template 1
  const htmlPath1 = path.resolve(__dirname, 'temp-preview-1.html');
  fs.writeFileSync(htmlPath1, htmlTemplate1);
  await win.loadFile(htmlPath1);
  await new Promise((r) => setTimeout(r, 600));

  const img1 = await win.capturePage({ x: 0, y: 0, width: 1280, height: 640 });
  const png1 = img1.toPNG();

  // Save Primary
  const rootPreview = path.resolve(__dirname, '../social-preview.png');
  const publicPreview = path.resolve(__dirname, '../public/social-preview.png');
  const buildPreview = path.resolve(__dirname, '../build/social-preview.png');
  const artifactDir = 'C:\\Users\\tiago\\.gemini\\antigravity\\brain\\9f6b3835-5e6d-4905-9383-4489a59ccf2e';
  const artifactPreview = path.join(artifactDir, 'social-preview.png');

  fs.writeFileSync(rootPreview, png1);
  fs.writeFileSync(publicPreview, png1);
  fs.writeFileSync(buildPreview, png1);
  fs.writeFileSync(artifactPreview, png1);

  // ==========================================
  // TEMPLATE 2: TOPOLOGY / CLUSTER SHOWCASE
  // ==========================================
  const htmlTemplate2 = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>tClavis Social Preview - Cluster Showcase</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      width: 1280px;
      height: 640px;
      overflow: hidden;
      background-color: #050811;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #f8fafc;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .bg-grid {
      position: absolute;
      inset: 0;
      background-image: 
        radial-gradient(circle at 1px 1px, rgba(56, 189, 248, 0.12) 1px, transparent 0),
        linear-gradient(to right, rgba(56, 189, 248, 0.035) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(56, 189, 248, 0.035) 1px, transparent 1px);
      background-size: 36px 36px, 36px 36px, 36px 36px;
      opacity: 0.85;
    }

    .glow-cyan {
      position: absolute;
      top: -100px;
      left: 180px;
      width: 700px;
      height: 440px;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, transparent 65%);
      filter: blur(50px);
    }

    .glow-purple {
      position: absolute;
      bottom: -100px;
      right: 150px;
      width: 600px;
      height: 400px;
      background: radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, transparent 65%);
      filter: blur(55px);
    }

    .card-container {
      position: relative;
      z-index: 10;
      width: 1192px;
      height: 556px;
      border-radius: 26px;
      background: linear-gradient(145deg, rgba(15, 23, 42, 0.84) 0%, rgba(9, 14, 26, 0.78) 100%);
      border: 1px solid rgba(56, 189, 248, 0.25);
      box-shadow: 
        0 25px 60px -15px rgba(0, 0, 0, 0.8),
        inset 0 1px 0 rgba(255, 255, 255, 0.15),
        0 0 50px -15px rgba(56, 189, 248, 0.18);
      padding: 30px 48px 24px 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .top-pill {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      padding: 6px 16px;
      border-radius: 9999px;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(56, 189, 248, 0.3);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #7dd3fc;
    }

    .top-pill .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 10px #38bdf8;
    }

    .top-pill.alt {
      border-color: rgba(168, 85, 247, 0.35);
      color: #d8b4fe;
    }
    .top-pill.alt .dot {
      background: #c084fc;
      box-shadow: 0 0 10px #c084fc;
    }

    /* Split Main Section */
    .split-main {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 40px;
      margin-top: -6px;
    }

    .left-content {
      flex: 1.18;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .brand-row {
      display: flex;
      align-items: center;
      gap: 18px;
    }

    .mini-icon {
      width: 72px;
      height: 72px;
      border-radius: 18px;
      box-shadow: 0 8px 24px -4px rgba(56, 189, 248, 0.35);
      flex-shrink: 0;
    }

    .mini-icon svg {
      width: 72px;
      height: 72px;
    }

    .brand-title {
      font-size: 48px;
      font-weight: 900;
      letter-spacing: -0.5px;
      line-height: 1;
      background: linear-gradient(180deg, #ffffff 20%, #f1f5f9 65%, #93c5fd 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand-subtitle {
      font-size: 19px;
      font-weight: 700;
      color: #38bdf8;
      margin-top: 3px;
    }

    .brand-desc {
      font-size: 14.5px;
      line-height: 1.5;
      color: #94a3b8;
    }

    .badges-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 9px;
      margin-top: 4px;
    }

    .feature-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 10px;
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(148, 163, 184, 0.16);
      font-size: 12.5px;
      font-weight: 600;
      color: #f1f5f9;
    }

    .feature-badge svg {
      width: 15px;
      height: 15px;
      color: #38bdf8;
      flex-shrink: 0;
    }

    /* Right Interactive Topology Showcase */
    .right-topology {
      flex: 0.95;
      background: rgba(11, 19, 38, 0.7);
      border: 1px solid rgba(56, 189, 248, 0.22);
      border-radius: 20px;
      padding: 20px;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 10px 30px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .topology-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #64748b;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .topology-header span {
      color: #38bdf8;
      font-weight: 700;
    }

    .node-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(56, 189, 248, 0.18);
      border-radius: 12px;
      font-family: 'JetBrains Mono', monospace;
    }

    .node-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .node-icon {
      width: 32px;
      height: 32px;
      border-radius: 9px;
      background: rgba(56, 189, 248, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #38bdf8;
    }

    .node-name {
      font-size: 13px;
      font-weight: 600;
      color: #f1f5f9;
    }

    .node-model {
      font-size: 11px;
      color: #64748b;
    }

    .node-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 600;
      color: #34d399;
    }

    .node-status .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }

    .bottom-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 14px;
      border-top: 1px solid rgba(148, 163, 184, 0.12);
      font-size: 12px;
      color: #64748b;
    }

    .repo-link {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'JetBrains Mono', monospace;
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 500;
    }

    .repo-link svg {
      width: 17px;
      height: 17px;
      fill: #e2e8f0;
    }

    .tech-stack {
      display: flex;
      align-items: center;
      gap: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #64748b;
    }

    .tech-item span {
      color: #38bdf8;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="glow-cyan"></div>
  <div class="glow-purple"></div>

  <div class="card-container">
    <div class="top-bar">
      <div class="top-pill">
        <span class="dot"></span>
        MIKROTIK ROUTEROS • HOTSPOT SYNC
      </div>
      <div class="top-pill alt">
        <span class="dot"></span>
        DESKTOP APP • v2.1
      </div>
    </div>

    <div class="split-main">
      <div class="left-content">
        <div class="brand-row">
          <div class="mini-icon">
            ${enhancedIconSvg}
          </div>
          <div>
            <h1 class="brand-title">tClavis</h1>
            <h2 class="brand-subtitle">MikroTik Hotspot Sync Manager</h2>
          </div>
        </div>

        <p class="brand-desc">
          Elimine servidores RADIUS complexos. Gerencie múltiplos roteadores MikroTik simultaneamente com sincronização instantânea de usuários, senhas e perfis.
        </p>

        <div class="badges-grid">
          <div class="feature-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            Multi-Router Sync
          </div>
          <div class="feature-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            Fila Offline Resiliente
          </div>
          <div class="feature-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Vouchers & QR Code
          </div>
          <div class="feature-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
              <circle cx="12" cy="12" r="2"/>
              <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
            </svg>
            Monitor de Sessões
          </div>
        </div>
      </div>

      <!-- Right: Active Cluster Showcase -->
      <div class="right-topology">
        <div class="topology-header">
          <span>ROUTEROS CLUSTER</span>
          <div>SYNC: 100% ONLINE</div>
        </div>

        <div class="node-item">
          <div class="node-left">
            <div class="node-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
              </svg>
            </div>
            <div>
              <div class="node-name">MikroTik-Sede</div>
              <div class="node-model">CCR2004 • RouterOS v7</div>
            </div>
          </div>
          <div class="node-status"><span class="live-dot"></span> Sincronizado</div>
        </div>

        <div class="node-item">
          <div class="node-left">
            <div class="node-icon" style="color: #a855f7; background: rgba(168, 85, 247, 0.15);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
              </svg>
            </div>
            <div>
              <div class="node-name">MikroTik-Filial</div>
              <div class="node-model">RB4011 • RouterOS v7</div>
            </div>
          </div>
          <div class="node-status"><span class="live-dot"></span> Sincronizado</div>
        </div>

        <div class="node-item">
          <div class="node-left">
            <div class="node-icon" style="color: #10b981; background: rgba(16, 185, 129, 0.15);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
              </svg>
            </div>
            <div>
              <div class="node-name">Hotspot-Eventos</div>
              <div class="node-model">hEX S • RouterOS v6</div>
            </div>
          </div>
          <div class="node-status"><span class="live-dot"></span> Sincronizado</div>
        </div>
      </div>
    </div>

    <div class="bottom-bar">
      <div class="repo-link">
        <svg viewBox="0 0 24 24">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        github.com/TTreter/tClavis
      </div>

      <div class="tech-stack">
        <div class="tech-item"><span>API:</span> RouterOS v6 / v7</div>
        <div class="tech-item">•</div>
        <div class="tech-item"><span>Stack:</span> Electron + React + SQLite</div>
        <div class="tech-item">•</div>
        <div class="tech-item"><span>Security:</span> AES-256 Vault</div>
      </div>
    </div>
  </div>
</body>
</html>`;

  // Write and render Template 2
  const htmlPath2 = path.resolve(__dirname, 'temp-preview-2.html');
  fs.writeFileSync(htmlPath2, htmlTemplate2);
  await win.loadFile(htmlPath2);
  await new Promise((r) => setTimeout(r, 600));

  const img2 = await win.capturePage({ x: 0, y: 0, width: 1280, height: 640 });
  const png2 = img2.toPNG();

  const clusterPreview = path.resolve(__dirname, '../social-preview-cluster.png');
  const artifactCluster = path.join(artifactDir, 'social-preview-cluster.png');
  fs.writeFileSync(clusterPreview, png2);
  fs.writeFileSync(artifactCluster, png2);

  // Clean up
  fs.unlinkSync(htmlPath1);
  fs.unlinkSync(htmlPath2);

  console.log(`🚀 Successfully generated both 1280x640px social preview cards!`);
  app.quit();
});
