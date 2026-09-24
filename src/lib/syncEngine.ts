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

      // Initial auto-pull, admin sync, and trigger on startup
      setTimeout(async () => {
        if (navigator.onLine) {
          await this.ensureAdminSynced();
          this.pullUpdates().catch(() => {});
          this.triggerSync().catch(() => {});
        }
      }, 1500);

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

    // If online, immediately try to sync to MongoDB
    if (navigator.onLine) {
      this.triggerSync();
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

      // Mark synchronized items as completed by deleting from queue
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
        message: `Successfully synced ${pendingItems.length} records to MongoDB Atlas!`,
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

  /**
   * Pulls latest updates from MongoDB to local Dexie cache
   */
  public async pullUpdates(): Promise<{ success: boolean; pulledCount: number }> {
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
      if (!res.ok) return { success: false, pulledCount: 0 };

      const data = await res.json();
      if (!data.updates) return { success: true, pulledCount: 0 };

      let totalPulled = 0;

      if (data.updates.patients?.length) {
        await db.patients.bulkPut(data.updates.patients);
        totalPulled += data.updates.patients.length;
      }
      if (data.updates.prescriptions?.length) {
        await db.prescriptions.bulkPut(data.updates.prescriptions);
        totalPulled += data.updates.prescriptions.length;
      }
      if (data.updates.appointments?.length) {
        await db.appointments.bulkPut(data.updates.appointments);
        totalPulled += data.updates.appointments.length;
      }
      if (data.updates.payments?.length) {
        await db.payments.bulkPut(data.updates.payments);
        totalPulled += data.updates.payments.length;
      }
      if (data.updates.treatmentSessions?.length) {
        await db.treatmentSessions.bulkPut(data.updates.treatmentSessions);
        totalPulled += data.updates.treatmentSessions.length;
      }
      if (data.updates.employees?.length) {
        await db.employees.bulkPut(data.updates.employees);
        totalPulled += data.updates.employees.length;
      }
      if (data.updates.drugs?.length) {
        await db.drugs.bulkPut(data.updates.drugs);
        totalPulled += data.updates.drugs.length;
      }
      if (data.updates.templates?.length) {
        await db.templates.bulkPut(data.updates.templates);
        totalPulled += data.updates.templates.length;
      }
      if (data.updates.materials?.length) {
        await db.materials.bulkPut(data.updates.materials);
        totalPulled += data.updates.materials.length;
      }
      if (data.updates.expenses?.length) {
        await db.expenses.bulkPut(data.updates.expenses);
        totalPulled += data.updates.expenses.length;
      }
      if (data.updates.settings?.length) {
        for (const s of data.updates.settings) {
          await db.settings.put(s);
        }
      }

      if (totalPulled > 0) {
        console.log(`📥 Ingested ${totalPulled} updated records from MongoDB into local cache.`);
      }

      return { success: true, pulledCount: totalPulled };
    } catch (e: any) {
      console.warn('Pull updates skipped or failed:', e.message);
      return { success: false, pulledCount: 0 };
    }
  }
}

export const syncEngine = new SyncEngine();

