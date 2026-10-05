import { db, type SyncQueueItem } from './db';

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';

class SyncEngine {
  private status: SyncStatus = 'offline';
  private listeners: ((status: SyncStatus, pendingCount: number) => void)[] = [];
  private dataListeners: ((collections?: string[]) => void)[] = [];
  private syncTimer: NodeJS.Timeout | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private isPulling = false;
  private lastPullTime = 0;
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
              this.schedulePullUpdates(1000);
            }
          };
        } catch (e) {
          console.warn('BroadcastChannel notice:', e);
        }
      }

      // Listen to cross-tab localStorage events as fallback
      window.addEventListener('storage', (e) => {
        if (e.key === 'ifrad_last_sync_broadcast') {
          this.schedulePullUpdates(1000);
        }
      });

      // Pull updates throttled when tab gains focus or becomes visible
      window.addEventListener('focus', () => {
        if (navigator.onLine && Date.now() - this.lastPullTime > 15000) {
          this.schedulePullUpdates(500);
        }
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine && Date.now() - this.lastPullTime > 15000) {
          this.schedulePullUpdates(500);
        }
      });

      // Initial auto-pull on startup after 1s
      setTimeout(async () => {
        if (navigator.onLine) {
          this.pullUpdates().catch(() => {});
          this.scheduleSync(1500);
        }
      }, 1000);

      // Periodic background fallback sync every 60 seconds (lightweight)
      this.syncTimer = setInterval(() => {
        if (navigator.onLine && !this.isSyncing) {
          this.scheduleSync(100);
        }
      }, 60000);
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
    try {
      const pendingCount = await db.syncQueue.where('status').equals('PENDING').count();
      this.listeners.forEach((cb) => cb(this.status, pendingCount));
    } catch (_) {}
  }

  private async handleOnlineStatusChange(isOnline: boolean) {
    this.status = isOnline ? 'online' : 'offline';
    await this.notify();
    if (isOnline) {
      this.schedulePullUpdates(500);
      this.scheduleSync(1000);
    }
  }

  public scheduleSync(delayMs = 800) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.triggerSync().catch(() => {});
    }, delayMs);
  }

  public schedulePullUpdates(delayMs = 800) {
    setTimeout(() => {
      if (Date.now() - this.lastPullTime > 5000) {
        this.pullUpdates().catch(() => {});
      }
    }, delayMs);
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

    // Debounced trigger to batch rapid changes together without stalling the browser
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.scheduleSync(800);
    }
  }

  /**
   * Pushes pending mutations to MongoDB via Next.js API /api/sync/push
   */
  public async triggerSync(): Promise<{ success: boolean; syncedCount: number; message: string }> {
    if (this.isSyncing) return { success: true, syncedCount: 0, message: 'Sync in progress' };

    const pendingItems = await db.syncQueue
      .where('status')
      .equals('PENDING')
      .limit(50)
      .toArray();

    if (pendingItems.length === 0) {
      this.status = navigator.onLine ? 'online' : 'offline';
      await this.notify();
      return { success: true, syncedCount: 0, message: 'All data is up to date in MongoDB' };
    }

    this.isSyncing = true;
    this.status = 'syncing';
    await this.notify();

    try {
      const settings = await db.settings.get('default_settings');
      const syncUrl =
        settings?.cloudSyncUrl && !settings.cloudSyncUrl.includes('localhost:5000')
          ? settings.cloudSyncUrl
          : '/api/sync';
      const apiKey = settings?.cloudSyncApiKey || 'DENTIST_SECRET_KEY_2026';

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
      }).catch((err) => {
        throw new Error(err?.message || 'Network offline or server unreachable');
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
        }).catch(() => {});
      }

      this.status = 'online';
      this.isSyncing = false;
      await this.notify();

      // Check if there are remaining pending items in queue
      const remainingCount = await db.syncQueue.where('status').equals('PENDING').count();
      if (remainingCount > 0) {
        this.scheduleSync(500);
      }

      return {
        success: true,
        syncedCount: queueIdsToDelete.length,
        message: `Successfully synced ${queueIdsToDelete.length} records to MongoDB Atlas!`,
      };
    } catch (error: any) {
      this.status = typeof navigator !== 'undefined' && navigator.onLine ? 'error' : 'offline';
      this.isSyncing = false;
      await this.notify();

      return {
        success: false,
        syncedCount: 0,
        message: `Saved locally. Syncing will resume automatically: ${error.message}`,
      };
    }
  }

  /**
   * Pulls latest updates from MongoDB to local Dexie cache and prunes deleted records
   */
  public async pullUpdates(): Promise<{ success: boolean; pulledCount: number }> {
    if (this.isPulling) return { success: true, pulledCount: 0 };
    this.isPulling = true;
    this.lastPullTime = Date.now();

    try {
      const settings = await db.settings.get('default_settings');
      const syncUrl =
        settings?.cloudSyncUrl && !settings.cloudSyncUrl.includes('localhost:5000')
          ? settings.cloudSyncUrl
          : '/api/sync';

      const lastSyncTime = settings?.lastSyncedAt
        ? new Date(settings.lastSyncedAt).getTime()
        : 0;

      const res = await fetch(`${syncUrl}/pull?since=${lastSyncTime}`).catch(() => null);
      if (!res || !res.ok) {
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

      // Process updates in fast batches
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
        { key: 'cashSubmissions', table: db.cashSubmissions },
        { key: 'activityLogs', table: db.activityLogs },
        { key: 'marketingReports', table: db.marketingReports },
        { key: 'marketingTasks', table: db.marketingTasks },
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
