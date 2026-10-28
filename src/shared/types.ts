export interface RouterDevice {
  id: string;
  name: string;
  host: string;
  port: number;
  useSsl: boolean;
  username: string;
  passwordEncrypted: string;
  status: 'online' | 'offline' | 'error' | 'syncing';
  latencyMs?: number;
  routerOsVersion?: string;
  cpuLoad?: number;
  uptime?: string;
  lastSeen?: string;
  lastError?: string;
  cachedProfiles?: string[];
  cachedServers?: string[];
}

export interface LogicalServer {
  id: string;
  name: string;
  description: string;
  routerMappings: Record<string, string>; // routerId -> targetServerName (e.g. "hotspot_sede" or "all")
}

export interface LogicalGroup {
  id: string;
  name: string;
  description: string;
  rateLimit?: string; // e.g. "10M/10M"
  routerMappings: Record<string, string>; // routerId -> targetProfileName (e.g. "Perfil_10M", "Guest_VIP")
}

export interface HotspotUser {
  id: string;
  username: string;
  password?: string;
  logicalGroupId: string;
  logicalServerId?: string;
  comment?: string;
  uptimeLimit?: string; // e.g. "2h", "1d"
  bytesLimit?: number; // total bytes limit
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
  // Per-router status in cluster
  syncStatus: Record<string, {
    status: 'synced' | 'pending' | 'error' | 'ignored';
    lastSynced?: string;
    errorMsg?: string;
    remoteProfile?: string;
    remoteServer?: string;
  }>;
}

export interface ActiveSession {
  id: string;
  routerId: string;
  routerName: string;
  user: string;
  address: string;
  macAddress: string;
  uptime: string;
  bytesIn: number;
  bytesOut: number;
  server: string;
}

export interface SyncQueueItem {
  id: string;
  routerId: string;
  action: 'create_user' | 'update_user' | 'delete_user' | 'update_password' | 'set_disabled';
  payload: any;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  retryCount: number;
  lastError?: string;
  createdAt: string;
}

export interface SystemStats {
  totalUsers: number;
  syncedUsers: number;
  pendingSyncs: number;
  onlineRouters: number;
  totalRouters: number;
  activeSessionsCount: number;
}

export interface ParityDiscrepancy {
  id: string;
  type: 'missing_in_router' | 'orphan_in_router' | 'profile_mismatch' | 'disabled_mismatch';
  username: string;
  routerId: string;
  routerName: string;
  expectedValue: string;
  actualValue: string;
  suggestedAction: string;
}

export interface AuditReport {
  timestamp: string;
  totalChecked: number;
  totalDiscrepancies: number;
  discrepancies: ParityDiscrepancy[];
}

export interface IpBinding {
  id: string;
  routerId: string;
  routerName?: string;
  macAddress: string;
  address?: string;
  toAddress?: string;
  server?: string;
  type: 'bypassed' | 'regular' | 'blocked';
  comment?: string;
  disabled: boolean;
}

export interface DiscoveredRouterUser {
  name: string;
  password?: string;
  profile: string;
  server?: string;
  uptimeLimit?: string;
  bytesLimit?: number;
  comment?: string;
  disabled: boolean;
  alreadyExists: boolean;
}

export interface ImportUsersBatchOptions {
  sourceRouterId: string;
  users: DiscoveredRouterUser[];
  autoCreateGroups: boolean;
  syncToOtherRouters: boolean;
}

export interface CreateProfileResult {
  success: boolean;
  error?: string;
  profileName?: string;
}

export interface DiscoveredNeighbor {
  identity: string;
  ip: string;
  mac: string;
  version: string;
  board: string;
  interface?: string;
}

