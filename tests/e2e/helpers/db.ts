import { Pool } from 'pg';
import path from 'path';
import dotenv from 'dotenv';
import {
  trackCreatedUser,
  untrackUser,
  getTrackedEntities,
  clearTrackedFile,
} from './tracker';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  database: process.env.POSTGRES_DB || 'subscriptions',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
});

export { trackCreatedUser, untrackUser, getTrackedEntities };

export async function getUserByEmail(email: string) {
  const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  return result.rows[0] || null;
}

export async function getUserById(userId: number) {
  const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
  return result.rows[0] || null;
}

export async function countUsersByEmail(email: string): Promise<number> {
  const result = await pool.query('SELECT COUNT(*) FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  return Number(result.rows[0].count);
}

export async function deleteUserById(userId: number) {
  await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
  untrackUser(userId, null);
}

export async function deleteUserByEmail(email: string) {
  await pool.query('DELETE FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  untrackUser(null, email);
}

export async function countSubscriptionsByUserEmail(email: string, name?: string): Promise<number> {
  if (name) {
    const result = await pool.query(
      `SELECT COUNT(*) FROM subscriptions s
       JOIN users u ON s.user_id = u.user_id
       WHERE LOWER(u.email) = LOWER($1) AND s.name = $2`,
      [email, name]
    );
    return Number(result.rows[0].count);
  }
  const result = await pool.query(
    `SELECT COUNT(*) FROM subscriptions s
     JOIN users u ON s.user_id = u.user_id
     WHERE LOWER(u.email) = LOWER($1)`,
    [email]
  );
  return Number(result.rows[0].count);
}

export async function getSubscriptionById(subscriptionId: number) {
  const result = await pool.query('SELECT * FROM subscriptions WHERE subscription_id = $1', [subscriptionId]);
  return result.rows[0] || null;
}

export async function createSubscriptionInDb({
  userId,
  categoryId = 1,
  name,
  amount = 500,
  currency = 'RUB',
  period = 'MONTHLY',
  status = 'ACTIVE',
  nextPaymentDate = '2026-12-01',
}: {
  userId: number;
  categoryId?: number;
  name: string;
  amount?: number;
  currency?: string;
  period?: string;
  status?: string;
  nextPaymentDate?: string;
}) {
  const result = await pool.query(
    `INSERT INTO subscriptions (user_id, category_id, name, amount, currency, period, status, next_payment_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [userId, categoryId, name, amount, currency, period, status, nextPaymentDate]
  );
  return result.rows[0];
}

export async function deleteSubscriptionsByUserEmail(email: string) {
  await pool.query(
    `DELETE FROM subscriptions WHERE user_id IN (SELECT user_id FROM users WHERE LOWER(email) = LOWER($1))`,
    [email]
  );
}

export async function deleteTrackedUsers(): Promise<number> {
  const { userIds, emails } = getTrackedEntities();
  if (userIds.length === 0 && emails.length === 0) {
    return 0;
  }

  let count = 0;
  if (userIds.length > 0) {
    const res = await pool.query('DELETE FROM users WHERE user_id = ANY($1::bigint[])', [userIds]);
    count += res.rowCount ?? 0;
  }
  if (emails.length > 0) {
    const res = await pool.query('DELETE FROM users WHERE LOWER(email) = ANY($1::text[])', [emails]);
    count += res.rowCount ?? 0;
  }

  clearTrackedFile();
  return count;
}

export async function cleanAllTestUsers(): Promise<number> {
  return await deleteTrackedUsers();
}

export async function closeDbPool() {
  await pool.end();
}
