import { db, type SyncQueueItem } from './db';

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';

class SyncEngine {
  private status: SyncStatus = 'offline';
  private listeners: ((status: SyncStatus, pendingCount: number) => void)[] = [];
  private dataListeners: ((collections?: string[]) => void)[] = [];
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private isPulling = false;
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.status = navigator.onLine ? 'online' : 'offline';
      window.addEventListener('online', () => this.handleOnlineStatusChange(true));
      window.addEventListener('offline', () => this.handleOnlineStatusChange(false));

      // Setup cross-tab broadcast channel
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          this.broadcastChannel = new BroadcastChannel('ifrad_sync_channel');
          this.broadcastChannel.onmessage = (event) => {
            if (event.data?.type === 'DATA_CHANGED') {
              this.pullUpdates().catch(() => {});
            }
          };
        } catch (e) {
          console.warn('BroadcastChannel notice:', e);
        }
      }

      // Listen to cross-tab localStorage events as fallback
      window.addEventListener('storage', (e) => {
        if (e.key === 'ifrad_last_sync_broadcast') {
          this.pullUpdates().catch(() => {});
        }
      });

      // Pull updates immediately when tab gains focus or becomes visible
      window.addEventListener('focus', () => {
        if (navigator.onLine) {
          this.pullUpdates().catch(() => {});
        }
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          this.pullUpdates().catch(() => {});
        }
      });

      // Initial auto-pull, admin sync, and trigger on startup
      setTimeout(async () => {
        if (navigator.onLine) {
          await this.ensureAdminSynced();
          this.pullUpdates().catch(() => {});
          this.triggerSync().catch(() => {});
        }
      }, 500);

      // Fast reactive sync loop every 3.5 seconds across all browsers
      this.syncTimer = setInterval(() => {
        if (navigator.onLine) {
          if (!this.isSyncing) {
            this.triggerSync().catch(() => {});
          }
          if (!this.isPulling) {
            this.pullUpdates().catch(() => {});
          }
        }
      }, 3500);
    }
  }

  public subscribe(callback: (status: SyncStatus, pendingCount: number) => void) {
    this.listeners.push(callback);
    this.notify();
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  public onDataChange(callback: (collections?: string[]) => void): () => void {
    this.dataListeners.push(callback);
    return () => {
      this.dataListeners = this.dataListeners.filter((l) => l !== callback);
    };
  }

  public notifyDataChange(collections?: string[]) {
    this.dataListeners.forEach((cb) => {
      try {
        cb(collections);
      } catch (e) {
        console.error('Error in onDataChange listener:', e);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ifrad_data_changed', {
          detail: { collections, timestamp: Date.now() },
        })
      );

      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({
            type: 'DATA_CHANGED',
            collections,
            timestamp: Date.now(),
          });
        } catch (_) {}
      }

      try {
        localStorage.setItem('ifrad_last_sync_broadcast', Date.now().toString());
      } catch (_) {}
    }
  }

  private async notify() {
    const pendingCount = await db.syncQueue.where('status').equals('PENDING').count();
    this.listeners.forEach((cb) => cb(this.status, pendingCount));
  }

  private async handleOnlineStatusChange(isOnline: boolean) {
    this.status = isOnline ? 'online' : 'offline';
    await this.notify();
    if (isOnline) {
      this.pullUpdates().catch(() => {});
      this.triggerSync().catch(() => {});
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
    this.notifyDataChange([collection]);

    // If online, immediately try to sync to MongoDB
    if (navigator.onLine) {
      this.triggerSync().catch(() => {});
    }
  }

  /**
   * Ensures the active admin user is stored and synchronized to MongoDB.
   */
  public async ensureAdminSynced(): Promise<void> {
    try {
      const admin =
        (await db.employees.where('role').equals('Admin').first()) ||
        (await db.employees.get('emp_admin'));
      if (admin) {
        const inQueue = await db.syncQueue
          .where('documentId')
          .equals(admin.id)
          .first();
        if (!inQueue) {
          await this.logMutation('employees', 'UPDATE', admin.id, admin);
        }
      }
    } catch (e: any) {
      console.warn('ensureAdminSynced notice:', e.message);
    }
  }

  /**
   * Pushes pending mutations to MongoDB via Next.js API /api/sync/push
   */
  public async triggerSync(): Promise<{ success: boolean; syncedCount: number; message: string }> {
    if (this.isSyncing) return { success: true, syncedCount: 0, message: 'Sync in progress' };

    await this.ensureAdminSynced();

    const settings = await db.settings.get('default_settings');
    // Default to Next.js API route /api/sync so it works natively on Vercel and local
    const syncUrl =
      settings?.cloudSyncUrl && !settings.cloudSyncUrl.includes('localhost:5000')
        ? settings.cloudSyncUrl
        : '/api/sync';
    const apiKey = settings?.cloudSyncApiKey || 'DENTIST_SECRET_KEY_2026';

    const pendingItems = await db.syncQueue.where('status').equals('PENDING').toArray();
    if (pendingItems.length === 0) {
      this.status = navigator.onLine ? 'online' : 'offline';
      await this.notify();
      return { success: true, syncedCount: 0, message: 'All data is up to date in MongoDB' };
    }

    this.isSyncing = true;
    this.status = 'syncing';
    await this.notify();

    try {
      // Send batch to MongoDB API
      const response = await fetch(`${syncUrl}/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          clientId: 'web-client-01',
          mutations: pendingItems,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success && (!result.results || result.results.length === 0)) {
        throw new Error(result.error || result.message || 'Server rejected synchronization payload');
      }

      // Mark ONLY verified synchronized items as completed by deleting from queue
      const confirmedResults = (result.results || []).filter(
        (r: any) => r.status === 'UPSERTED' || r.status === 'DELETED'
      );

      const confirmedQueueIds = new Set(
        confirmedResults.map((r: any) => r.id)
      );

      const confirmedDocumentIds = new Set(
        confirmedResults.map((r: any) => r.documentId)
      );

      const queueIdsToDelete = pendingItems
        .filter((item) => confirmedQueueIds.has(item.id) || confirmedDocumentIds.has(item.documentId))
        .map((item) => item.id);

      if (queueIdsToDelete.length > 0) {
        await db.syncQueue.bulkDelete(queueIdsToDelete);
      }

      // Update settings lastSyncedAt
      if (result.syncedAt || queueIdsToDelete.length > 0) {
        await db.settings.update('default_settings', {
          lastSyncedAt: result.syncedAt || new Date().toISOString(),
        });
      }

      this.status = 'online';
      this.isSyncing = false;
      await this.notify();

      return {
        success: true,
        syncedCount: queueIdsToDelete.length,
        message: `Successfully synced ${queueIdsToDelete.length} of ${pendingItems.length} records to MongoDB Atlas!`,
      };
    } catch (error: any) {
      console.warn('Sync failed (offline or server unreachable):', error.message);
      this.status = navigator.onLine ? 'error' : 'offline';
      this.isSyncing = false;
      await this.notify();

      return {
        success: false,
        syncedCount: 0,
        message: `Saved locally in IndexedDB. Will sync when MongoDB is reachable: ${error.message}`,
      };
    }
  }

  /**
   * Pulls latest updates from MongoDB to local Dexie cache and prunes deleted records
   */
  public async pullUpdates(): Promise<{ success: boolean; pulledCount: number }> {
    if (this.isPulling) return { success: true, pulledCount: 0 };
    this.isPulling = true;

    try {
      const settings = await db.settings.get('default_settings');
      const syncUrl =
        settings?.cloudSyncUrl && !settings.cloudSyncUrl.includes('localhost:5000')
          ? settings.cloudSyncUrl
          : '/api/sync';

      const lastSyncTime = settings?.lastSyncedAt
        ? new Date(settings.lastSyncedAt).getTime()
        : 0;

      const res = await fetch(`${syncUrl}/pull?since=${lastSyncTime}`);
      if (!res.ok) {
        this.isPulling = false;
        return { success: false, pulledCount: 0 };
      }

      const data = await res.json();
      if (!data.updates) {
        this.isPulling = false;
        return { success: true, pulledCount: 0 };
      }

      let totalPulled = 0;
      const changedCollections: string[] = [];

      // 1. Process updates
      const tables: { key: string; table: any }[] = [
        { key: 'patients', table: db.patients },
        { key: 'prescriptions', table: db.prescriptions },
        { key: 'appointments', table: db.appointments },
        { key: 'payments', table: db.payments },
        { key: 'treatmentSessions', table: db.treatmentSessions },
        { key: 'employees', table: db.employees },
        { key: 'drugs', table: db.drugs },
        { key: 'templates', table: db.templates },
        { key: 'materials', table: db.materials },
        { key: 'stockEntries', table: db.stockEntries },
        { key: 'materialUsages', table: db.materialUsages },
        { key: 'expenses', table: db.expenses },
      ];

      for (const { key, table } of tables) {
        const records = data.updates[key];
        if (records && records.length > 0) {
          await table.bulkPut(records);
          totalPulled += records.length;
          changedCollections.push(key);
        }
      }

      if (data.updates.settings?.length) {
        for (const s of data.updates.settings) {
          await db.settings.put(s);
        }
        changedCollections.push('settings');
      }

      // 2. Process deletions using server's allIds list
      if (data.allIds) {
        const pendingItems = await db.syncQueue.where('status').equals('PENDING').toArray();
        const pendingDocIds = new Set(pendingItems.map((item) => item.documentId));

        for (const { key, table } of tables) {
          const serverIdList = data.allIds[key];
          if (Array.isArray(serverIdList)) {
            const serverIdSet = new Set(serverIdList);
            const localRecords = await table.toArray();
            const staleLocalIds: string[] = [];

            for (const item of localRecords) {
              if (item.id && !serverIdSet.has(item.id) && !pendingDocIds.has(item.id)) {
                staleLocalIds.push(item.id);
              }
            }

            if (staleLocalIds.length > 0) {
              await table.bulkDelete(staleLocalIds);
              changedCollections.push(key);
            }
          }
        }
      }

      // Update settings lastSyncedAt
      if (data.pulledAt) {
        await db.settings.update('default_settings', {
          lastSyncedAt: data.pulledAt,
        }).catch(() => {});
      }

      if (changedCollections.length > 0) {
        this.notifyDataChange(changedCollections);
      }

      this.isPulling = false;
      return { success: true, pulledCount: totalPulled };
    } catch (e: any) {
      this.isPulling = false;
      return { success: false, pulledCount: 0 };
    }
  }
}

export const syncEngine = new SyncEngine();

