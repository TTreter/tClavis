import { AppDatabase } from '../db/database';
import { RosClient } from './ros-client';
import { CredentialVault } from '../security/crypto';
import {
  RouterDevice,
  HotspotUser,
  ActiveSession,
  AuditReport,
  ParityDiscrepancy,
  IpBinding,
  DiscoveredRouterUser,
  CreateProfileResult,
} from '../../shared/types';

export class SyncEngine {
  private connectionPool: Map<string, { client: RosClient; expiresAt: number }> = new Map();

  constructor(private db: AppDatabase) {
    // Periodic pool cleanup timer for idle connections
    setInterval(() => {
      const now = Date.now();
      for (const [id, entry] of this.connectionPool.entries()) {
        if (entry.expiresAt <= now) {
          entry.client.close();
          this.connectionPool.delete(id);
        }
      }
    }, 15000);
  }

  private getPlainPassword(router: RouterDevice): string {
    return CredentialVault.decrypt(router.passwordEncrypted);
  }

  private async getPooledClient(router: RouterDevice): Promise<RosClient> {
    const existing = this.connectionPool.get(router.id);
    if (existing && existing.expiresAt > Date.now()) {
      existing.expiresAt = Date.now() + 60000;
      return existing.client;
    }

    if (existing) {
      existing.client.close();
      this.connectionPool.delete(router.id);
    }

    const client = new RosClient({
      host: router.host,
      port: router.port,
      useSsl: router.useSsl,
      username: router.username,
      password: this.getPlainPassword(router),
      timeoutMs: 5000,
    });

    await client.connect();
    this.connectionPool.set(router.id, { client, expiresAt: Date.now() + 60000 });
    return client;
  }

  public evictFromPool(routerId: string): void {
    const existing = this.connectionPool.get(routerId);
    if (existing) {
      existing.client.close();
      this.connectionPool.delete(routerId);
    }
  }

  public async testRouter(router: RouterDevice): Promise<{
    success: boolean;
    latencyMs: number;
    version?: string;
    cpuLoad?: number;
    uptime?: string;
    error?: string;
  }> {
    const start = Date.now();
    const plainPass = this.getPlainPassword(router);
    const client = new RosClient({
      host: router.host,
      port: router.port,
      useSsl: router.useSsl,
      username: router.username,
      password: plainPass,
      timeoutMs: 5000,
    });

    try {
      await client.connect();
      const latencyMs = Date.now() - start;

      const res = await client.talk(['/system/resource/print']);
      client.close();

      const item = res.find((s) => s.type === '!re');
      const version = item?.attributes['version'] || 'RouterOS';
      const cpuLoad = parseInt(item?.attributes['cpu-load'] || '0', 10);
      const uptime = item?.attributes['uptime'] || '';

      this.db.updateRouterStatus(router.id, {
        status: 'online',
        latencyMs,
        routerOsVersion: version,
        cpuLoad,
        uptime,
        lastSeen: new Date().toISOString(),
        lastError: undefined,
      });

      return { success: true, latencyMs, version, cpuLoad, uptime };
    } catch (err: any) {
      client.close();
      const errorMsg = err.message || 'Erro de conexão';
      this.db.updateRouterStatus(router.id, {
        status: 'error',
        lastError: errorMsg,
      });
      return { success: false, latencyMs: 0, error: errorMsg };
    }
  }

  public async inspectRouterEntities(router: RouterDevice): Promise<{
    profiles: string[];
    servers: string[];
  }> {
    const client = new RosClient({
      host: router.host,
      port: router.port,
      useSsl: router.useSsl,
      username: router.username,
      password: this.getPlainPassword(router),
    });

    try {
      await client.connect();

      // 1. Fetch user profiles
      const profRes = await client.talk(['/ip/hotspot/user/profile/print']);
      const profiles = profRes
        .filter((s) => s.type === '!re' && s.attributes.name)
        .map((s) => s.attributes.name);

      // 2. Fetch hotspot servers
      const srvRes = await client.talk(['/ip/hotspot/server/print']);
      const servers = srvRes
        .filter((s) => s.type === '!re' && s.attributes.name)
        .map((s) => s.attributes.name);

      client.close();

      const validProfiles = profiles.length ? profiles : ['default'];
      const validServers = servers.length ? ['all', ...servers] : ['all'];

      // Persist discovered profiles and servers in SQLite cache
      this.db.updateRouterCache(router.id, validProfiles, validServers);

      return {
        profiles: validProfiles,
        servers: validServers,
      };
    } catch (err: any) {
      client.close();

      // Fallback to SQLite cached profiles if router is offline
      const cached = this.db.getRouters().find((r) => r.id === router.id);
      if (cached?.cachedProfiles?.length) {
        return {
          profiles: cached.cachedProfiles,
          servers: cached.cachedServers?.length ? cached.cachedServers : ['all'],
        };
      }

      throw new Error(`Falha ao inspecionar roteador ${router.name}: ${err.message}`);
    }
  }

  /**
   * Creates a new User Profile directly on the specified MikroTik router.
   */
  public async createRouterProfile(
    routerId: string,
    name: string,
    rateLimit?: string,
    sharedUsers: number = 1
  ): Promise<CreateProfileResult> {
    const router = this.db.getRouters().find((r) => r.id === routerId);
    if (!router) {
      return { success: false, error: 'Roteador não encontrado.' };
    }

    try {
      const client = await this.getPooledClient(router);
      const words = ['/ip/hotspot/user/profile/add', `=name=${name.trim()}`, `=shared-users=${sharedUsers}`];
      if (rateLimit?.trim()) {
        words.push(`=rate-limit=${rateLimit.trim()}`);
      }

      const res = await client.talk(words);
      const trap = res.find((s) => s.type === '!trap');
      if (trap) {
        return {
          success: false,
          error: trap.attributes.message || 'Erro ao criar perfil no MikroTik.',
        };
      }

      // Update cached profiles
      const currentCache = router.cachedProfiles || ['default'];
      if (!currentCache.includes(name.trim())) {
        currentCache.push(name.trim());
        this.db.updateRouterCache(router.id, currentCache, router.cachedServers || ['all']);
      }

      return { success: true, profileName: name.trim() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Reads all existing users from a physical MikroTik via RouterOS API (/ip/hotspot/user/print).
   */
  public async importUsersFromRouter(routerId: string): Promise<DiscoveredRouterUser[]> {
    const router = this.db.getRouters().find((r) => r.id === routerId);
    if (!router) {
      throw new Error('Roteador não encontrado.');
    }

    const client = await this.getPooledClient(router);
    const res = await client.talk(['/ip/hotspot/user/print']);

    const existingUsers = this.db.getUsers();
    const existingNames = new Set(existingUsers.map((u) => u.username.toLowerCase()));

    const discovered: DiscoveredRouterUser[] = [];

    for (const item of res.filter((s) => s.type === '!re')) {
      const name = item.attributes.name;
      if (!name) continue;

      const profile = item.attributes.profile || 'default';
      const server = item.attributes.server || 'all';
      const password = item.attributes.password || '';
      const uptimeLimit = item.attributes['limit-uptime'];
      const bytesLimit = item.attributes['limit-bytes-total']
        ? parseInt(item.attributes['limit-bytes-total'], 10)
        : undefined;
      const comment = item.attributes.comment;
      const disabled = item.attributes.disabled === 'yes' || item.attributes.disabled === 'true';

      discovered.push({
        name,
        password,
        profile,
        server,
        uptimeLimit,
        bytesLimit,
        comment,
        disabled,
        alreadyExists: existingNames.has(name.toLowerCase()),
      });
    }

    return discovered;
  }

  public async syncUserToSingleRouter(
    routerId: string,
    user: HotspotUser,
    explicitProfile?: string,
    explicitServer?: string
  ): Promise<void> {
    const router = this.db.getRouters().find((r) => r.id === routerId);
    if (!router) return;

    const groups = this.db.getGroups();
    const servers = this.db.getServers();
    const group = groups.find((g) => g.id === user.logicalGroupId);
    const server = servers.find((s) => s.id === user.logicalServerId);

    const targetProfile = explicitProfile || group?.routerMappings[router.id] || 'default';
    const targetServer = explicitServer || server?.routerMappings[router.id] || 'all';

    try {
      const client = await this.getPooledClient(router);

      // Check if user already exists
      const findRes = await client.talk([
        '/ip/hotspot/user/print',
        `?name=${user.username}`,
      ]);

      const existing = findRes.find((s) => s.type === '!re');
      const cmdWords: string[] = [];

      if (existing && existing.attributes['.id']) {
        cmdWords.push('/ip/hotspot/user/set');
        cmdWords.push(`=.id=${existing.attributes['.id']}`);
        if (user.password) cmdWords.push(`=password=${user.password}`);
        cmdWords.push(`=profile=${targetProfile}`);
        if (targetServer && targetServer !== 'all') cmdWords.push(`=server=${targetServer}`);
        if (user.comment) cmdWords.push(`=comment=${user.comment}`);
        if (user.uptimeLimit) cmdWords.push(`=limit-uptime=${user.uptimeLimit}`);
        if (user.bytesLimit) cmdWords.push(`=limit-bytes-total=${user.bytesLimit}`);
        cmdWords.push(`=disabled=${user.disabled ? 'yes' : 'no'}`);
      } else {
        cmdWords.push('/ip/hotspot/user/add');
        cmdWords.push(`=name=${user.username}`);
        if (user.password) cmdWords.push(`=password=${user.password}`);
        cmdWords.push(`=profile=${targetProfile}`);
        if (targetServer && targetServer !== 'all') cmdWords.push(`=server=${targetServer}`);
        if (user.comment) cmdWords.push(`=comment=${user.comment}`);
        if (user.uptimeLimit) cmdWords.push(`=limit-uptime=${user.uptimeLimit}`);
        if (user.bytesLimit) cmdWords.push(`=limit-bytes-total=${user.bytesLimit}`);
        cmdWords.push(`=disabled=${user.disabled ? 'yes' : 'no'}`);
      }

      const reply = await client.talk(cmdWords);
      const trap = reply.find((s) => s.type === '!trap');
      if (trap) {
        throw new Error(trap.attributes.message || 'Erro ao gravar usuário no MikroTik');
      }

      this.db.setUserSyncStatus(user.id, router.id, {
        status: 'synced',
        lastSynced: new Date().toISOString(),
        remoteProfile: targetProfile,
        remoteServer: targetServer,
      });
    } catch (err: any) {
      this.evictFromPool(router.id);
      this.db.setUserSyncStatus(user.id, router.id, {
        status: 'pending',
        errorMsg: err.message,
        remoteProfile: targetProfile,
        remoteServer: targetServer,
      });

      this.db.pushSyncQueue({
        routerId: router.id,
        action: 'create_user',
        payload: { user, targetProfile, targetServer },
        status: 'pending',
        retryCount: 0,
        lastError: err.message,
      });
    }
  }

  public async syncUserToCluster(user: HotspotUser): Promise<void> {
    const routers = this.db.getRouters();
    for (const router of routers) {
      await this.syncUserToSingleRouter(router.id, user);
    }
  }

  /**
   * High-speed batch sync leveraging the connection pool.
   * Reuses the authenticated socket per router to add all users in a single stream.
   */
  public async syncUsersBatchToCluster(users: HotspotUser[]): Promise<void> {
    const routers = this.db.getRouters();
    const groups = this.db.getGroups();
    const servers = this.db.getServers();

    for (const router of routers) {
      let client: RosClient | null = null;
      try {
        client = await this.getPooledClient(router);

        for (const user of users) {
          const group = groups.find((g) => g.id === user.logicalGroupId);
          const server = servers.find((s) => s.id === user.logicalServerId);
          const targetProfile = group?.routerMappings[router.id] || 'default';
          const targetServer = server?.routerMappings[router.id] || 'all';

          const cmd = [
            '/ip/hotspot/user/add',
            `=name=${user.username}`,
            `=password=${user.password || ''}`,
            `=profile=${targetProfile}`,
          ];
          if (targetServer && targetServer !== 'all') cmd.push(`=server=${targetServer}`);
          if (user.comment) cmd.push(`=comment=${user.comment}`);
          if (user.uptimeLimit) cmd.push(`=limit-uptime=${user.uptimeLimit}`);
          if (user.bytesLimit) cmd.push(`=limit-bytes-total=${user.bytesLimit}`);

          try {
            await client.talk(cmd);
            this.db.setUserSyncStatus(user.id, router.id, {
              status: 'synced',
              lastSynced: new Date().toISOString(),
              remoteProfile: targetProfile,
              remoteServer: targetServer,
            });
          } catch (itemErr: any) {
            this.db.pushSyncQueue({
              routerId: router.id,
              action: 'create_user',
              payload: { user, targetProfile, targetServer },
              status: 'pending',
              retryCount: 0,
              lastError: itemErr.message,
            });
          }
        }
      } catch (connErr: any) {
        this.evictFromPool(router.id);
        // Router offline: queue all users for this router
        for (const user of users) {
          const group = groups.find((g) => g.id === user.logicalGroupId);
          const server = servers.find((s) => s.id === user.logicalServerId);
          this.db.pushSyncQueue({
            routerId: router.id,
            action: 'create_user',
            payload: {
              user,
              targetProfile: group?.routerMappings[router.id] || 'default',
              targetServer: server?.routerMappings[router.id] || 'all',
            },
            status: 'pending',
            retryCount: 0,
            lastError: connErr.message,
          });
        }
      }
    }
  }

  public async deleteUserFromSingleRouter(routerId: string, username: string): Promise<void> {
    const router = this.db.getRouters().find((r) => r.id === routerId);
    if (!router) return;

    try {
      const client = await this.getPooledClient(router);

      // 1. Find user in MikroTik
      const findRes = await client.talk([
        '/ip/hotspot/user/print',
        `?name=${username}`,
      ]);

      const existing = findRes.find((s) => s.type === '!re');
      if (existing && existing.attributes['.id']) {
        await client.talk([
          '/ip/hotspot/user/remove',
          `=.id=${existing.attributes['.id']}`,
        ]);
      }

      // 2. Also kick active sessions if online
      const activeRes = await client.talk([
        '/ip/hotspot/active/print',
        `?user=${username}`,
      ]);
      for (const act of activeRes.filter((s) => s.type === '!re' && s.attributes['.id'])) {
        await client.talk(['/ip/hotspot/active/remove', `=.id=${act.attributes['.id']}`]);
      }
    } catch (err: any) {
      this.evictFromPool(router.id);
      this.db.pushSyncQueue({
        routerId: router.id,
        action: 'delete_user',
        payload: { username },
        status: 'pending',
        retryCount: 0,
        lastError: err.message,
      });
    }
  }

  public async deleteUserFromCluster(user: HotspotUser): Promise<void> {
    const routers = this.db.getRouters();
    for (const router of routers) {
      await this.deleteUserFromSingleRouter(router.id, user.username);
    }
    this.db.deleteUser(user.id);
  }

  public async getActiveSessions(): Promise<ActiveSession[]> {
    const routers = this.db.getRouters();
    const allSessions: ActiveSession[] = [];

    for (const router of routers) {
      const client = new RosClient({
        host: router.host,
        port: router.port,
        useSsl: router.useSsl,
        username: router.username,
        password: this.getPlainPassword(router),
        timeoutMs: 3000,
      });

      try {
        await client.connect();
        const res = await client.talk(['/ip/hotspot/active/print']);
        client.close();

        for (const item of res.filter((s) => s.type === '!re')) {
          allSessions.push({
            id: item.attributes['.id'] || `${router.id}_${item.attributes.user}`,
            routerId: router.id,
            routerName: router.name,
            user: item.attributes.user || 'Desconhecido',
            address: item.attributes.address || '',
            macAddress: item.attributes['mac-address'] || '',
            uptime: item.attributes.uptime || '0s',
            bytesIn: parseInt(item.attributes['bytes-in'] || '0', 10),
            bytesOut: parseInt(item.attributes['bytes-out'] || '0', 10),
            server: item.attributes.server || 'hotspot',
          });
        }
      } catch (err) {
        client.close();
      }
    }

    return allSessions;
  }

  public async kickSession(routerId: string, sessionId: string): Promise<void> {
    const router = this.db.getRouters().find((r) => r.id === routerId);
    if (!router) throw new Error('Roteador não encontrado');

    const client = new RosClient({
      host: router.host,
      port: router.port,
      useSsl: router.useSsl,
      username: router.username,
      password: this.getPlainPassword(router),
    });

    await client.connect();
    await client.talk(['/ip/hotspot/active/remove', `=.id=${sessionId}`]);
    client.close();
  }

  // --- PARITY AUDIT (DIFF CHECKER) ---
  public async runParityAudit(): Promise<AuditReport> {
    const routers = this.db.getRouters();
    const localUsers = this.db.getUsers();
    const groups = this.db.getGroups();
    const discrepancies: ParityDiscrepancy[] = [];

    const routerUsersMap: Record<string, Map<string, { profile: string; disabled: boolean }>> = {};

    // 1. Fetch users from all accessible routers
    for (const router of routers) {
      const userMap = new Map<string, { profile: string; disabled: boolean }>();
      routerUsersMap[router.id] = userMap;

      const client = new RosClient({
        host: router.host,
        port: router.port,
        useSsl: router.useSsl,
        username: router.username,
        password: this.getPlainPassword(router),
        timeoutMs: 3500,
      });

      try {
        await client.connect();
        const res = await client.talk(['/ip/hotspot/user/print']);
        client.close();

        for (const item of res.filter((s) => s.type === '!re')) {
          const uName = item.attributes.name;
          if (uName) {
            userMap.set(uName, {
              profile: item.attributes.profile || 'default',
              disabled: item.attributes.disabled === 'yes' || item.attributes.disabled === 'true',
            });
          }
        }
      } catch (err) {
        client.close();
        // If router is offline, mark missing for that router
      }
    }

    // 2. Check local users against each router
    for (const localUser of localUsers) {
      const group = groups.find((g) => g.id === localUser.logicalGroupId);

      for (const router of routers) {
        const expectedProfile = group?.routerMappings[router.id] || 'default';
        const routerUsers = routerUsersMap[router.id];

        if (!routerUsers) continue; // router was unreachable

        const remoteUser = routerUsers.get(localUser.username);
        if (!remoteUser) {
          discrepancies.push({
            id: `disc_${localUser.id}_${router.id}_missing`,
            type: 'missing_in_router',
            username: localUser.username,
            routerId: router.id,
            routerName: router.name,
            expectedValue: `Presente (Profile: ${expectedProfile})`,
            actualValue: 'Ausente no MikroTik',
            suggestedAction: 'Criar e sincronizar usuário no roteador',
          });
        } else {
          // Check profile match
          if (remoteUser.profile !== expectedProfile) {
            discrepancies.push({
              id: `disc_${localUser.id}_${router.id}_profile`,
              type: 'profile_mismatch',
              username: localUser.username,
              routerId: router.id,
              routerName: router.name,
              expectedValue: expectedProfile,
              actualValue: remoteUser.profile,
              suggestedAction: `Atualizar profile para "${expectedProfile}"`,
            });
          }

          // Check disabled state match
          if (remoteUser.disabled !== localUser.disabled) {
            discrepancies.push({
              id: `disc_${localUser.id}_${router.id}_disabled`,
              type: 'disabled_mismatch',
              username: localUser.username,
              routerId: router.id,
              routerName: router.name,
              expectedValue: localUser.disabled ? 'Desabilitado' : 'Habilitado',
              actualValue: remoteUser.disabled ? 'Desabilitado' : 'Habilitado',
              suggestedAction: `Ajustar status para "${localUser.disabled ? 'Desabilitado' : 'Habilitado'}"`,
            });
          }
        }
      }
    }

    // 3. Check for orphans (users that exist on physical router but NOT in tClavis)
    const localUserNames = new Set(localUsers.map((u) => u.username));
    for (const router of routers) {
      const routerUsers = routerUsersMap[router.id];
      if (!routerUsers) continue;

      for (const [remoteName, remoteData] of routerUsers.entries()) {
        if (!localUserNames.has(remoteName)) {
          discrepancies.push({
            id: `disc_orphan_${remoteName}_${router.id}`,
            type: 'orphan_in_router',
            username: remoteName,
            routerId: router.id,
            routerName: router.name,
            expectedValue: 'Não cadastrado no tClavis',
            actualValue: `Criado avulso no MikroTik (Profile: ${remoteData.profile})`,
            suggestedAction: 'Importar para o tClavis ou expurgar do MikroTik',
          });
        }
      }
    }

    return {
      timestamp: new Date().toISOString(),
      totalChecked: localUsers.length,
      totalDiscrepancies: discrepancies.length,
      discrepancies,
    };
  }

  public async repairDiscrepancies(discrepancies: ParityDiscrepancy[]): Promise<number> {
    let repairedCount = 0;
    const localUsers = this.db.getUsers();
    const routers = this.db.getRouters();

    for (const disc of discrepancies) {
      if (disc.type === 'orphan_in_router') {
        const r = routers.find((item) => item.id === disc.routerId);
        if (r) {
          try {
            const discovered = await this.importUsersFromRouter(r.id);
            const orphan = discovered.find((u) => u.name === disc.username);
            if (orphan) {
              this.db.importUsersBatch({
                sourceRouterId: r.id,
                users: [orphan],
                autoCreateGroups: true,
                syncToOtherRouters: false,
              });
              repairedCount++;
            }
          } catch (_) {}
        }
      } else {
        const user = localUsers.find((u) => u.username === disc.username);
        if (user) {
          await this.syncUserToCluster(user);
          repairedCount++;
        }
      }
    }

    return repairedCount;
  }

  // --- IP & MAC BINDINGS (BYPASS) ---
  public async getIpBindings(): Promise<IpBinding[]> {
    const routers = this.db.getRouters();
    const allBindings: IpBinding[] = [];

    for (const router of routers) {
      const client = new RosClient({
        host: router.host,
        port: router.port,
        useSsl: router.useSsl,
        username: router.username,
        password: this.getPlainPassword(router),
        timeoutMs: 3000,
      });

      try {
        await client.connect();
        const res = await client.talk(['/ip/hotspot/ip-binding/print']);
        client.close();

        for (const item of res.filter((s) => s.type === '!re')) {
          allBindings.push({
            id: item.attributes['.id'] || `${router.id}_${item.attributes['mac-address']}`,
            routerId: router.id,
            routerName: router.name,
            macAddress: item.attributes['mac-address'] || '',
            address: item.attributes.address,
            toAddress: item.attributes['to-address'],
            server: item.attributes.server,
            type: (item.attributes.type as any) || 'bypassed',
            comment: item.attributes.comment,
            disabled: item.attributes.disabled === 'yes',
          });
        }
      } catch (err) {
        client.close();
      }
    }

    return allBindings;
  }

  public async addIpBinding(binding: Omit<IpBinding, 'id'>): Promise<void> {
    const routers = this.db.getRouters();

    for (const router of routers) {
      const client = new RosClient({
        host: router.host,
        port: router.port,
        useSsl: router.useSsl,
        username: router.username,
        password: this.getPlainPassword(router),
        timeoutMs: 4000,
      });

      try {
        await client.connect();
        const cmd = [
          '/ip/hotspot/ip-binding/add',
          `=mac-address=${binding.macAddress}`,
          `=type=${binding.type}`,
        ];
        if (binding.comment) cmd.push(`=comment=${binding.comment}`);
        if (binding.address) cmd.push(`=address=${binding.address}`);
        cmd.push(`=disabled=${binding.disabled ? 'yes' : 'no'}`);

        await client.talk(cmd);
        client.close();
      } catch (err) {
        client.close();
      }
    }
  }

  public async deleteIpBinding(macAddress: string): Promise<void> {
    const routers = this.db.getRouters();

    for (const router of routers) {
      const client = new RosClient({
        host: router.host,
        port: router.port,
        useSsl: router.useSsl,
        username: router.username,
        password: this.getPlainPassword(router),
        timeoutMs: 4000,
      });

      try {
        await client.connect();
        const res = await client.talk([
          '/ip/hotspot/ip-binding/print',
          `?mac-address=${macAddress}`,
        ]);

        for (const item of res.filter((s) => s.type === '!re' && s.attributes['.id'])) {
          await client.talk(['/ip/hotspot/ip-binding/remove', `=.id=${item.attributes['.id']}`]);
        }
        client.close();
      } catch (err) {
        client.close();
      }
    }
  }
}
