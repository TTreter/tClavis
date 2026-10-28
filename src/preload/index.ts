import { contextBridge, ipcRenderer } from 'electron';
import {
  RouterDevice,
  LogicalGroup,
  LogicalServer,
  HotspotUser,
  AuditReport,
  ParityDiscrepancy,
  IpBinding,
} from '../shared/types';

export const tclavisAPI = {
  // Routers
  getRouters: (): Promise<RouterDevice[]> => ipcRenderer.invoke('routers:get'),
  saveRouter: (router: RouterDevice): Promise<void> => ipcRenderer.invoke('routers:save', router),
  deleteRouter: (id: string): Promise<void> => ipcRenderer.invoke('routers:delete', id),
  testRouter: (router: RouterDevice): Promise<any> => ipcRenderer.invoke('routers:test', router),
  inspectRouter: (router: RouterDevice): Promise<{ profiles: string[]; servers: string[] }> =>
    ipcRenderer.invoke('routers:inspect', router),

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
  syncUser: (user: HotspotUser): Promise<void> => ipcRenderer.invoke('users:sync', user),

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
  exportBackup: (): Promise<string> => ipcRenderer.invoke('backup:export'),
  importBackup: (jsonContent: string): Promise<{ success: boolean; importedCount: number }> =>
    ipcRenderer.invoke('backup:import', jsonContent),

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
