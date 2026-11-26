import { test, expect, Page, APIRequestContext } from '@playwright/test';
import {
  trackCreatedUser,
  deleteTrackedUsers,
  getSubscriptionById,
  countSubscriptionsByUserEmail,
  createSubscriptionInDb,
} from '../helpers/db';

const API_BASE = 'http://localhost:8080';

const USER = {
  email: 'sub_del_test_user@example.com',
  password: 'Password123!',
};

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#email').fill(USER.email);
  await page.locator('#password').fill(USER.password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function createSubViaApi(
  request: APIRequestContext,
  token: string,
  name: string,
  amount = 400,
  period = 'MONTHLY',
  nextPaymentDate = '2026-12-01',
  categoryId = 1
) {
  const res = await request.post(`${API_BASE}/api/subscriptions`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name,
      amount,
      currency: 'RUB',
      period,
      nextPaymentDate,
      categoryId,
    },
  });
  expect(res.status()).toBe(201);
  return await res.json();
}

test.describe('Удаление подписки (Subscription Deletion E2E)', () => {
  let authToken = '';
  let testUserId: number;

  test.beforeAll(async ({ request }) => {
    await deleteTrackedUsers();

    const registerRes = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        email: USER.email,
        password: USER.password,
        confirmPassword: USER.password,
        personalDataConsent: true,
      },
    });
    expect(registerRes.status()).toBe(201);
    const regBody = await registerRes.json();
    testUserId = regBody.userId;
    trackCreatedUser(testUserId, USER.email);

    const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
      data: {
        email: USER.email,
        password: USER.password,
      },
    });
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    authToken = loginBody.token;
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test.afterAll(async () => {
    await deleteTrackedUsers();
    const count = await countSubscriptionsByUserEmail(USER.email);
    expect(count).toBe(0);
  });

  test('ID 1: Успешное удаление подписки', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Яндекс.Музыка', 400);

    await login(page);
    await page.goto('/subscriptions');
    await expect(page).toHaveURL(/\/subscriptions$/);

    await expect(page.getByText('Яндекс.Музыка')).toBeVisible();

    await page.getByRole('button', { name: `Действия для подписки ${sub.name}` }).click();
    await page.getByRole('button', { name: 'Удалить' }).click();

    const dialog = page.locator('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Удалить' }).click();

    await expect(page.getByText('Подписка удалена')).toBeVisible();
    await expect(page.getByText('Яндекс.Музыка')).toBeHidden();

    const subInDb = await getSubscriptionById(sub.id);
    expect(subInDb).toBeNull();
  });

  test('ID 2: Удаление подписки после подтверждения', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Кинопоиск', 299);

    await login(page);
    await page.goto('/subscriptions');
    await expect(page.getByText('Кинопоиск')).toBeVisible();

    await page.getByRole('button', { name: `Действия для подписки ${sub.name}` }).click();
    await page.getByRole('button', { name: 'Удалить' }).click();

    const dialog = page.locator('dialog');
    await expect(dialog).toBeVisible();

    const subBeforeConfirm = await getSubscriptionById(sub.id);
    expect(subBeforeConfirm).not.toBeNull();

    await dialog.getByRole('button', { name: 'Удалить' }).click();
    await expect(dialog).toBeHidden();

    const subAfterConfirm = await getSubscriptionById(sub.id);
    expect(subAfterConfirm).toBeNull();
  });

  test('ID 3: Проверка списка после удаления (Пользователь с двумя подписками)', async ({
    page,
    request,
  }) => {
    const sub1 = await createSubViaApi(request, authToken, 'Подписка 1 (Музыка)', 300);
    const sub2 = await createSubViaApi(request, authToken, 'Подписка 2 (Кино)', 500);

    await login(page);
    await page.goto('/subscriptions');

    await expect(page.getByText('Подписка 1 (Музыка)')).toBeVisible();
    await expect(page.getByText('Подписка 2 (Кино)')).toBeVisible();

    await page.getByRole('button', { name: `Действия для подписки ${sub1.name}` }).click();
    await page.getByRole('button', { name: 'Удалить' }).click();
    await page.locator('dialog').getByRole('button', { name: 'Удалить' }).click();

    await expect(page.getByText('Подписка удалена')).toBeVisible();

    await expect(page.getByText('Подписка 1 (Музыка)')).toBeHidden();
    await expect(page.getByText('Подписка 2 (Кино)')).toBeVisible();

    expect(await getSubscriptionById(sub1.id)).toBeNull();
    expect(await getSubscriptionById(sub2.id)).not.toBeNull();
  });

  test('ID 4: Проверка статуса после удаления', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Статус Подписка', 199);

    await login(page);
    await page.goto('/subscriptions');
    await expect(page.getByText('Статус Подписка')).toBeVisible();

    await page.getByRole('button', { name: `Действия для подписки ${sub.name}` }).click();
    await page.getByRole('button', { name: 'Удалить' }).click();
    await page.locator('dialog').getByRole('button', { name: 'Удалить' }).click();
    await expect(page.getByText('Подписка удалена')).toBeVisible();

    await page.reload();

    await expect(page.getByText('Статус Подписка')).toBeHidden();
    expect(await getSubscriptionById(sub.id)).toBeNull();
  });

  test('ID 5: Отмена удаления', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Безопасная подписка', 450);

    await login(page);
    await page.goto('/subscriptions');
    await expect(page.getByText('Безопасная подписка')).toBeVisible();

    await page.getByRole('button', { name: `Действия для подписки ${sub.name}` }).click();
    await page.getByRole('button', { name: 'Удалить' }).click();

    const dialog = page.locator('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Отмена' }).click();
    await expect(dialog).toBeHidden();

    await expect(page.getByText('Безопасная подписка')).toBeVisible();
    const subInDb = await getSubscriptionById(sub.id);
    expect(subInDb).not.toBeNull();
  });

  test('ID 6: Удаление без авторизации', async ({ request }) => {
    const sub = await createSubViaApi(request, authToken, 'Подписка без auth', 100);

    const response = await request.delete(`${API_BASE}/api/subscriptions/${sub.id}`);

    expect([401, 403]).toContain(response.status());

    const subInDb = await getSubscriptionById(sub.id);
    expect(subInDb).not.toBeNull();
  });

  test('ID 7: Удаление чужой подписки', async ({ request }) => {
    const otherEmail = `other_user_${Date.now()}@example.com`;
    const regRes = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        email: otherEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        personalDataConsent: true,
      },
    });
    expect(regRes.status()).toBe(201);
    const otherUser = await regRes.json();
    trackCreatedUser(otherUser.userId, otherEmail);

    const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
      data: { email: otherEmail, password: 'Password123!' },
    });
    const otherToken = (await loginRes.json()).token;
    const otherSub = await createSubViaApi(request, otherToken, 'Чужая подписка', 999);

    const delResponse = await request.delete(`${API_BASE}/api/subscriptions/${otherSub.id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect([403, 404]).toContain(delResponse.status());

    const subInDb = await getSubscriptionById(otherSub.id);
    expect(subInDb).not.toBeNull();
    expect(subInDb.name).toBe('Чужая подписка');
  });

  test('ID 8: Удаление несуществующей подписки', async ({ request }) => {
    const nonExistentId = 99999999;
    const response = await request.delete(`${API_BASE}/api/subscriptions/${nonExistentId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status()).toBe(404);
  });

  test('ID 9: Повторное удаление подписки', async ({ request }) => {
    const sub = await createSubViaApi(request, authToken, 'Подписка на повторное удаление', 250);

    const res1 = await request.delete(`${API_BASE}/api/subscriptions/${sub.id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res1.status()).toBe(204);

    const res2 = await request.delete(`${API_BASE}/api/subscriptions/${sub.id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res2.status()).toBe(404);
  });

  test('ID 10: Ошибка сервера при удалении (моделирование ошибки 500)', async ({
    page,
    request,
  }) => {
    const sub = await createSubViaApi(request, authToken, 'Ошибка 500 подписка', 600);

    await login(page);
    await page.goto('/subscriptions');
    await expect(page.getByText('Ошибка 500 подписка')).toBeVisible();

    await page.route(`**/api/subscriptions/${sub.id}`, (route) => {
      if (route.request().method() === 'DELETE') {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal Server Error' }),
        });
      }
      return route.continue();
    });

    await page.getByRole('button', { name: `Действия для подписки ${sub.name}` }).click();
    await page.getByRole('button', { name: 'Удалить' }).click();

    const dialog = page.locator('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Удалить' }).click();

    await expect(page.getByText(/Не удалось удалить подписку/i)).toBeVisible();

    await dialog.getByRole('button', { name: 'Отмена' }).click();

    await expect(page.getByText('Ошибка 500 подписка')).toBeVisible();
    const subInDb = await getSubscriptionById(sub.id);
    expect(subInDb).not.toBeNull();
  });

  test('ID 11: Отправка запроса без ID подписки', async ({ request }) => {
    const countBefore = await countSubscriptionsByUserEmail(USER.email);

    const response = await request.delete(`${API_BASE}/api/subscriptions`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect([400, 404, 405, 500]).toContain(response.status());

    const countAfter = await countSubscriptionsByUserEmail(USER.email);
    expect(countAfter).toBe(countBefore);
  });

  test('ID 12: Удаление подписки с истёкшим сроком действия', async ({ request }) => {
    const expiredSub = await createSubscriptionInDb({
      userId: testUserId,
      name: 'Истёкшая подписка',
      amount: 150,
      currency: 'RUB',
      period: 'MONTHLY',
      status: 'EXPIRED',
      nextPaymentDate: '2026-01-01',
    });
    expect(expiredSub).not.toBeNull();

    const response = await request.delete(
      `${API_BASE}/api/subscriptions/${expiredSub.subscription_id}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    expect(response.status()).toBe(204);

    const subInDb = await getSubscriptionById(expiredSub.subscription_id);
    expect(subInDb).toBeNull();
  });
});
