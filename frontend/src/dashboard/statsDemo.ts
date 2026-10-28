import { localDateKey } from './model';
import type { DashboardStats } from './statsModel';

// Synthetic, intentionally different sums. Never used for a real session.
export function createDemoDashboardStats(empty = false, now = new Date()): DashboardStats {
  return {
    month: localDateKey(now).slice(0, 7), currency: 'RUB',
    monthlyEquivalentMinor: empty ? 0 : 320000,
    scheduledChargesMinor: empty ? 0 : 376000,
  };
}
