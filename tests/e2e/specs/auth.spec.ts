import { test, expect } from '@playwright/test';
import jwt from 'jsonwebtoken';
import {
  getUserByEmail,
  deleteUserById,
  trackCreatedUser,
  deleteTrackedUsers,
} from '../helpers/db';

const TEST_USER = {
  email: 'ivanov@gmail.com',
  password: 'Password123!',
};

const API_BASE = 'http://localhost:8080';
const JWT_SECRET =
  process.env.JWT_SECRET ||
  'super-secret-jwt-key-for-e2e-testing-purposes-123456789012345678901234567890';

test.describe('Авторизация (Authentication & JWT E2E)', () => {
  let validJwtToken = '';
  let testUserId: number | null = null;

  test.beforeAll(async ({ request }) => {
    await deleteTrackedUsers();

    const registerResponse = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password,
        confirmPassword: TEST_USER.password,
        personalDataConsent: true,
      },
    });
    expect(registerResponse.status()).toBe(201);
    const regData = await registerResponse.json();
    testUserId = regData.userId;
    trackCreatedUser(testUserId, TEST_USER.email);

    const dbUser = await getUserByEmail(TEST_USER.email);
    expect(dbUser).not.toBeNull();
    expect(dbUser.email.toLowerCase()).toBe(TEST_USER.email.toLowerCase());
  });

  test.afterAll(async () => {
    if (testUserId) {
      await deleteUserById(testUserId);
    }
    const dbUser = await getUserByEmail(TEST_USER.email);
    expect(dbUser).toBeNull();
  });

  test('ID 1: Успешная авторизация пользователя и редирект на /dashboard', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Вход в систему' })).toBeVisible();

    await page.locator('#email').fill(TEST_USER.email);
    await page.locator('#password').fill(TEST_USER.password);

    await page.getByRole('button', { name: 'Войти' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Добавить подписку')).toBeVisible();
  });

  test('ID 2: Проверка JWT после авторизации (структура и полезная нагрузка)', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill(TEST_USER.email);
    await page.locator('#password').fill(TEST_USER.password);

    const loginResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/auth/login') && resp.status() === 200
    );
    await page.getByRole('button', { name: 'Войти' }).click();

    const loginResponse = await loginResponsePromise;
    const responseData = await loginResponse.json();

    expect(responseData).toHaveProperty('token');
    validJwtToken = responseData.token;

    await expect(page).toHaveURL(/\/dashboard/);
    const storedToken = await page.evaluate(() =>
      sessionStorage.getItem('subscription-tracker.token')
    );
    expect(storedToken).toBe(validJwtToken);

    const tokenParts = validJwtToken.split('.');
    expect(tokenParts).toHaveLength(3);

    const payloadJson = Buffer.from(tokenParts[1], 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson);

    expect(payload.sub).toBe(TEST_USER.email);
    expect(payload).toHaveProperty('userId');
    expect(payload).toHaveProperty('tv');
    expect(payload).toHaveProperty('iat');
    expect(payload).toHaveProperty('exp');
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  test('ID 3: Доступ к защищённому API с действующим JWT', async ({ request }) => {
    expect(validJwtToken).toBeTruthy();

    const response = await request.get(`${API_BASE}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${validJwtToken}`,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.email.toLowerCase()).toBe(TEST_USER.email.toLowerCase());
    expect(body.userId).toBe(testUserId);
    expect(body).toHaveProperty('status');
  });

  test('ID 4: Неверный пароль', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#email').fill(TEST_USER.email);
    await page.locator('#password').fill('WrongPassword123!');

    await page.getByRole('button', { name: 'Войти' }).click();

    const alert = page.locator('p[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/Неверный email или пароль|Ошибка/i);
    expect(page.url()).toContain('/login');
  });

  test('ID 5: Несуществующий email', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#email').fill('unknown@gmail.com');
    await page.locator('#password').fill('SomePassword123!');

    await page.getByRole('button', { name: 'Войти' }).click();

    const alert = page.locator('p[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/Неверный email или пароль|Ошибка/i);
    expect(page.url()).toContain('/login');
  });

  test('ID 6: Пустой email (клиентская валидация формы)', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#email').fill('');
    await page.locator('#password').fill(TEST_USER.password);

    await page.getByRole('button', { name: 'Войти' }).click();

    const emailInput = page.locator('#email');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
    expect(isInvalid).toBe(true);

    expect(page.url()).toContain('/login');
  });

  test('ID 7: Пустой пароль (клиентская валидация формы)', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#email').fill(TEST_USER.email);
    await page.locator('#password').fill('');

    await page.getByRole('button', { name: 'Войти' }).click();

    const passwordInput = page.locator('#password');
    const isInvalid = await passwordInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
    expect(isInvalid).toBe(true);

    expect(page.url()).toContain('/login');
  });

  test('ID 8: Некорректный формат email', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#email').fill('ivanov.gmail.com');
    await page.locator('#password').fill(TEST_USER.password);

    await page.getByRole('button', { name: 'Войти' }).click();

    const emailInput = page.locator('#email');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
    expect(isInvalid).toBe(true);

    expect(page.url()).toContain('/login');
  });

  test('ID 9: Отсутствующий JWT (запрос без токена к защищённому API)', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/auth/me`);
    expect(response.status()).toBe(401);
  });

  test('ID 10: Некорректный JWT', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/auth/me`, {
      headers: {
        Authorization: 'Bearer invalid.token.value',
      },
    });

    expect(response.status()).toBe(401);
  });

  test('ID 11: Просроченный JWT', async ({ request }) => {
    const expiredToken = jwt.sign(
      {
        sub: TEST_USER.email,
        userId: testUserId || 1,
        tv: 0,
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600,
      },
      JWT_SECRET,
      { algorithm: 'HS512' }
    );

    const response = await request.get(`${API_BASE}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${expiredToken}`,
      },
    });

    expect(response.status()).toBe(401);
  });

  test('ID 12: Изменённый JWT (нарушенная подпись)', async ({ request }) => {
    expect(validJwtToken).toBeTruthy();

    const parts = validJwtToken.split('.');
    const tamperedSignature = parts[2].substring(0, parts[2].length - 8) + 'TAMPERED';
    const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSignature}`;

    const response = await request.get(`${API_BASE}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${tamperedToken}`,
      },
    });

    expect(response.status()).toBe(401);
  });
});
