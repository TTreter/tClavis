import { app, BrowserWindow, ipcMain, shell, session } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { AppDatabase } from './db/database';
import { SyncEngine } from './mikrotik/sync-engine';
import { SyncWorker } from './services/sync-worker';
import { TrayManager } from './services/tray-manager';
import { SecurityValidator } from './security/validator';
import { MndpDiscovery } from './mikrotik/mndp-discovery';
import { GitHubUpdater } from './updater/githubUpdater';
import { RouterDevice, LogicalGroup, LogicalServer, HotspotUser, ParityDiscrepancy, IpBinding, ImportUsersBatchOptions } from '../shared/types';

// Trava de Instância Única (Single Instance Lock)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

let mainWindow: BrowserWindow | null = null;
let db: AppDatabase;
let syncEngine: SyncEngine;
let syncWorker: SyncWorker;
let trayManager: TrayManager;
let updater: GitHubUpdater;

async function createWindow() {
  const assetIco = path.join(__dirname, 'assets/icon.ico');
  const assetPng = path.join(__dirname, 'assets/icon.png');
  const devIco = path.resolve(__dirname, '../../build/icon.ico');
  const devPng = path.resolve(__dirname, '../../build/icon.png');

  const iconPath = process.platform === 'win32'
    ? (fs.existsSync(assetIco) ? assetIco : devIco)
    : (fs.existsSync(assetPng) ? assetPng : devPng);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#090d16',
    title: 'tClavis — MikroTik Hotspot Sync',
    icon: iconPath,
    webPreferences: {
      preload: path.resolve(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
  });

  // Security: Deny all popups/new windows and redirect external URLs to the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Security: Deny all hardware/device permission requests (camera, mic, geolocation, notifications)
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
  } else {
    await mainWindow.loadFile(path.resolve(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('close', (e) => {
    const minToTray = db ? db.getSetting('minimize_to_tray', 'true') === 'true' : true;
    if (minToTray && !(app as any).isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers() {
  // Routers
  ipcMain.handle('routers:get', async () => db.getRouters());
  ipcMain.handle('routers:save', async (_, router: RouterDevice) => db.addRouter(router));
  ipcMain.handle('routers:delete', async (_, id: string) => db.deleteRouter(id));
  ipcMain.handle('routers:test', async (_, router: RouterDevice) => syncEngine.testRouter(router));
  ipcMain.handle('routers:inspect', async (_, router: RouterDevice) => syncEngine.inspectRouterEntities(router));
  ipcMain.handle('routers:create_profile', async (_, routerId: string, name: string, rateLimit?: string) =>
    syncEngine.createRouterProfile(routerId, name, rateLimit)
  );
  ipcMain.handle('routers:discover_mndp', async () => MndpDiscovery.scan());

  // Groups
  ipcMain.handle('groups:get', async () => db.getGroups());
  ipcMain.handle('groups:save', async (_, group: LogicalGroup) => db.addGroup(group));
  ipcMain.handle('groups:delete', async (_, id: string) => db.deleteGroup(id));

  // Servers
  ipcMain.handle('servers:get', async () => db.getServers());
  ipcMain.handle('servers:save', async (_, server: LogicalServer) => db.addServer(server));
  ipcMain.handle('servers:delete', async (_, id: string) => db.deleteServer(id));

  // Users & Sync
  ipcMain.handle('users:get', async () => db.getUsers());
  ipcMain.handle('users:save', async (_, rawUser: HotspotUser) => {
    // Input sanitization & validation
    const user: HotspotUser = {
      ...rawUser,
      username: SecurityValidator.sanitizeUsername(rawUser.username),
      password: SecurityValidator.sanitizePassword(rawUser.password || ''),
      comment: SecurityValidator.sanitizeComment(rawUser.comment),
      uptimeLimit: rawUser.uptimeLimit ? SecurityValidator.validateUptimeLimit(rawUser.uptimeLimit) : undefined,
    };

    db.addUser(user);
    syncEngine.syncUserToCluster(user).catch((err) => console.error('Sync error:', err));
  });

  ipcMain.handle('users:batch_save', async (_, rawUsers: HotspotUser[]) => {
    const validatedUsers = rawUsers.map((u) => ({
      ...u,
      username: SecurityValidator.sanitizeUsername(u.username),
      password: SecurityValidator.sanitizePassword(u.password || ''),
      comment: SecurityValidator.sanitizeComment(u.comment),
      uptimeLimit: u.uptimeLimit ? SecurityValidator.validateUptimeLimit(u.uptimeLimit) : undefined,
    }));

    db.addUsersBatch(validatedUsers);
    // Sync batch to cluster using connection pool
    syncEngine.syncUsersBatchToCluster(validatedUsers).catch((err) => console.error('Batch sync error:', err));
  });

  ipcMain.handle('users:sync', async (_, user: HotspotUser) => syncEngine.syncUserToCluster(user));
  ipcMain.handle('users:delete', async (_, user: HotspotUser) => syncEngine.deleteUserFromCluster(user));
  ipcMain.handle('users:batch_delete', async (_, users: HotspotUser[]) => {
    for (const u of users) {
      await syncEngine.deleteUserFromCluster(u);
    }
  });
  ipcMain.handle('users:discover_from_router', async (_, routerId: string) =>
    syncEngine.importUsersFromRouter(routerId)
  );
  ipcMain.handle('users:import_batch', async (_, options: ImportUsersBatchOptions) =>
    db.importUsersBatch(options)
  );

  // Parity Audit
  ipcMain.handle('audit:run', async () => syncEngine.runParityAudit());
  ipcMain.handle('audit:repair', async (_, discrepancies: ParityDiscrepancy[]) =>
    syncEngine.repairDiscrepancies(discrepancies)
  );

  // Sessions
  ipcMain.handle('sessions:get', async () => syncEngine.getActiveSessions());
  ipcMain.handle('sessions:kick', async (_, routerId: string, sessionId: string) =>
    syncEngine.kickSession(routerId, sessionId)
  );

  // IP & MAC Bindings
  ipcMain.handle('bindings:get', async () => syncEngine.getIpBindings());
  ipcMain.handle('bindings:save', async (_, rawBinding: Omit<IpBinding, 'id'>) => {
    const binding: Omit<IpBinding, 'id'> = {
      ...rawBinding,
      macAddress: SecurityValidator.validateMacAddress(rawBinding.macAddress),
      comment: SecurityValidator.sanitizeComment(rawBinding.comment),
    };
    return syncEngine.addIpBinding(binding);
  });
  ipcMain.handle('bindings:delete', async (_, macAddress: string) =>
    syncEngine.deleteIpBinding(SecurityValidator.validateMacAddress(macAddress))
  );

  // Backup & Restore
  ipcMain.handle('backup:export', async (_, passphrase?: string) => db.exportBackup(passphrase));
  ipcMain.handle('backup:import', async (_, jsonContent: string, passphrase?: string) =>
    db.importBackup(jsonContent, passphrase)
  );
  ipcMain.handle('demo:clear', async () => db.clearDemoData());

  // System Logs & Activity Feed
  ipcMain.handle('logs:get', async (_, limit?: number) => db.getLogs(limit || 100));
  ipcMain.handle('logs:clear', async () => db.clearLogs());

  // Security Master PIN & Session Auth
  ipcMain.handle('auth:has_pin', async () => db.hasMasterPin());
  ipcMain.handle('auth:set_pin', async (_, pin: string) => {
    db.setMasterPin(pin);
    return true;
  });
  ipcMain.handle('auth:verify_pin', async (_, pin: string) => db.verifyMasterPin(pin));
  ipcMain.handle('auth:change_pin', async (_, oldPin: string, newPin: string) =>
    db.changeMasterPin(oldPin, newPin)
  );

  // App Settings
  ipcMain.handle('settings:get', async () => db.getAllSettings());
  ipcMain.handle('settings:save', async (_, settings: Record<string, string>) => {
    db.saveAllSettings(settings);
    if (settings.startWithWindows !== undefined) {
      try {
        app.setLoginItemSettings({
          openAtLogin: settings.startWithWindows === 'true',
          path: process.execPath,
        });
      } catch (_) {}
    }
    return true;
  });

  // Vouchers Purge (Inactive / Expired)
  ipcMain.handle('vouchers:find_purgeable', async (_, criteria: any) =>
    db.findPurgeableVouchers(criteria || {})
  );
  ipcMain.handle('vouchers:purge', async (_, userIds: string[]) => {
    const users = db.getUsers().filter((u) => userIds.includes(u.id));
    for (const u of users) {
      await syncEngine.deleteUserFromCluster(u);
    }
    db.addLog({
      level: 'warning',
      category: 'user',
      message: `${users.length} vouchers inativos/expirados foram expurgados pelo operador.`,
    });
    return users.length;
  });

  // Stats
  ipcMain.handle('stats:get', async () => {
    const routers = db.getRouters();
    const users = db.getUsers();
    const queue = db.getSyncQueue();

    const onlineRouters = routers.filter((r) => r.status === 'online').length;
    const fullySynced = users.filter((u) => {
      const statuses = Object.values(u.syncStatus);
      return statuses.length > 0 && statuses.every((s) => s.status === 'synced');
    }).length;

    return {
      totalUsers: users.length,
      syncedUsers: fullySynced,
      pendingSyncs: queue.length,
      onlineRouters,
      totalRouters: routers.length,
      activeSessionsCount: 0,
    };
  });

  // Auto-Updater via GitHub Releases
  ipcMain.handle('updater:get_current_version', () => app.getVersion());
  ipcMain.handle('updater:check', async () => updater.checkForUpdates());
  ipcMain.handle(
    'updater:download',
    async (_, { downloadUrl, assetName }: { downloadUrl: string; assetName: string }) => {
      return updater.downloadUpdate(downloadUrl, assetName, (progress) => {
        mainWindow?.webContents.send('updater:progress', progress);
      });
    }
  );
  ipcMain.handle('updater:install', () => updater.installUpdate());
}

app.whenReady().then(async () => {
  db = new AppDatabase();
  await db.initialize();
  syncEngine = new SyncEngine(db);
  updater = new GitHubUpdater();

  syncWorker = new SyncWorker(db, syncEngine, () => mainWindow);
  syncWorker.start(30000); // Poll every 30 seconds

  trayManager = new TrayManager(
    () => mainWindow,
    async () => {
      await syncWorker.processQueue();
    }
  );
  trayManager.initialize();

  registerIpcHandlers();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  (app as any).isQuitting = true;
  if (trayManager) {
    trayManager.destroy();
  }
  if (syncWorker) {
    syncWorker.stop();
  }
});

app.on('window-all-closed', () => {
  if (syncWorker) syncWorker.stop();
  if (trayManager) trayManager.destroy();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
