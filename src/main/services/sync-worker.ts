import { AppDatabase } from '../db/database';
import { SyncEngine } from '../mikrotik/sync-engine';
import { BrowserWindow } from 'electron';

export class SyncWorker {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private db: AppDatabase,
    private syncEngine: SyncEngine,
    private getMainWindow: () => BrowserWindow | null
  ) {}

  public start(intervalMs = 30000): void {
    if (this.timer) clearInterval(this.timer);
    console.log(`⚡ [tClavis Worker] Sync worker started. Polling interval: ${intervalMs / 1000}s`);

    this.timer = setInterval(() => {
      this.processQueue().catch((err) => console.error('[tClavis Worker] Error:', err));
    }, intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const pendingItems = this.db.getSyncQueue();
      if (pendingItems.length === 0) return;

      console.log(`⚡ [tClavis Worker] Processing ${pendingItems.length} pending sync items...`);
      const routers = this.db.getRouters();

      for (const item of pendingItems) {
        const router = routers.find((r) => r.id === item.routerId);
        if (!router) {
          this.db.markSyncQueueCompleted(item.id);
          continue;
        }

        // Quick ping to check if router is online
        const testRes = await this.syncEngine.testRouter(router);
        if (!testRes.success) {
          // Still offline, skip and wait for next tick
          continue;
        }

        // Router is online! Re-process action
        if (item.action === 'create_user' && item.payload?.user) {
          await this.syncEngine.syncUserToCluster(item.payload.user);
          this.db.markSyncQueueCompleted(item.id);
          console.log(`✅ [tClavis Worker] Reprocessed pending user sync for ${item.payload.user.username} on ${router.name}`);
        } else if (item.action === 'delete_user' && item.payload?.username) {
          await this.syncEngine.deleteUserFromCluster({ username: item.payload.username } as any);
          this.db.markSyncQueueCompleted(item.id);
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
