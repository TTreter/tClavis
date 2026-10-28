import { AppDatabase } from '../db/database';
import { SyncEngine } from '../mikrotik/sync-engine';
import { BrowserWindow } from 'electron';

export class SyncWorker {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  // Exponential backoff tracking per router: routerId -> nextAllowedRetryTimestamp
  private nextRetryMap: Map<string, number> = new Map();
  private failureCountMap: Map<string, number> = new Map();

  constructor(
    private db: AppDatabase,
    private syncEngine: SyncEngine,
    private getMainWindow: () => BrowserWindow | null
  ) {}

  public start(baseIntervalMs = 20000): void {
    if (this.timer) clearInterval(this.timer);
    console.log(`⚡ [tClavis Worker] Sync worker started with adaptive exponential backoff.`);

    this.timer = setInterval(() => {
      this.processQueue().catch((err) => console.error('[tClavis Worker] Error:', err));
    }, baseIntervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public resetRouterBackoff(routerId: string): void {
    this.nextRetryMap.delete(routerId);
    this.failureCountMap.delete(routerId);
  }

  public async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const pendingItems = this.db.getSyncQueue();
      if (pendingItems.length === 0) return;

      const now = Date.now();
      const routers = this.db.getRouters();

      for (const item of pendingItems) {
        const nextAllowed = this.nextRetryMap.get(item.routerId) || 0;
        if (now < nextAllowed) {
          // In exponential backoff cooldown period
          continue;
        }

        const router = routers.find((r) => r.id === item.routerId);
        if (!router) {
          this.db.markSyncQueueCompleted(item.id);
          continue;
        }

        // Test connectivity
        const testRes = await this.syncEngine.testRouter(router);
        if (!testRes.success) {
          // Calculate exponential backoff: 30s -> 60s -> 120s -> 300s (max 5 minutes)
          const failures = (this.failureCountMap.get(item.routerId) || 0) + 1;
          this.failureCountMap.set(item.routerId, failures);

          const delaySec = Math.min(300, 30 * Math.pow(2, failures - 1));
          this.nextRetryMap.set(item.routerId, now + delaySec * 1000);
          console.warn(`⏳ [tClavis Worker] ${router.name} unreachable (${failures}x). Next retry in ${delaySec}s.`);
          continue;
        }

        // Router is online! Reset backoff
        this.resetRouterBackoff(item.routerId);

        if (item.action === 'create_user' && item.payload?.user) {
          await this.syncEngine.syncUserToSingleRouter(
            item.routerId,
            item.payload.user,
            item.payload.targetProfile,
            item.payload.targetServer
          );
          this.db.markSyncQueueCompleted(item.id);
          console.log(`✅ [tClavis Worker] Reprocessed pending user sync for ${item.payload.user.username} on ${router.name}`);
        } else if (item.action === 'delete_user' && item.payload?.username) {
          await this.syncEngine.deleteUserFromSingleRouter(item.routerId, item.payload.username);
          this.db.markSyncQueueCompleted(item.id);
          console.log(`✅ [tClavis Worker] Reprocessed pending user deletion for ${item.payload.username} on ${router.name}`);
        }
      }

      // Notify frontend
      const win = this.getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('sync:updated');
      }
    } finally {
      this.isProcessing = false;
    }
  }
}
