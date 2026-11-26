import { deleteTrackedUsers, closeDbPool } from './helpers/db';

async function globalTeardown() {
  console.log('[globalTeardown] Cleaning up tracked test users from database...');
  try {
    const deletedCount = await deleteTrackedUsers();
    console.log(`[globalTeardown] Cleaned ${deletedCount} tracked test entities.`);
  } catch (err) {
    console.error('[globalTeardown] Failed to clean test users:', err);
  } finally {
    await closeDbPool();
  }
}

export default globalTeardown;
