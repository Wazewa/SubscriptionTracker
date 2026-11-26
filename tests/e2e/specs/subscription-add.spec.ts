import { test, expect, Page } from '@playwright/test';
import {
  trackCreatedUser,
  deleteTrackedUsers,
  countSubscriptionsByUserEmail,
} from '../helpers/db';

const API_BASE = 'http://localhost:8080';

const USER = {
  email: 'sub_test_user@example.com',
  password: 'Password123!',
};

const today = new Date().toISOString().split('T')[0];
const futureDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
const pastDate = '2026-10-14';

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#email').fill(USER.email);
  await page.locator('#password').fill(USER.password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('Добавление подписки (Subscription Creation E2E)', () => {
  let authToken = '';

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
    trackCreatedUser(regBody.userId, USER.email);

    const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
      data: {
        email: USER.email,
        password: USER.password,
      },
    });
    expect(loginRes.status()).toBe(200);
    const body = await loginRes.json();
    authToken = body.token;
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test.afterAll(async () => {
    await deleteTrackedUsers();
    const count = await countSubscriptionsByUserEmail(USER.email);
    expect(count).toBe(0);
  });

  test('ID 1: Успешное добавление подписки (Яндекс.Музыка)', async ({ page }) => {
    await login(page);

    await page.goto('/subscriptions');
    await expect(page).toHaveURL(/\/subscriptions/);

    await page.getByRole('link', { name: 'Добавить подписку' }).click();
    await expect(page).toHaveURL(/\/subscriptions\/new/);

    await page.locator('#subscription-name').fill('Яндекс.Музыка');
    await page.locator('#subscription-price').fill('400');
    await page.locator('#subscription-period').selectOption('monthly');
    await page.locator('#subscription-date').fill(futureDate);
    await page.locator('#subscription-category').selectOption({ label: 'Музыка' });

    await page.getByRole('button', { name: 'Сохранить' }).click();

    await expect(page).toHaveURL(/\/subscriptions$/);
    await expect(page.getByText('Яндекс.Музыка')).toBeVisible();
  });

  test('ID 2: Добавление подписки с другой периодичностью (Кинопоиск, ежегодно)', async ({ page }) => {
    await login(page);
    await page.goto('/subscriptions/new');

    await page.locator('#subscription-name').fill('Кинопоиск');
    await page.locator('#subscription-price').fill('299');
    await page.locator('#subscription-period').selectOption('yearly');
    await page.locator('#subscription-date').fill(futureDate);
    await page.locator('#subscription-category').selectOption({ label: 'Развлечения' });

    await page.getByRole('button', { name: 'Сохранить' }).click();

    await expect(page).toHaveURL(/\/subscriptions$/);
    await expect(page.getByText('Кинопоиск')).toBeVisible();
  });

  test('ID 3: Добавление подписки с минимальной допустимой стоимостью (0,01)', async ({ page }) => {
    await login(page);
    await page.goto('/subscriptions/new');

    await page.locator('#subscription-name').fill('Тестовая подписка 0.01');
    await page.locator('#subscription-price').fill('0,01');
    await page.locator('#subscription-period').selectOption('monthly');
    await page.locator('#subscription-date').fill(futureDate);
    await page.locator('#subscription-category').selectOption({ label: 'Образование' });

    await page.getByRole('button', { name: 'Сохранить' }).click();

    await expect(page).toHaveURL(/\/subscriptions$/);
    await expect(page.getByText('Тестовая подписка 0.01')).toBeVisible();
  });

  test('ID 4: Добавление подписки с датой списания сегодня', async ({ page }) => {
    await login(page);
    await page.goto('/subscriptions/new');

    await page.locator('#subscription-name').fill('Яндекс.Музыка (Сегодня)');
    await page.locator('#subscription-price').fill('2000');
    await page.locator('#subscription-period').selectOption('monthly');
    await page.locator('#subscription-date').fill(today);
    await page.locator('#subscription-category').selectOption({ label: 'Образование' });

    await page.getByRole('button', { name: 'Сохранить' }).click();

    await expect(page).toHaveURL(/\/subscriptions$/);
    await expect(page.getByText('Яндекс.Музыка (Сегодня)')).toBeVisible();
  });

  test('ID 5: Добавление подписки с другой категорией (Образование)', async ({ page }) => {
    await login(page);
    await page.goto('/subscriptions/new');

    await page.locator('#subscription-name').fill('Онлайн-курс');
    await page.locator('#subscription-price').fill('1500');
    await page.locator('#subscription-period').selectOption('monthly');
    await page.locator('#subscription-date').fill(futureDate);
    await page.locator('#subscription-category').selectOption({ label: 'Образование' });

    await page.getByRole('button', { name: 'Сохранить' }).click();

    await expect(page).toHaveURL(/\/subscriptions$/);
    await expect(page.getByText('Онлайн-курс')).toBeVisible();
  });

  test('ID 6: Добавление подписки с главной панели (Дашборд)', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');

    await page.getByRole('link', { name: 'Добавить подписку' }).click();
    await expect(page).toHaveURL(/\/subscriptions\/new/);

    await page.locator('#subscription-name').fill('Подписка с Дашборда');
    await page.locator('#subscription-price').fill('650');
    await page.locator('#subscription-period').selectOption('monthly');
    await page.locator('#subscription-date').fill(futureDate);
    await page.locator('#subscription-category').selectOption({ label: 'Музыка' });

    await page.getByRole('button', { name: 'Сохранить' }).click();

    await expect(page).toHaveURL(/\/subscriptions$/);
    await expect(page.getByText('Подписка с Дашборда')).toBeVisible();
  });

  test('ID 7: Отмена добавления подписки', async ({ page }) => {
    await login(page);
    await page.goto('/subscriptions/new');

    await page.locator('#subscription-name').fill('Отменяемая подписка');
    await page.locator('#subscription-price').fill('999');

    await page.getByRole('button', { name: 'Отменить' }).click();

    await expect(page).toHaveURL(/\/subscriptions$/);
    await expect(page.getByText('Отменяемая подписка')).not.toBeVisible();
  });

  test('ID 8: Добавление без названия', async ({ page }) => {
    await login(page);
    await page.goto('/subscriptions/new');

    await page.locator('#subscription-name').fill('');
    await page.locator('#subscription-price').fill('500');
    await page.locator('#subscription-date').fill(futureDate);
    await page.locator('#subscription-category').selectOption({ label: 'Музыка' });

    await page.getByRole('button', { name: 'Сохранить' }).click();

    const nameError = page.locator('#name-error');
    await expect(nameError).toBeVisible();
    await expect(nameError).toContainText(/название/i);
    expect(page.url()).toContain('/subscriptions/new');
  });

  test('ID 9: Добавление с нулевой стоимостью', async ({ page }) => {
    await login(page);
    await page.goto('/subscriptions/new');

    await page.locator('#subscription-name').fill('Бесплатная подписка');
    await page.locator('#subscription-price').fill('0');
    await page.locator('#subscription-date').fill(futureDate);
    await page.locator('#subscription-category').selectOption({ label: 'Музыка' });

    await page.getByRole('button', { name: 'Сохранить' }).click();

    const priceError = page.locator('#price-error');
    await expect(priceError).toBeVisible();
    await expect(priceError).toContainText(/больше нуля/i);
    expect(page.url()).toContain('/subscriptions/new');
  });

  test('ID 10: Добавление с отрицательной стоимостью', async ({ page }) => {
    await login(page);
    await page.goto('/subscriptions/new');

    await page.locator('#subscription-name').fill('Отрицательная подписка');
    await page.locator('#subscription-price').fill('-100');
    await page.locator('#subscription-date').fill(futureDate);
    await page.locator('#subscription-category').selectOption({ label: 'Музыка' });

    await page.getByRole('button', { name: 'Сохранить' }).click();

    const priceError = page.locator('#price-error');
    await expect(priceError).toBeVisible();
    await expect(priceError).toContainText(/больше нуля/i);
    expect(page.url()).toContain('/subscriptions/new');
  });

  test('ID 11: Добавление без периода', async ({ page, request }) => {
    await login(page);
    await page.goto('/subscriptions/new');

    await page.locator('#subscription-name').fill('Без периода');
    await page.locator('#subscription-price').fill('300');
    await page.locator('#subscription-date').fill(futureDate);
    await page.locator('#subscription-category').selectOption({ label: 'Музыка' });

    await page.locator('#subscription-period').evaluate((select: HTMLSelectElement) => {
      const opt = document.createElement('option');
      opt.value = '';
      select.add(opt, 0);
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
      setter?.call(select, '');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await page.getByRole('button', { name: 'Сохранить' }).click();

    const periodError = page.locator('#period-error');
    await expect(periodError).toBeVisible();
    await expect(periodError).toContainText(/период/i);

    const apiRes = await request.post(`${API_BASE}/api/subscriptions`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: 'Без периода API',
        amount: 300,
        currency: 'RUB',
        period: null,
        nextPaymentDate: futureDate,
        categoryId: 1,
      },
    });
    expect(apiRes.status()).toBe(400);
  });

  test('ID 12: Добавление с датой в прошлом', async ({ page }) => {
    await login(page);
    await page.goto('/subscriptions/new');

    await page.locator('#subscription-name').fill('Прошлая дата');
    await page.locator('#subscription-price').fill('450');
    await page.locator('#subscription-date').fill(pastDate);
    await page.locator('#subscription-category').selectOption({ label: 'Музыка' });

    await page.getByRole('button', { name: 'Сохранить' }).click();

    const dateError = page.locator('#date-error');
    await expect(dateError).toBeVisible();
    await expect(dateError).toContainText(/Дата списания не может быть раньше/i);
    expect(page.url()).toContain('/subscriptions/new');
  });

  test('ID 13: Добавление без категории', async ({ page }) => {
    await login(page);
    await page.goto('/subscriptions/new');

    await page.locator('#subscription-name').fill('Без категории');
    await page.locator('#subscription-price').fill('450');
    await page.locator('#subscription-date').fill(futureDate);
    await page.locator('#subscription-category').selectOption('');

    await page.getByRole('button', { name: 'Сохранить' }).click();

    const categoryError = page.locator('#category-error');
    await expect(categoryError).toBeVisible();
    await expect(categoryError).toContainText(/категорию/i);
    expect(page.url()).toContain('/subscriptions/new');
  });

  test('ID 14: Добавление без авторизации', async ({ page, request }) => {
    await page.goto('/subscriptions/new');
    await expect(page).toHaveURL(/\/login/);

    const res = await request.post(`${API_BASE}/api/subscriptions`, {
      data: {
        name: 'Хакерская подписка',
        amount: 100,
        currency: 'RUB',
        period: 'MONTHLY',
        nextPaymentDate: futureDate,
        categoryId: 1,
      },
    });
    expect(res.status()).toBe(401);
  });

  test('ID 15: Ошибка сервера при сохранении (моделирование ошибки 500)', async ({ page }) => {
    await login(page);
    await page.goto('/subscriptions/new');

    await page.locator('#subscription-name').fill('Ошибка 500 Подписка');
    await page.locator('#subscription-price').fill('800');
    await page.locator('#subscription-date').fill(futureDate);
    await page.locator('#subscription-category').selectOption({ label: 'Музыка' });

    await page.route('**/api/subscriptions', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal Server Error' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.getByRole('button', { name: 'Сохранить' }).click();

    await expect(page.locator('text=Не удалось сохранить подписку')).toBeVisible();

    await expect(page.locator('#subscription-name')).toHaveValue('Ошибка 500 Подписка');
    await expect(page.locator('#subscription-price')).toHaveValue('800');
    expect(page.url()).toContain('/subscriptions/new');
  });

  test('ID 16: Повторное нажатие Сохранить (предотвращение дублирования)', async ({ page }) => {
    await login(page);
    await page.goto('/subscriptions/new');

    const subName = 'Защита от даблклика';
    await page.locator('#subscription-name').fill(subName);
    await page.locator('#subscription-price').fill('350');
    await page.locator('#subscription-date').fill(futureDate);
    await page.locator('#subscription-category').selectOption({ label: 'Музыка' });

    const saveButton = page.getByRole('button', { name: 'Сохранить' });

    await saveButton.dblclick();

    await expect(page).toHaveURL(/\/subscriptions$/);

    const countInDb = await countSubscriptionsByUserEmail(USER.email, subName);
    expect(countInDb).toBe(1);
  });
});
