import { test, expect, Page, APIRequestContext } from '@playwright/test';
import {
  trackCreatedUser,
  deleteTrackedUsers,
  countSubscriptionsByUserEmail,
} from '../helpers/db';

const API_BASE = 'http://localhost:8080';

const USER = {
  email: 'sub_list_user@example.com',
  password: 'Password123!',
};

const futureDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
const futureFormatted = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}).format(new Date(`${futureDate}T12:00:00`));

async function login(page: Page, email: string = USER.email, password: string = USER.password) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function createSubViaApi(
  request: APIRequestContext,
  token: string,
  name: string,
  amount = 400,
  period = 'MONTHLY',
  nextPaymentDate = futureDate,
  categoryId = 5
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

test.describe('Просмотр подписок (Subscription Listing & Filters E2E)', () => {
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

  test('ID 1: Успешный просмотр списка подписок', async ({ page, request }) => {
    await createSubViaApi(request, authToken, 'Яндекс Плюс', 299);

    await login(page);

    await page.getByRole('link', { name: 'Подписки' }).click();
    await expect(page).toHaveURL(/\/subscriptions$/);

    await expect(page.getByRole('region', { name: /Таблица подписок/i })).toBeVisible();
    await expect(page.getByText('Яндекс Плюс')).toBeVisible();
  });

  test('ID 2: Проверка отображения данных подписки', async ({ page, request }) => {
    await createSubViaApi(request, authToken, 'Яндекс Музыка', 400, 'MONTHLY', futureDate, 5);

    await login(page);
    await page.goto('/subscriptions');

    const row = page.getByRole('row', { name: /Яндекс Музыка/i });
    await expect(row).toBeVisible();

    await expect(row).toContainText('Яндекс Музыка');
    await expect(row).toContainText(/400/);
    await expect(row).toContainText('Музыка');
    await expect(row).toContainText(futureFormatted);
    await expect(row).toContainText('Активна');
  });

  test('ID 3: Просмотр списка с несколькими подписками', async ({ page, request }) => {
    await createSubViaApi(request, authToken, 'Spotify', 350, 'MONTHLY', futureDate, 5);
    await createSubViaApi(request, authToken, 'Кинопоиск HD', 299, 'MONTHLY', futureDate, 4);
    await createSubViaApi(request, authToken, 'Курс Английского', 1200, 'MONTHLY', futureDate, 1);

    await login(page);
    await page.goto('/subscriptions');

    await expect(page.getByText('Spotify')).toBeVisible();
    await expect(page.getByText('Кинопоиск HD')).toBeVisible();
    await expect(page.getByText('Курс Английского')).toBeVisible();
  });

  test('ID 4: Поиск подписки по названию', async ({ page, request }) => {
    await createSubViaApi(request, authToken, 'Яндекс Музыка Поиск', 400);
    await createSubViaApi(request, authToken, 'Netflix Premium', 800);

    await login(page);
    await page.goto('/subscriptions');

    const searchInput = page.getByPlaceholder('Название подписки');
    await searchInput.fill('Яндекс Музыка Поиск');

    await expect(page.getByText('Яндекс Музыка Поиск')).toBeVisible();
    await expect(page.getByText('Netflix Premium')).toBeHidden();
  });

  test('ID 5: Фильтрация по категории', async ({ page, request }) => {
    await createSubViaApi(request, authToken, 'Apple Music', 250, 'MONTHLY', futureDate, 5);
    await createSubViaApi(request, authToken, 'Иви Фильмы', 399, 'MONTHLY', futureDate, 4);

    await login(page);
    await page.goto('/subscriptions');

    const categorySelect = page.locator('label', { hasText: 'Категория' }).locator('select');
    await categorySelect.selectOption({ label: 'Музыка' });

    await expect(page.getByText('Apple Music')).toBeVisible();
    await expect(page.getByText('Иви Фильмы')).toBeHidden();
  });

  test('ID 6: Фильтрация по периоду', async ({ page, request }) => {
    await createSubViaApi(request, authToken, 'Ежемесячный сервис', 300, 'MONTHLY');
    await createSubViaApi(request, authToken, 'Годовой сервис', 3000, 'YEARLY');

    await login(page);
    await page.goto('/subscriptions');

    const periodSelect = page.locator('label', { hasText: 'Период' }).locator('select');
    await periodSelect.selectOption({ label: 'Ежемесячно' });

    await expect(page.getByText('Ежемесячный сервис')).toBeVisible();
    await expect(page.getByText('Годовой сервис')).toBeHidden();
  });

  test('ID 7: Просмотр подписок после сброса фильтров', async ({ page, request }) => {
    await createSubViaApi(request, authToken, 'Подписка Сброс 1', 100);
    await createSubViaApi(request, authToken, 'Подписка Сброс 2', 200);

    await login(page);
    await page.goto('/subscriptions');

    const searchInput = page.getByPlaceholder('Название подписки');
    await searchInput.fill('Подписка Сброс 1');
    await expect(page.getByText('Подписка Сброс 2')).toBeHidden();

    const resetButton = page.getByRole('button', { name: 'Сбросить фильтры' });
    await expect(resetButton).toBeEnabled();
    await resetButton.click();

    await expect(page.getByText('Подписка Сброс 1')).toBeVisible();
    await expect(page.getByText('Подписка Сброс 2')).toBeVisible();
  });

  test('ID 8: Переход к добавлению подписки', async ({ page }) => {
    await login(page);
    await page.goto('/subscriptions');

    await page.getByRole('link', { name: 'Добавить подписку' }).click();

    await expect(page).toHaveURL(/\/subscriptions\/new$/);
    await expect(page.getByRole('heading', { name: /Новая подписка|Добавить подписку/i })).toBeVisible();
  });

  test('ID 9: Переход к редактированию подписки', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Подписка для Редактирования', 450);

    await login(page);
    await page.goto('/subscriptions');

    await page.getByRole('button', { name: `Действия для подписки ${sub.name}` }).click();
    await page.getByRole('button', { name: 'Изменить' }).click();

    await expect(page).toHaveURL(new RegExp(`/subscriptions/${sub.id}/edit`));
    await expect(page.locator('#subscription-name')).toHaveValue('Подписка для Редактирования');
    await expect(page.locator('#subscription-price')).toHaveValue(/450(\.00)?/);
  });

  test('ID 10: Просмотр списка после обновления страницы', async ({ page, request }) => {
    await createSubViaApi(request, authToken, 'Подписка Reload Test', 555);

    await login(page);
    await page.goto('/subscriptions');
    await expect(page.getByText('Подписка Reload Test')).toBeVisible();

    await page.reload();

    await expect(page.getByText('Подписка Reload Test')).toBeVisible();
  });

  test('ID 11: Просмотр подписок без авторизации', async ({ page }) => {
    await page.goto('/subscriptions');
    await expect(page).toHaveURL(/\/login/);
  });

  test('ID 12: Просмотр пустого списка подписок', async ({ page, request }) => {
    const emptyEmail = `empty_user_${Date.now()}@example.com`;
    const regRes = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        email: emptyEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        personalDataConsent: true,
      },
    });
    expect(regRes.status()).toBe(201);
    const regData = await regRes.json();
    trackCreatedUser(regData.userId, emptyEmail);

    await login(page, emptyEmail, 'Password123!');
    await page.goto('/subscriptions');

    await expect(page.getByText('Подписок нет')).toBeVisible();
    await expect(page.getByText('Добавьте первую подписку с помощью кнопки выше.')).toBeVisible();
  });

  test('ID 13: Поиск подписки без совпадений', async ({ page, request }) => {
    await createSubViaApi(request, authToken, 'Существующая подписка', 300);

    await login(page);
    await page.goto('/subscriptions');

    const searchInput = page.getByPlaceholder('Название подписки');
    await searchInput.fill('Несуществующая подписка 99999');

    await expect(page.getByText('Ничего не найдено')).toBeVisible();
    await expect(page.getByText('Существующая подписка')).toBeHidden();
  });

  test('ID 14: Фильтрация по категории без совпадений', async ({ page, request }) => {
    await createSubViaApi(request, authToken, 'Только Музыка', 200, 'MONTHLY', futureDate, 5);

    await login(page);
    await page.goto('/subscriptions');

    const categorySelect = page.locator('label', { hasText: 'Категория' }).locator('select');
    await categorySelect.selectOption({ label: 'Покупки' });

    await expect(page.getByText('Ничего не найдено')).toBeVisible();
    await expect(page.getByText('Только Музыка')).toBeHidden();
  });

  test('ID 15: Фильтрация по периоду без совпадений', async ({ page, request }) => {
    await createSubViaApi(request, authToken, 'Только Ежемесячная', 250, 'MONTHLY');

    await login(page);
    await page.goto('/subscriptions');

    const periodSelect = page.locator('label', { hasText: 'Период' }).locator('select');
    await periodSelect.selectOption({ label: 'Еженедельно' });

    await expect(page.getByText('Ничего не найдено')).toBeVisible();
    await expect(page.getByText('Только Ежемесячная')).toBeHidden();
  });

  test('ID 16: Ошибка загрузки списка подписок (500)', async ({ page }) => {
    await login(page);

    await page.route('**/api/subscriptions/me', (route) => {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      });
    });

    await page.goto('/subscriptions');

    await expect(page.getByText('Не удалось загрузить подписки')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Повторить загрузку' })).toBeVisible();
  });

  test('ID 17: Недоступность сервера при просмотре подписок', async ({ page }) => {
    await login(page);

    await page.route('**/api/subscriptions/me', (route) => route.abort('failed'));

    await page.goto('/subscriptions');

    await expect(page.getByText('Не удалось загрузить подписки')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Повторить загрузку' })).toBeEnabled();
  });

  test('ID 18: Проверка изоляции данных пользователей', async ({ page, request }) => {
    const user2Email = `isolation_user2_${Date.now()}@example.com`;
    const regRes2 = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        email: user2Email,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        personalDataConsent: true,
      },
    });
    expect(regRes2.status()).toBe(201);
    const user2Data = await regRes2.json();
    trackCreatedUser(user2Data.userId, user2Email);

    const loginRes2 = await request.post(`${API_BASE}/api/auth/login`, {
      data: { email: user2Email, password: 'Password123!' },
    });
    const token2 = (await loginRes2.json()).token;

    await createSubViaApi(request, authToken, 'Секретная подписка Пользователя 1', 111);
    await createSubViaApi(request, token2, 'Секретная подписка Пользователя 2', 222);

    await login(page, USER.email, USER.password);
    await page.goto('/subscriptions');

    await expect(page.getByText('Секретная подписка Пользователя 1')).toBeVisible();
    await expect(page.getByText('Секретная подписка Пользователя 2')).toBeHidden();

    await page.context().clearCookies();
    await page.evaluate(() => sessionStorage.clear());
    await login(page, user2Email, 'Password123!');
    await page.goto('/subscriptions');

    await expect(page.getByText('Секретная подписка Пользователя 2')).toBeVisible();
    await expect(page.getByText('Секретная подписка Пользователя 1')).toBeHidden();
  });
});
