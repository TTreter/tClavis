import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { AppDatabase } from './db/database';
import { SyncEngine } from './mikrotik/sync-engine';
import { SyncWorker } from './services/sync-worker';
import { TrayManager } from './services/tray-manager';
import { RouterDevice, LogicalGroup, LogicalServer, HotspotUser, ParityDiscrepancy, IpBinding } from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let db: AppDatabase;
let syncEngine: SyncEngine;
let syncWorker: SyncWorker;
let trayManager: TrayManager;

async function createWindow() {
  const iconPath = process.platform === 'win32'
    ? path.resolve(__dirname, '../../build/icon.ico')
    : path.resolve(__dirname, '../../build/icon.png');

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

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
  } else {
    await mainWindow.loadFile(path.resolve(__dirname, '../../dist/index.html'));
  }

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
  ipcMain.handle('users:save', async (_, user: HotspotUser) => {
    db.addUser(user);
    syncEngine.syncUserToCluster(user).catch((err) => console.error('Sync error:', err));
  });
  ipcMain.handle('users:sync', async (_, user: HotspotUser) => syncEngine.syncUserToCluster(user));
  ipcMain.handle('users:delete', async (_, user: HotspotUser) => syncEngine.deleteUserFromCluster(user));

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
  ipcMain.handle('bindings:save', async (_, binding: Omit<IpBinding, 'id'>) =>
    syncEngine.addIpBinding(binding)
  );
  ipcMain.handle('bindings:delete', async (_, macAddress: string) =>
    syncEngine.deleteIpBinding(macAddress)
  );

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
}

app.whenReady().then(async () => {
  db = new AppDatabase();
  await db.initialize();
  syncEngine = new SyncEngine(db);

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

app.on('window-all-closed', () => {
  if (syncWorker) syncWorker.stop();
  if (trayManager) trayManager.destroy();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
