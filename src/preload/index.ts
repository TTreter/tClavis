import { contextBridge, ipcRenderer } from 'electron';
import {
  RouterDevice,
  LogicalGroup,
  LogicalServer,
  HotspotUser,
  AuditReport,
  ParityDiscrepancy,
  IpBinding,
  DiscoveredRouterUser,
  ImportUsersBatchOptions,
  CreateProfileResult,
  DiscoveredNeighbor,
  SystemAuditLog,
} from '../shared/types';

export const tclavisAPI = {
  // Routers
  getRouters: (): Promise<RouterDevice[]> => ipcRenderer.invoke('routers:get'),
  saveRouter: (router: RouterDevice): Promise<void> => ipcRenderer.invoke('routers:save', router),
  deleteRouter: (id: string): Promise<void> => ipcRenderer.invoke('routers:delete', id),
  testRouter: (router: RouterDevice): Promise<any> => ipcRenderer.invoke('routers:test', router),
  inspectRouter: (router: RouterDevice): Promise<{ profiles: string[]; servers: string[] }> =>
    ipcRenderer.invoke('routers:inspect', router),
  createRouterProfile: (
    routerId: string,
    name: string,
    rateLimit?: string
  ): Promise<CreateProfileResult> =>
    ipcRenderer.invoke('routers:create_profile', routerId, name, rateLimit),
  discoverRoutersMndp: (): Promise<DiscoveredNeighbor[]> =>
    ipcRenderer.invoke('routers:discover_mndp'),

  // Logical Groups (De-Para)
  getGroups: (): Promise<LogicalGroup[]> => ipcRenderer.invoke('groups:get'),
  saveGroup: (group: LogicalGroup): Promise<void> => ipcRenderer.invoke('groups:save', group),
  deleteGroup: (id: string): Promise<void> => ipcRenderer.invoke('groups:delete', id),

  // Logical Servers (Linking)
  getServers: (): Promise<LogicalServer[]> => ipcRenderer.invoke('servers:get'),
  saveServer: (server: LogicalServer): Promise<void> => ipcRenderer.invoke('servers:save', server),
  deleteServer: (id: string): Promise<void> => ipcRenderer.invoke('servers:delete', id),

  // Hotspot Users & Sync
  getUsers: (): Promise<HotspotUser[]> => ipcRenderer.invoke('users:get'),
  saveUser: (user: HotspotUser): Promise<void> => ipcRenderer.invoke('users:save', user),
  saveUsersBatch: (users: HotspotUser[]): Promise<void> =>
    ipcRenderer.invoke('users:batch_save', users),
  deleteUser: (user: HotspotUser): Promise<void> => ipcRenderer.invoke('users:delete', user),
  deleteUsersBatch: (users: HotspotUser[]): Promise<void> =>
    ipcRenderer.invoke('users:batch_delete', users),
  syncUser: (user: HotspotUser): Promise<void> => ipcRenderer.invoke('users:sync', user),
  discoverUsersFromRouter: (routerId: string): Promise<DiscoveredRouterUser[]> =>
    ipcRenderer.invoke('users:discover_from_router', routerId),
  importUsersBatch: (
    options: ImportUsersBatchOptions
  ): Promise<{ importedCount: number; groupsCreated: number }> =>
    ipcRenderer.invoke('users:import_batch', options),

  // Parity Audit (Diff Checker)
  runAudit: (): Promise<AuditReport> => ipcRenderer.invoke('audit:run'),
  repairDiscrepancies: (discrepancies: ParityDiscrepancy[]): Promise<number> =>
    ipcRenderer.invoke('audit:repair', discrepancies),

  // Live Sessions
  getActiveSessions: (): Promise<any[]> => ipcRenderer.invoke('sessions:get'),
  kickSession: (routerId: string, sessionId: string): Promise<void> =>
    ipcRenderer.invoke('sessions:kick', routerId, sessionId),

  // IP & MAC Bindings (Bypass)
  getIpBindings: (): Promise<IpBinding[]> => ipcRenderer.invoke('bindings:get'),
  saveIpBinding: (binding: Omit<IpBinding, 'id'>): Promise<void> =>
    ipcRenderer.invoke('bindings:save', binding),
  deleteIpBinding: (macAddress: string): Promise<void> =>
    ipcRenderer.invoke('bindings:delete', macAddress),

  // Backup & Restore
  exportBackup: (passphrase?: string): Promise<string> =>
    ipcRenderer.invoke('backup:export', passphrase),
  importBackup: (
    jsonContent: string,
    passphrase?: string
  ): Promise<{ success: boolean; importedCount: number }> =>
    ipcRenderer.invoke('backup:import', jsonContent, passphrase),
  clearDemoData: (): Promise<void> => ipcRenderer.invoke('demo:clear'),

  // System Audit Logs
  getLogs: (limit?: number): Promise<SystemAuditLog[]> =>
    ipcRenderer.invoke('logs:get', limit),
  clearLogs: (): Promise<void> => ipcRenderer.invoke('logs:clear'),

  // Master PIN & Auth
  hasMasterPin: (): Promise<boolean> => ipcRenderer.invoke('auth:has_pin'),
  setMasterPin: (pin: string): Promise<boolean> => ipcRenderer.invoke('auth:set_pin', pin),
  verifyMasterPin: (pin: string): Promise<boolean> => ipcRenderer.invoke('auth:verify_pin', pin),
  changeMasterPin: (oldPin: string, newPin: string): Promise<boolean> =>
    ipcRenderer.invoke('auth:change_pin', oldPin, newPin),

  // Settings
  getSettings: (): Promise<Record<string, string>> => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Record<string, string>): Promise<boolean> =>
    ipcRenderer.invoke('settings:save', settings),

  // Vouchers Purge
  findPurgeableVouchers: (criteria: any): Promise<HotspotUser[]> =>
    ipcRenderer.invoke('vouchers:find_purgeable', criteria),
  purgeVouchers: (userIds: string[]): Promise<number> =>
    ipcRenderer.invoke('vouchers:purge', userIds),

  // Auto-Updater (GitHub Releases)
  getCurrentVersion: (): Promise<string> => ipcRenderer.invoke('updater:get_current_version'),
  checkForUpdates: (): Promise<{
    hasUpdate: boolean;
    currentVersion: string;
    latestVersion: string;
    releaseName: string;
    releaseNotes: string;
    publishedAt: string;
    downloadUrl?: string;
    assetName?: string;
    assetSize?: number;
  }> => ipcRenderer.invoke('updater:check'),
  downloadUpdate: (options: {
    downloadUrl: string;
    assetName: string;
  }): Promise<{ success: boolean; filePath?: string; error?: string }> =>
    ipcRenderer.invoke('updater:download', options),
  installUpdate: (): Promise<boolean> => ipcRenderer.invoke('updater:install'),
  onUpdateProgress: (
    callback: (progress: {
      percentage: number;
      transferredBytes: number;
      totalBytes: number;
      speedBytesPerSec: number;
    }) => void
  ) => {
    const handler = (_event: any, progress: any) => callback(progress);
    ipcRenderer.on('updater:progress', handler);
    return () => ipcRenderer.removeListener('updater:progress', handler);
  },

  // System Stats
  getStats: (): Promise<any> => ipcRenderer.invoke('stats:get'),

  // Event Listeners
  onSyncUpdated: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('sync:updated', handler);
    return () => ipcRenderer.removeListener('sync:updated', handler);
  },
};

contextBridge.exposeInMainWorld('tclavisAPI', tclavisAPI);
