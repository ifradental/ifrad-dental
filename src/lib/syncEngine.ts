import { db, type SyncQueueItem } from './db';

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';

class SyncEngine {
  private status: SyncStatus = 'offline';
  private listeners: ((status: SyncStatus, pendingCount: number) => void)[] = [];
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.status = navigator.onLine ? 'online' : 'offline';
      window.addEventListener('online', () => this.handleOnlineStatusChange(true));
      window.addEventListener('offline', () => this.handleOnlineStatusChange(false));

      // Periodic sync loop every 15 seconds
      this.syncTimer = setInterval(() => {
        if (navigator.onLine && !this.isSyncing) {
          this.triggerSync();
        }
      }, 15000);
    }
  }

  public subscribe(callback: (status: SyncStatus, pendingCount: number) => void) {
    this.listeners.push(callback);
    this.notify();
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private async notify() {
    const pendingCount = await db.syncQueue.where('status').equals('PENDING').count();
    this.listeners.forEach((cb) => cb(this.status, pendingCount));
  }

  private async handleOnlineStatusChange(isOnline: boolean) {
    this.status = isOnline ? 'online' : 'offline';
    await this.notify();
    if (isOnline) {
      this.triggerSync();
    }
  }

  public async logMutation(
    collection: string,
    action: 'INSERT' | 'UPDATE' | 'DELETE',
    documentId: string,
    payload: any
  ) {
    const syncItem: SyncQueueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      collection,
      action,
      documentId,
      payload,
      timestamp: Date.now(),
      status: 'PENDING',
    };

    await db.syncQueue.add(syncItem);
    await this.notify();

    // If online, immediately try to sync
    if (navigator.onLine) {
      this.triggerSync();
    }
  }

  public async triggerSync(): Promise<{ success: boolean; syncedCount: number; message: string }> {
    if (this.isSyncing) return { success: true, syncedCount: 0, message: 'Sync in progress' };

    const settings = await db.settings.get('default_settings');
    const syncUrl = settings?.cloudSyncUrl || 'http://localhost:5000/api/sync';
    const apiKey = settings?.cloudSyncApiKey || 'DENTIST_SECRET_KEY_2026';

    const pendingItems = await db.syncQueue.where('status').equals('PENDING').toArray();
    if (pendingItems.length === 0) {
      this.status = navigator.onLine ? 'online' : 'offline';
      await this.notify();
      return { success: true, syncedCount: 0, message: 'All data is up to date' };
    }

    this.isSyncing = true;
    this.status = 'syncing';
    await this.notify();

    try {
      // Send batch to cloud backend
      const response = await fetch(`${syncUrl}/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          clientId: 'desktop-client-01',
          mutations: pendingItems,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Mark synchronized items as SYNCED
      const syncedIds = pendingItems.map((item) => item.id);
      await db.syncQueue.bulkDelete(syncedIds);

      // Update settings lastSyncedAt
      await db.settings.update('default_settings', {
        lastSyncedAt: new Date().toISOString(),
      });

      this.status = 'online';
      this.isSyncing = false;
      await this.notify();

      return {
        success: true,
        syncedCount: pendingItems.length,
        message: `Successfully synced ${pendingItems.length} records to cloud database!`,
      };
    } catch (error: any) {
      console.warn('Sync failed (offline or server unreachable):', error.message);
      this.status = navigator.onLine ? 'error' : 'offline';
      this.isSyncing = false;
      await this.notify();

      return {
        success: false,
        syncedCount: 0,
        message: `Saved locally. Will sync when server is reachable: ${error.message}`,
      };
    }
  }
}

export const syncEngine = new SyncEngine();

