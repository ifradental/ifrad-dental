import { db, type ActivityLog } from './db';
import { syncEngine } from './syncEngine';

export interface LogActivityParams {
  action: string;
  module: 'Auth' | 'Prescription' | 'Patient' | 'Appointment' | 'Payment' | 'Material' | 'Employee' | 'Settings' | 'Template' | 'System';
  description: string;
  metadata?: Record<string, any>;
  user?: {
    employeeId?: string;
    username?: string;
    name?: string;
    role?: string;
  };
}

/**
 * Centrally records an employee activity to local Dexie database and syncs with cloud MongoDB.
 */
export async function logActivity(params: LogActivityParams): Promise<ActivityLog | null> {
  if (typeof window === 'undefined') return null;

  try {
    let userName = params.user?.name || '';
    let userRole = params.user?.role || '';
    let userId = params.user?.employeeId || params.user?.username || '';

    // If user info is not explicitly supplied, extract from stored session
    if (!userName || !userRole) {
      try {
        const stored = localStorage.getItem('dentist_pro_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!userName) userName = parsed.name || parsed.username || 'Unknown User';
          if (!userRole) userRole = parsed.role || 'Staff';
          if (!userId) userId = parsed.employeeId || parsed.username || '';
        }
      } catch {
        // fallback
      }
    }

    if (!userName) userName = 'System Admin';
    if (!userRole) userRole = 'Admin';

    const now = new Date().toISOString();
    const id = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const logEntry: ActivityLog = {
      id,
      userId: userId || undefined,
      userName,
      userRole,
      action: params.action,
      module: params.module,
      description: params.description,
      metadata: params.metadata || {},
      timestamp: now,
      createdAt: now,
    };

    await db.activityLogs.put(logEntry);
    await syncEngine.logMutation('activityLogs', 'INSERT', logEntry.id, logEntry);

    return logEntry;
  } catch (err) {
    console.warn('Failed to log activity:', err);
    return null;
  }
}
