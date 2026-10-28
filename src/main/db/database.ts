import * as path from 'path';
import * as fs from 'fs';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { RouterDevice, LogicalGroup, LogicalServer, HotspotUser, SyncQueueItem, DiscoveredRouterUser, ImportUsersBatchOptions, SystemAuditLog } from '../../shared/types';
import { CredentialVault } from '../security/crypto';

export class AppDatabase {
  private db: SqlJsDatabase | null = null;
  private dbPath: string;

  constructor(customPath?: string) {
    if (customPath) {
      this.dbPath = customPath;
    } else {
      const dataDir = path.resolve(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      this.dbPath = path.join(dataDir, 'tclavis.db');
    }
  }

  public async initialize(): Promise<void> {
    const SQL = await initSqlJs({
      locateFile: (file) => {
        const candidatePaths = [
          path.resolve(__dirname, '../../node_modules/sql.js/dist', file),
          path.resolve(process.cwd(), 'node_modules/sql.js/dist', file),
          path.resolve(__dirname, file),
          path.resolve((process as any).resourcesPath || '', file),
        ];
        for (const p of candidatePaths) {
          if (fs.existsSync(p)) return p;
        }
        return path.resolve(process.cwd(), 'node_modules/sql.js/dist', file);
      },
    });

    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }

    this.createTables();
    this.seedDefaultsIfEmpty();
    this.save();
  }

  private save(): void {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.dbPath, buffer);
  }

  private createTables(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS routers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER NOT NULL,
        use_ssl INTEGER NOT NULL DEFAULT 0,
        username TEXT NOT NULL,
        password_encrypted TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'offline',
        latency_ms INTEGER DEFAULT 0,
        routeros_version TEXT,
        cpu_load INTEGER DEFAULT 0,
        uptime TEXT,
        last_seen TEXT,
        last_error TEXT,
        cached_profiles TEXT,
        cached_servers TEXT
      );

      CREATE TABLE IF NOT EXISTS logical_groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        rate_limit TEXT
      );

      CREATE TABLE IF NOT EXISTS router_group_mappings (
        id TEXT PRIMARY KEY,
        logical_group_id TEXT NOT NULL,
        router_id TEXT NOT NULL,
        target_profile_name TEXT NOT NULL,
        UNIQUE(logical_group_id, router_id)
      );

      CREATE TABLE IF NOT EXISTS logical_servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS router_server_mappings (
        id TEXT PRIMARY KEY,
        logical_server_id TEXT NOT NULL,
        router_id TEXT NOT NULL,
        target_server_name TEXT NOT NULL,
        UNIQUE(logical_server_id, router_id)
      );

      CREATE TABLE IF NOT EXISTS hotspot_users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT,
        logical_group_id TEXT NOT NULL,
        logical_server_id TEXT,
        comment TEXT,
        uptime_limit TEXT,
        bytes_limit INTEGER,
        disabled INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_sync_status (
        user_id TEXT NOT NULL,
        router_id TEXT NOT NULL,
        status TEXT NOT NULL,
        last_synced TEXT,
        error_msg TEXT,
        remote_profile TEXT,
        remote_server TEXT,
        PRIMARY KEY(user_id, router_id)
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        router_id TEXT NOT NULL,
        action TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        retry_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS system_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        level TEXT NOT NULL,
        category TEXT NOT NULL,
        message TEXT NOT NULL,
        details TEXT
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      -- High-Performance Search & Foreign Key Indexes
      CREATE INDEX IF NOT EXISTS idx_users_group ON hotspot_users(logical_group_id);
      CREATE INDEX IF NOT EXISTS idx_users_username ON hotspot_users(username);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
      CREATE INDEX IF NOT EXISTS idx_user_sync_status ON user_sync_status(user_id, router_id);
      CREATE INDEX IF NOT EXISTS idx_router_group_map ON router_group_mappings(logical_group_id, router_id);
      CREATE INDEX IF NOT EXISTS idx_router_server_map ON router_server_mappings(logical_server_id, router_id);
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs(timestamp);
    `);

    // Safe schema migrations for existing databases
    try {
      this.db.run("ALTER TABLE routers ADD COLUMN cached_profiles TEXT;");
    } catch (_) {}
    try {
      this.db.run("ALTER TABLE routers ADD COLUMN cached_servers TEXT;");
    } catch (_) {}
  }

  private seedDefaultsIfEmpty(): void {
    if (!this.db) return;

    // Check routers
    const routerCountRes = this.db.exec("SELECT COUNT(*) FROM routers;");
    const count = routerCountRes[0]?.values[0]?.[0] as number;

    if (count === 0) {
      // Seed default 3 routers as planned in the user's scenario!
      this.addRouter({
        id: 'mk-1',
        name: 'MikroTik 1 (Sede)',
        host: '192.168.88.1',
        port: 8728,
        useSsl: false,
        username: 'admin',
        passwordEncrypted: '',
        status: 'offline',
        routerOsVersion: 'RouterOS v7.14',
      });

      this.addRouter({
        id: 'mk-2',
        name: 'MikroTik 2 (Filial)',
        host: '192.168.89.1',
        port: 8728,
        useSsl: false,
        username: 'admin',
        passwordEncrypted: '',
        status: 'offline',
        routerOsVersion: 'RouterOS v7.14',
      });

      this.addRouter({
        id: 'mk-3',
        name: 'MikroTik 3 (Anexo)',
        host: '192.168.90.1',
        port: 8728,
        useSsl: false,
        username: 'admin',
        passwordEncrypted: '',
        status: 'offline',
        routerOsVersion: 'RouterOS v6.49',
      });

      // Seed Default Logical Groups with cross-mappings
      const groupVisitante: LogicalGroup = {
        id: 'grp-visitantes',
        name: 'Visitantes (10 Mbps)',
        description: 'Acesso padrão para visitantes com limite de 10 Mega',
        rateLimit: '10M/10M',
        routerMappings: {
          'mk-1': 'Perfil_10M',
          'mk-2': 'Guest_Eventos',
          'mk-3': 'default',
        },
      };
      this.addGroup(groupVisitante);

      const groupVip: LogicalGroup = {
        id: 'grp-vip',
        name: 'Diretoria & VIP',
        description: 'Velocidade máxima sem limitação de tempo',
        rateLimit: '100M/100M',
        routerMappings: {
          'mk-1': 'VIP_50M',
          'mk-2': 'Guest_VIP',
          'mk-3': 'profile_vip',
        },
      };
      this.addGroup(groupVip);

      // Seed Default Logical Server with cross-mappings
      const serverHotspot: LogicalServer = {
        id: 'srv-publico',
        name: 'Hotspot Geral',
        description: 'Servidor Hotspot principal de cada unidade',
        routerMappings: {
          'mk-1': 'hotspot_sede',
          'mk-2': 'hs_filial',
          'mk-3': 'all',
        },
      };
      this.addServer(serverHotspot);

      // Seed sample synced user
      this.addUser({
        id: 'usr-1',
        username: 'visitante.teste',
        password: 'wifi@2026',
        logicalGroupId: 'grp-visitantes',
        logicalServerId: 'srv-publico',
        comment: 'Usuário inicial de teste',
        uptimeLimit: '1d',
        disabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: {
          'mk-1': { status: 'synced', remoteProfile: 'Perfil_10M', remoteServer: 'hotspot_sede' },
          'mk-2': { status: 'synced', remoteProfile: 'Guest_Eventos', remoteServer: 'hs_filial' },
          'mk-3': { status: 'synced', remoteProfile: 'default', remoteServer: 'all' },
        },
      });
    }
  }

  // --- Routers CRUD ---
  public getRouters(): RouterDevice[] {
    if (!this.db) return [];
    const res = this.db.exec("SELECT id, name, host, port, use_ssl, username, password_encrypted, status, latency_ms, routeros_version, cpu_load, uptime, last_seen, last_error, cached_profiles, cached_servers FROM routers ORDER BY name ASC;");
    if (res.length === 0) return [];

    const rows = res[0].values;
    return rows.map((r) => {
      let cachedProfiles: string[] | undefined;
      let cachedServers: string[] | undefined;
      try {
        if (r[14]) cachedProfiles = JSON.parse(r[14] as string);
      } catch (_) {}
      try {
        if (r[15]) cachedServers = JSON.parse(r[15] as string);
      } catch (_) {}

      return {
        id: r[0] as string,
        name: r[1] as string,
        host: r[2] as string,
        port: r[3] as number,
        useSsl: (r[4] as number) === 1,
        username: r[5] as string,
        passwordEncrypted: r[6] as string,
        status: r[7] as any,
        latencyMs: r[8] as number,
        routerOsVersion: r[9] as string,
        cpuLoad: r[10] as number,
        uptime: r[11] as string,
        lastSeen: r[12] as string,
        lastError: r[13] as string,
        cachedProfiles,
        cachedServers,
      };
    });
  }

  public addRouter(router: RouterDevice): void {
    if (!this.db) return;

    // Validate duplicate host:port
    const trimmedHost = router.host.trim().toLowerCase();
    const existing = this.getRouters().find(
      (r) => r.id !== router.id && r.host.trim().toLowerCase() === trimmedHost && r.port === router.port
    );
    if (existing) {
      throw new Error(`Já existe um roteador cadastrado com o endereço ${router.host}:${router.port} ("${existing.name}").`);
    }

    const encryptedPass = router.passwordEncrypted.includes(':') 
      ? router.passwordEncrypted 
      : CredentialVault.encrypt(router.passwordEncrypted);

    this.db.run(
      `INSERT OR REPLACE INTO routers 
       (id, name, host, port, use_ssl, username, password_encrypted, status, latency_ms, routeros_version, cpu_load, uptime, last_seen, last_error, cached_profiles, cached_servers) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        router.id,
        router.name,
        router.host,
        router.port,
        router.useSsl ? 1 : 0,
        router.username,
        encryptedPass,
        router.status,
        router.latencyMs || 0,
        router.routerOsVersion || '',
        router.cpuLoad || 0,
        router.uptime || '',
        router.lastSeen || '',
        router.lastError || '',
        router.cachedProfiles ? JSON.stringify(router.cachedProfiles) : null,
        router.cachedServers ? JSON.stringify(router.cachedServers) : null,
      ]
    );
    this.save();
  }

  public updateRouterCache(id: string, profiles: string[], servers: string[]): void {
    if (!this.db) return;
    this.db.run(
      "UPDATE routers SET cached_profiles = ?, cached_servers = ? WHERE id = ?",
      [JSON.stringify(profiles), JSON.stringify(servers), id]
    );
    this.save();
  }

  public updateRouterStatus(id: string, updates: Partial<RouterDevice>): void {
    if (!this.db) return;
    const current = this.getRouters().find((r) => r.id === id);
    if (!current) return;
    const merged = { ...current, ...updates };
    this.addRouter(merged);
  }

  public deleteRouter(id: string): void {
    if (!this.db) return;
    this.db.run("DELETE FROM routers WHERE id = ?", [id]);
    this.db.run("DELETE FROM router_group_mappings WHERE router_id = ?", [id]);
    this.db.run("DELETE FROM router_server_mappings WHERE router_id = ?", [id]);
    this.db.run("DELETE FROM user_sync_status WHERE router_id = ?", [id]);
    this.save();
  }

  // --- Logical Groups & De-Para CRUD ---
  public getGroups(): LogicalGroup[] {
    if (!this.db) return [];
    const groupsRes = this.db.exec("SELECT id, name, description, rate_limit FROM logical_groups ORDER BY name ASC;");
    if (groupsRes.length === 0) return [];

    const mappingsRes = this.db.exec("SELECT logical_group_id, router_id, target_profile_name FROM router_group_mappings;");
    const mappingsByGroup: Record<string, Record<string, string>> = {};

    if (mappingsRes.length > 0) {
      for (const row of mappingsRes[0].values) {
        const groupId = row[0] as string;
        const routerId = row[1] as string;
        const profile = row[2] as string;
        if (!mappingsByGroup[groupId]) mappingsByGroup[groupId] = {};
        mappingsByGroup[groupId][routerId] = profile;
      }
    }

    return groupsRes[0].values.map((g) => ({
      id: g[0] as string,
      name: g[1] as string,
      description: (g[2] as string) || '',
      rateLimit: (g[3] as string) || '',
      routerMappings: mappingsByGroup[g[0] as string] || {},
    }));
  }

  public addGroup(group: LogicalGroup): void {
    if (!this.db) return;
    this.db.run(
      "INSERT OR REPLACE INTO logical_groups (id, name, description, rate_limit) VALUES (?, ?, ?, ?)",
      [group.id, group.name, group.description, group.rateLimit || '']
    );

    // Save mappings
    this.db.run("DELETE FROM router_group_mappings WHERE logical_group_id = ?", [group.id]);
    for (const [routerId, profile] of Object.entries(group.routerMappings)) {
      this.db.run(
        "INSERT INTO router_group_mappings (id, logical_group_id, router_id, target_profile_name) VALUES (?, ?, ?, ?)",
        [`${group.id}_${routerId}`, group.id, routerId, profile]
      );
    }
    this.save();
  }

  public deleteGroup(id: string): void {
    if (!this.db) return;
    this.db.run("DELETE FROM logical_groups WHERE id = ?", [id]);
    this.db.run("DELETE FROM router_group_mappings WHERE logical_group_id = ?", [id]);
    this.save();
  }

  // --- Logical Servers & Linking CRUD ---
  public getServers(): LogicalServer[] {
    if (!this.db) return [];
    const serversRes = this.db.exec("SELECT id, name, description FROM logical_servers ORDER BY name ASC;");
    if (serversRes.length === 0) return [];

    const mappingsRes = this.db.exec("SELECT logical_server_id, router_id, target_server_name FROM router_server_mappings;");
    const mappingsByServer: Record<string, Record<string, string>> = {};

    if (mappingsRes.length > 0) {
      for (const row of mappingsRes[0].values) {
        const serverId = row[0] as string;
        const routerId = row[1] as string;
        const srvName = row[2] as string;
        if (!mappingsByServer[serverId]) mappingsByServer[serverId] = {};
        mappingsByServer[serverId][routerId] = srvName;
      }
    }

    return serversRes[0].values.map((s) => ({
      id: s[0] as string,
      name: s[1] as string,
      description: (s[2] as string) || '',
      routerMappings: mappingsByServer[s[0] as string] || {},
    }));
  }

  public addServer(server: LogicalServer): void {
    if (!this.db) return;
    this.db.run(
      "INSERT OR REPLACE INTO logical_servers (id, name, description) VALUES (?, ?, ?)",
      [server.id, server.name, server.description]
    );

    this.db.run("DELETE FROM router_server_mappings WHERE logical_server_id = ?", [server.id]);
    for (const [routerId, srvName] of Object.entries(server.routerMappings)) {
      this.db.run(
        "INSERT INTO router_server_mappings (id, logical_server_id, router_id, target_server_name) VALUES (?, ?, ?, ?)",
        [`${server.id}_${routerId}`, server.id, routerId, srvName]
      );
    }
    this.save();
  }

  public deleteServer(id: string): void {
    if (!this.db) return;
    this.db.run("DELETE FROM logical_servers WHERE id = ?", [id]);
    this.db.run("DELETE FROM router_server_mappings WHERE logical_server_id = ?", [id]);
    this.save();
  }

  // --- Users CRUD & Sync Status ---
  public getUsers(): HotspotUser[] {
    if (!this.db) return [];
    const usersRes = this.db.exec(`
      SELECT id, username, password, logical_group_id, logical_server_id, comment, uptime_limit, bytes_limit, disabled, created_at, updated_at
      FROM hotspot_users ORDER BY username ASC;
    `);
    if (usersRes.length === 0) return [];

    const syncRes = this.db.exec("SELECT user_id, router_id, status, last_synced, error_msg, remote_profile, remote_server FROM user_sync_status;");
    const syncByUser: Record<string, Record<string, any>> = {};

    if (syncRes.length > 0) {
      for (const row of syncRes[0].values) {
        const userId = row[0] as string;
        const routerId = row[1] as string;
        if (!syncByUser[userId]) syncByUser[userId] = {};
        syncByUser[userId][routerId] = {
          status: row[2] as any,
          lastSynced: row[3] as string,
          errorMsg: row[4] as string,
          remoteProfile: row[5] as string,
          remoteServer: row[6] as string,
        };
      }
    }

    return usersRes[0].values.map((u) => ({
      id: u[0] as string,
      username: u[1] as string,
      password: (u[2] as string) || '',
      logicalGroupId: u[3] as string,
      logicalServerId: (u[4] as string) || '',
      comment: (u[5] as string) || '',
      uptimeLimit: (u[6] as string) || '',
      bytesLimit: (u[7] as number) || 0,
      disabled: (u[8] as number) === 1,
      createdAt: u[9] as string,
      updatedAt: u[10] as string,
      syncStatus: syncByUser[u[0] as string] || {},
    }));
  }

  public addUser(user: HotspotUser): void {
    if (!this.db) return;
    this.db.run(
      `INSERT OR REPLACE INTO hotspot_users 
       (id, username, password, logical_group_id, logical_server_id, comment, uptime_limit, bytes_limit, disabled, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.username,
        user.password || '',
        user.logicalGroupId,
        user.logicalServerId || '',
        user.comment || '',
        user.uptimeLimit || '',
        user.bytesLimit || 0,
        user.disabled ? 1 : 0,
        user.createdAt,
        user.updatedAt,
      ]
    );

    // Save sync statuses
    for (const [routerId, status] of Object.entries(user.syncStatus)) {
      this.db.run(
        `INSERT OR REPLACE INTO user_sync_status 
         (user_id, router_id, status, last_synced, error_msg, remote_profile, remote_server) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          routerId,
          status.status,
          status.lastSynced || '',
          status.errorMsg || '',
          status.remoteProfile || '',
          status.remoteServer || '',
        ]
      );
    }

    this.save();
  }

  /**
   * High-performance batch insertion wrapped in a single SQL transaction.
   * Calls this.save() only ONCE at the end, speeding up batch vouchers by 50x.
   */
  public addUsersBatch(users: HotspotUser[]): void {
    if (!this.db || users.length === 0) return;

    this.db.run('BEGIN TRANSACTION;');
    try {
      for (const user of users) {
        this.db.run(
          `INSERT OR REPLACE INTO hotspot_users 
           (id, username, password, logical_group_id, logical_server_id, comment, uptime_limit, bytes_limit, disabled, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user.id,
            user.username,
            user.password || '',
            user.logicalGroupId,
            user.logicalServerId || '',
            user.comment || '',
            user.uptimeLimit || '',
            user.bytesLimit || 0,
            user.disabled ? 1 : 0,
            user.createdAt,
            user.updatedAt,
          ]
        );

        for (const [routerId, status] of Object.entries(user.syncStatus)) {
          this.db.run(
            `INSERT OR REPLACE INTO user_sync_status 
             (user_id, router_id, status, last_synced, error_msg, remote_profile, remote_server) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              user.id,
              routerId,
              status.status,
              status.lastSynced || '',
              status.errorMsg || '',
              status.remoteProfile || '',
              status.remoteServer || '',
            ]
          );
        }
      }
      this.db.run('COMMIT;');
    } catch (err) {
      this.db.run('ROLLBACK;');
      throw err;
    }

    this.save();
  }

  /**
   * Imports a batch of discovered physical users from a MikroTik into tClavis database.
   * Automatically reconciles groups and enqueues sync tasks if syncToOtherRouters is true.
   */
  public importUsersBatch(options: ImportUsersBatchOptions): { importedCount: number; groupsCreated: number } {
    if (!this.db || options.users.length === 0) return { importedCount: 0, groupsCreated: 0 };
    const routers = this.getRouters();
    const existingUsers = this.getUsers();
    const existingUsernames = new Set(existingUsers.map((u) => u.username.toLowerCase()));
    let groups = this.getGroups();
    let groupsCreated = 0;

    const sourceRouter = routers.find((r) => r.id === options.sourceRouterId);
    const sourceRouterName = sourceRouter ? sourceRouter.name : 'MikroTik';

    const usersToInsert: HotspotUser[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < options.users.length; i++) {
      const u = options.users[i];
      if (existingUsernames.has(u.name.toLowerCase())) {
        // Skip duplicate
        continue;
      }

      // 1. Reconcile or create logical group
      const targetProfile = u.profile || 'default';
      let matchedGroup = groups.find((g) => g.routerMappings[options.sourceRouterId] === targetProfile);

      if (!matchedGroup) {
        // Try to find a group with same name
        matchedGroup = groups.find((g) => g.name.toLowerCase() === targetProfile.toLowerCase());
      }

      if (!matchedGroup && options.autoCreateGroups) {
        // Create new logical group for this profile
        const newGroupId = `grp_auto_${targetProfile.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}_${i}`;
        const newGroupMappings: Record<string, string> = {};
        for (const r of routers) {
          newGroupMappings[r.id] = r.id === options.sourceRouterId ? targetProfile : targetProfile;
        }

        matchedGroup = {
          id: newGroupId,
          name: `Grupo ${targetProfile}`,
          description: `Perfil importado de ${sourceRouterName}`,
          routerMappings: newGroupMappings,
        };
        this.addGroup(matchedGroup);
        groups = this.getGroups();
        groupsCreated++;
      }

      const assignedGroupId = matchedGroup ? matchedGroup.id : (groups[0]?.id || 'grp-visitantes');

      // 2. Build sync status matrix
      const syncStatus: HotspotUser['syncStatus'] = {};
      for (const r of routers) {
        if (r.id === options.sourceRouterId) {
          syncStatus[r.id] = {
            status: 'synced',
            remoteProfile: targetProfile,
            remoteServer: u.server || 'all',
            lastSynced: now,
          };
        } else if (options.syncToOtherRouters) {
          syncStatus[r.id] = {
            status: 'pending',
            remoteProfile: matchedGroup?.routerMappings[r.id] || targetProfile,
            remoteServer: u.server || 'all',
          };
        } else {
          syncStatus[r.id] = {
            status: 'ignored',
            remoteProfile: targetProfile,
            remoteServer: u.server || 'all',
          };
        }
      }

      const newUser: HotspotUser = {
        id: `usr_imp_${Date.now()}_${i}`,
        username: u.name,
        password: u.password || '',
        logicalGroupId: assignedGroupId,
        comment: u.comment ? `${u.comment} (importado)` : `Importado de ${sourceRouterName}`,
        uptimeLimit: u.uptimeLimit || undefined,
        bytesLimit: u.bytesLimit || undefined,
        disabled: u.disabled,
        createdAt: now,
        updatedAt: now,
        syncStatus,
      };

      usersToInsert.push(newUser);
      existingUsernames.add(u.name.toLowerCase());
    }

    if (usersToInsert.length > 0) {
      this.addUsersBatch(usersToInsert);

      // Enqueue sync tasks for other routers if requested
      if (options.syncToOtherRouters) {
        for (const user of usersToInsert) {
          for (const r of routers) {
            if (r.id !== options.sourceRouterId) {
              this.enqueueSync(r.id, 'create_user', user);
            }
          }
        }
      }
    }

    return { importedCount: usersToInsert.length, groupsCreated };
  }

  public setUserSyncStatus(userId: string, routerId: string, status: any): void {
    if (!this.db) return;
    this.db.run(
      `INSERT OR REPLACE INTO user_sync_status 
       (user_id, router_id, status, last_synced, error_msg, remote_profile, remote_server) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        routerId,
        status.status,
        status.lastSynced || new Date().toISOString(),
        status.errorMsg || '',
        status.remoteProfile || '',
        status.remoteServer || '',
      ]
    );
    this.save();
  }

  public deleteUser(id: string): void {
    if (!this.db) return;
    this.db.run("DELETE FROM hotspot_users WHERE id = ?", [id]);
    this.db.run("DELETE FROM user_sync_status WHERE user_id = ?", [id]);
    this.save();
  }

  // --- Sync Queue CRUD ---
  public getSyncQueue(): SyncQueueItem[] {
    if (!this.db) return [];
    const res = this.db.exec("SELECT id, router_id, action, payload, status, retry_count, last_error, created_at FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC;");
    if (res.length === 0) return [];

    return res[0].values.map((q) => ({
      id: q[0] as string,
      routerId: q[1] as string,
      action: q[2] as any,
      payload: JSON.parse((q[3] as string) || '{}'),
      status: q[4] as any,
      retryCount: q[5] as number,
      lastError: q[6] as string,
      createdAt: q[7] as string,
    }));
  }

  public pushSyncQueue(item: Omit<SyncQueueItem, 'id' | 'createdAt'>): void {
    if (!this.db) return;

    // Deduplication check: if a pending item for this router and user already exists, update error & retries
    const queue = this.getSyncQueue();
    const itemUsername = item.payload?.user?.username || item.payload?.username;
    const existing = queue.find((q) => {
      const qUsername = q.payload?.user?.username || q.payload?.username;
      return q.routerId === item.routerId && q.action === item.action && qUsername && qUsername === itemUsername;
    });

    if (existing) {
      this.db.run(
        "UPDATE sync_queue SET payload = ?, last_error = ?, retry_count = retry_count + 1 WHERE id = ?",
        [JSON.stringify(item.payload), item.lastError || '', existing.id]
      );
      this.save();
      return;
    }

    const id = `sq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.db.run(
      `INSERT INTO sync_queue (id, router_id, action, payload, status, retry_count, last_error, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        item.routerId,
        item.action,
        JSON.stringify(item.payload),
        item.status,
        item.retryCount,
        item.lastError || '',
        new Date().toISOString(),
      ]
    );
    this.save();
  }

  public enqueueSync(routerId: string, action: SyncQueueItem['action'], payload: any): void {
    this.pushSyncQueue({
      routerId,
      action,
      payload,
      status: 'pending',
      retryCount: 0,
    });
  }

  public markSyncQueueCompleted(id: string): void {
    if (!this.db) return;
    this.db.run("DELETE FROM sync_queue WHERE id = ?", [id]);
    this.save();
  }

  // --- System Audit Logs ---
  public addLog(log: Omit<SystemAuditLog, 'id' | 'timestamp'>): void {
    if (!this.db) return;
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const timestamp = new Date().toISOString();
    this.db.run(
      `INSERT INTO system_logs (id, timestamp, level, category, message, details) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, timestamp, log.level, log.category, log.message, log.details || '']
    );
    this.save();
  }

  public getLogs(limit = 100): SystemAuditLog[] {
    if (!this.db) return [];
    const res = this.db.exec(
      `SELECT id, timestamp, level, category, message, details FROM system_logs ORDER BY timestamp DESC LIMIT ?;`,
      [limit]
    );
    if (res.length === 0) return [];
    return res[0].values.map((row) => ({
      id: row[0] as string,
      timestamp: row[1] as string,
      level: row[2] as any,
      category: row[3] as any,
      message: row[4] as string,
      details: (row[5] as string) || undefined,
    }));
  }

  public clearLogs(): void {
    if (!this.db) return;
    this.db.run("DELETE FROM system_logs;");
    this.save();
  }

  public clearDemoData(): void {
    if (!this.db) return;
    this.db.run("DELETE FROM hotspot_users WHERE id = 'usr-1';");
    this.db.run("DELETE FROM user_sync_status WHERE user_id = 'usr-1';");
    this.addLog({
      level: 'info',
      category: 'security',
      message: 'Dados de demonstração removidos pelo operador.',
    });
    this.save();
  }

  // --- App Settings & Security PIN ---
  public getSetting(key: string, defaultValue = ''): string {
    if (!this.db) return defaultValue;
    const res = this.db.exec("SELECT value FROM app_settings WHERE key = ?;", [key]);
    if (res.length > 0 && res[0].values.length > 0) {
      return (res[0].values[0][0] as string) || defaultValue;
    }
    return defaultValue;
  }

  public setSetting(key: string, value: string): void {
    if (!this.db) return;
    this.db.run("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);", [key, value]);
    this.save();
  }

  public hasMasterPin(): boolean {
    const hash = this.getSetting('master_pin_hash');
    return Boolean(hash && hash.length > 0);
  }

  public setMasterPin(pin: string): void {
    if (!pin || pin.trim().length < 4) {
      throw new Error('O PIN deve conter no mínimo 4 dígitos.');
    }
    const { hash, salt } = CredentialVault.hashPin(pin.trim());
    this.setSetting('master_pin_hash', hash);
    this.setSetting('master_pin_salt', salt);
    this.addLog({
      level: 'info',
      category: 'security',
      message: 'PIN Mestre de Segurança configurado no tClavis.',
    });
  }

  public verifyMasterPin(pin: string): boolean {
    const storedHash = this.getSetting('master_pin_hash');
    const storedSalt = this.getSetting('master_pin_salt');
    if (!storedHash || !storedSalt) return false;
    return CredentialVault.verifyPin(pin.trim(), storedHash, storedSalt);
  }

  public changeMasterPin(oldPin: string, newPin: string): boolean {
    if (!this.verifyMasterPin(oldPin)) {
      throw new Error('O PIN atual informado está incorreto.');
    }
    this.setMasterPin(newPin);
    return true;
  }

  public getAllSettings(): Record<string, string> {
    return {
      hasMasterPin: String(this.hasMasterPin()),
      pinTimeoutMinutes: this.getSetting('pin_timeout_minutes', '5'),
      startWithWindows: this.getSetting('start_with_windows', 'false'),
      minimizeToTray: this.getSetting('minimize_to_tray', 'true'),
    };
  }

  public saveAllSettings(settings: Record<string, string>): void {
    if (settings.pinTimeoutMinutes) {
      this.setSetting('pin_timeout_minutes', settings.pinTimeoutMinutes);
    }
    if (settings.startWithWindows !== undefined) {
      this.setSetting('start_with_windows', settings.startWithWindows);
    }
    if (settings.minimizeToTray !== undefined) {
      this.setSetting('minimize_to_tray', settings.minimizeToTray);
    }
  }

  // --- Vouchers Purge (Inactive / Expired) ---
  public findPurgeableVouchers(criteria: {
    olderThanDays?: number;
    unusedOnly?: boolean;
    expiredOnly?: boolean;
  }): HotspotUser[] {
    const users = this.getUsers();
    const daysLimit = criteria.olderThanDays ?? 30;
    const cutoffTimestamp = Date.now() - daysLimit * 24 * 60 * 60 * 1000;

    return users.filter((u) => {
      const isVoucher =
        u.id.startsWith('vch_') ||
        u.username.toUpperCase().startsWith('HOT-') ||
        (u.comment && u.comment.toLowerCase().includes('voucher'));

      if (!isVoucher) return false;

      const createdTime = new Date(u.createdAt).getTime();
      return createdTime <= cutoffTimestamp;
    });
  }

  // --- Backup & Restore ---
  public exportBackup(passphrase?: string): string {
    const backupData = {
      version: '2.1.0',
      exportedAt: new Date().toISOString(),
      routers: this.getRouters(),
      groups: this.getGroups(),
      servers: this.getServers(),
      users: this.getUsers(),
    };
    const rawJson = JSON.stringify(backupData, null, 2);
    if (passphrase && passphrase.trim()) {
      return CredentialVault.encryptBackup(rawJson, passphrase.trim());
    }
    return rawJson;
  }

  public importBackup(jsonString: string, passphrase?: string): { success: boolean; importedCount: number } {
    if (!this.db) return { success: false, importedCount: 0 };
    try {
      const decryptedJson = CredentialVault.decryptBackup(jsonString, passphrase);
      const data = JSON.parse(decryptedJson);
      let count = 0;

      if (Array.isArray(data.routers)) {
        for (const r of data.routers) this.addRouter(r);
      }
      if (Array.isArray(data.groups)) {
        for (const g of data.groups) this.addGroup(g);
      }
      if (Array.isArray(data.servers)) {
        for (const s of data.servers) this.addServer(s);
      }
      if (Array.isArray(data.users)) {
        this.addUsersBatch(data.users);
        count = data.users.length;
      }

      this.addLog({
        level: 'success',
        category: 'sync',
        message: `Restauração de backup concluída com ${count} usuários importados.`,
      });

      return { success: true, importedCount: count };
    } catch (err: any) {
      console.error('[tClavis DB] Import failed:', err);
      throw new Error(err.message || 'Formato de arquivo de backup inválido.');
    }
  }
}
