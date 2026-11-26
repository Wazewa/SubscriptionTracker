import { test, expect } from '@playwright/test';
import {
  getUserByEmail,
  countUsersByEmail,
  trackCreatedUser,
  deleteTrackedUsers,
} from '../helpers/db';

const API_BASE = 'http://localhost:8080';

test.describe('Регистрация (Registration & Validation E2E)', () => {
  const UNIQUE_USER = {
    email: 'unique_user@example.com',
    password: 'securePassword123',
    confirmPassword: 'securePassword123',
    personalDataConsent: true,
  };

  const RACE_USER = {
    email: 'race_test@example.com',
    password: 'securePassword123',
    confirmPassword: 'securePassword123',
    personalDataConsent: true,
  };

  test.beforeAll(async () => {
    await deleteTrackedUsers();
  });

  test.afterAll(async () => {
    await deleteTrackedUsers();
    const countUnique = await countUsersByEmail(UNIQUE_USER.email);
    const countRace = await countUsersByEmail(RACE_USER.email);
    expect(countUnique).toBe(0);
    expect(countRace).toBe(0);
  });

  test('ID 1: Успешная регистрация', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/auth/register`, {
      data: UNIQUE_USER,
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('userId');
    expect(body.email.toLowerCase()).toBe(UNIQUE_USER.email.toLowerCase());

    trackCreatedUser(body.userId, UNIQUE_USER.email);

    const dbUser = await getUserByEmail(UNIQUE_USER.email);
    expect(dbUser).not.toBeNull();
    expect(dbUser.email.toLowerCase()).toBe(UNIQUE_USER.email.toLowerCase());
    expect(dbUser.status).toBe('PENDING');
  });

  test('ID 2: Регистрация существующего email', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/auth/register`, {
      data: UNIQUE_USER,
    });

    expect([400, 409]).toContain(response.status());

    const body = await response.json();
    expect(body.message).toContain('User with this email already exists');

    const count = await countUsersByEmail(UNIQUE_USER.email);
    expect(count).toBe(1);
  });

  test('ID 3: Некорректный формат email', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        email: 'not-an-email',
        password: 'securePassword123',
        confirmPassword: 'securePassword123',
        personalDataConsent: true,
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Email must be valid');
  });

  test('ID 4: Дублирование email при параллельной регистрации (Race condition)', async ({
    request,
  }) => {
    const [res1, res2] = await Promise.all([
      request.post(`${API_BASE}/api/auth/register`, { data: RACE_USER }),
      request.post(`${API_BASE}/api/auth/register`, { data: RACE_USER }),
    ]);

    const statuses = [res1.status(), res2.status()];

    expect(statuses).toContain(201);
    const conflictStatus = statuses.find((s) => s !== 201);
    expect([400, 409]).toContain(conflictStatus);

    const count = await countUsersByEmail(RACE_USER.email);
    expect(count).toBe(1);

    const successRes = res1.status() === 201 ? res1 : res2;
    const body = await successRes.json();
    trackCreatedUser(body.userId, RACE_USER.email);
  });

  test('ID 5: Слишком короткий пароль', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        email: 'short_pass_test@example.com',
        password: 'short',
        confirmPassword: 'short',
        personalDataConsent: true,
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Password must contain at least 8 characters');

    const dbUser = await getUserByEmail('short_pass_test@example.com');
    expect(dbUser).toBeNull();
  });

  test('ID 6: Отсутствие согласия на обработку персональных данных', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        email: 'constet_test@example.com',
        password: 'securePassword123',
        confirmPassword: 'securePassword123',
        personalDataConsent: false,
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Consent to personal data processing is required');

    const dbUser = await getUserByEmail('constet_test@example.com');
    expect(dbUser).toBeNull();
  });
});
