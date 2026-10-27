import { contextBridge, ipcRenderer } from 'electron';
import { RouterDevice, LogicalGroup, LogicalServer, HotspotUser } from '../shared/types';

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

  // Hotspot Users
  getUsers: (): Promise<HotspotUser[]> => ipcRenderer.invoke('users:get'),
  saveUser: (user: HotspotUser): Promise<void> => ipcRenderer.invoke('users:save', user),
  deleteUser: (user: HotspotUser): Promise<void> => ipcRenderer.invoke('users:delete', user),
  syncUser: (user: HotspotUser): Promise<void> => ipcRenderer.invoke('users:sync', user),

  // Live Sessions
  getActiveSessions: (): Promise<any[]> => ipcRenderer.invoke('sessions:get'),
  kickSession: (routerId: string, sessionId: string): Promise<void> =>
    ipcRenderer.invoke('sessions:kick', routerId, sessionId),

  // System Stats
  getStats: (): Promise<any> => ipcRenderer.invoke('stats:get'),
};

contextBridge.exposeInMainWorld('tclavisAPI', tclavisAPI);
