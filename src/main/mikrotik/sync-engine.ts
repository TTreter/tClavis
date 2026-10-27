import { AppDatabase } from '../db/database';
import { RosClient } from './ros-client';
import { RouterDevice, HotspotUser, ActiveSession, LogicalGroup, LogicalServer } from '../../shared/types';

export class SyncEngine {
  constructor(private db: AppDatabase) {}

  public async testRouter(router: RouterDevice): Promise<{
    success: boolean;
    latencyMs: number;
    version?: string;
    cpuLoad?: number;
    uptime?: string;
    error?: string;
  }> {
    const start = Date.now();
    const client = new RosClient({
      host: router.host,
      port: router.port,
      useSsl: router.useSsl,
      username: router.username,
      password: router.passwordEncrypted,
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
      password: router.passwordEncrypted,
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
      return {
        profiles: profiles.length ? profiles : ['default'],
        servers: servers.length ? ['all', ...servers] : ['all'],
      };
    } catch (err: any) {
      client.close();
      throw new Error(`Falha ao inspecionar roteador ${router.name}: ${err.message}`);
    }
  }

  public async syncUserToCluster(user: HotspotUser): Promise<void> {
    const routers = this.db.getRouters();
    const groups = this.db.getGroups();
    const servers = this.db.getServers();

    const group = groups.find((g) => g.id === user.logicalGroupId);
    const server = servers.find((s) => s.id === user.logicalServerId);

    for (const router of routers) {
      // Resolve De-Para
      const targetProfile = group?.routerMappings[router.id] || 'default';
      const targetServer = server?.routerMappings[router.id] || 'all';

      const client = new RosClient({
        host: router.host,
        port: router.port,
        useSsl: router.useSsl,
        username: router.username,
        password: router.passwordEncrypted,
        timeoutMs: 4000,
      });

      try {
        await client.connect();

        // Check if user already exists
        const findRes = await client.talk([
          '/ip/hotspot/user/print',
          `?name=${user.username}`,
        ]);

        const existing = findRes.find((s) => s.type === '!re');

        const cmdWords: string[] = [];
        if (existing && existing.attributes['.id']) {
          // Update user
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
          // Add user
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
        client.close();

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
        client.close();
        // Router offline or command failed -> enqueue for retry
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
  }

  public async deleteUserFromCluster(user: HotspotUser): Promise<void> {
    const routers = this.db.getRouters();

    for (const router of routers) {
      const client = new RosClient({
        host: router.host,
        port: router.port,
        useSsl: router.useSsl,
        username: router.username,
        password: router.passwordEncrypted,
        timeoutMs: 4000,
      });

      try {
        await client.connect();

        // 1. Find user in MikroTik
        const findRes = await client.talk([
          '/ip/hotspot/user/print',
          `?name=${user.username}`,
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
          `?user=${user.username}`,
        ]);
        for (const act of activeRes.filter((s) => s.type === '!re' && s.attributes['.id'])) {
          await client.talk(['/ip/hotspot/active/remove', `=.id=${act.attributes['.id']}`]);
        }

        client.close();
      } catch (err: any) {
        client.close();
        this.db.pushSyncQueue({
          routerId: router.id,
          action: 'delete_user',
          payload: { username: user.username },
          status: 'pending',
          retryCount: 0,
          lastError: err.message,
        });
      }
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
        password: router.passwordEncrypted,
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
        // Ignore offline router for active sessions
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
      password: router.passwordEncrypted,
    });

    await client.connect();
    await client.talk(['/ip/hotspot/active/remove', `=.id=${sessionId}`]);
    client.close();
  }
}
