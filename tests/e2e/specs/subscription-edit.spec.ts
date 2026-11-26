import { test, expect, Page, APIRequestContext } from '@playwright/test';
import {
  trackCreatedUser,
  deleteTrackedUsers,
  getSubscriptionById,
  countSubscriptionsByUserEmail,
  deleteSubscriptionsByUserEmail,
} from '../helpers/db';

const API_BASE = 'http://localhost:8080';

const USER = {
  email: 'sub_edit_user@example.com',
  password: 'Password123!',
};

const futureDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
const futureDate2 = new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0];
const futureFormatted2 = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}).format(new Date(`${futureDate2}T12:00:00`));
const pastDate = '2026-10-14';

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

test.describe('Редактирование подписки (Subscription Editing E2E)', () => {
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

  test.beforeEach(async () => {
    await deleteSubscriptionsByUserEmail(USER.email);
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test.afterAll(async () => {
    await deleteTrackedUsers();
    const count = await countSubscriptionsByUserEmail(USER.email);
    expect(count).toBe(0);
  });

  test('ID 1: Успешный переход к редактированию подписки', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Яндекс.Музыка', 400);

    await login(page);
    await page.goto('/subscriptions');

    await page.getByRole('button', { name: `Действия для подписки ${sub.name}` }).click();
    await page.getByRole('button', { name: /Редактировать|Изменить/i }).click();

    await expect(page).toHaveURL(new RegExp(`/subscriptions/${sub.id}/edit$`));
    await expect(page.getByRole('heading', { name: 'Редактирование подписки' })).toBeVisible();
    await expect(page.locator('#subscription-name')).toHaveValue('Яндекс.Музыка');
  });

  test('ID 2: Проверка предзаполнения полей', async ({ page, request }) => {
    const sub1 = await createSubViaApi(request, authToken, 'Яндекс.Музыка', 400, 'MONTHLY', futureDate, 5);
    const sub2 = await createSubViaApi(request, authToken, 'Другая подписка', 999, 'YEARLY', futureDate, 1);

    await login(page);
    await page.goto(`/subscriptions/${sub1.id}/edit`);

    await expect(page.locator('#subscription-name')).toHaveValue('Яндекс.Музыка');
    await expect(page.locator('#subscription-price')).toHaveValue(/400(\.00)?/);
    await expect(page.locator('#subscription-period')).toHaveValue('monthly');
    await expect(page.locator('#subscription-category')).toHaveValue('5');
    await expect(page.locator('#subscription-date')).toHaveValue(futureDate);
    expect(await page.locator('#subscription-name').inputValue()).not.toBe(sub2.name);
  });

  test('ID 3: Успешное изменение названия подписки', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Яндекс.Музыка', 400);

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);

    await page.locator('#subscription-name').fill('Spotify');
    await page.getByRole('button', { name: /Сохранить/i }).click();

    await expect(page).toHaveURL(/\/subscriptions$/);
    await expect(page.getByText('Spotify')).toBeVisible();
    await expect(page.getByText('Яндекс.Музыка')).toBeHidden();

    const inDb = await getSubscriptionById(sub.id);
    expect(inDb.name).toBe('Spotify');
  });

  test('ID 4: Успешное изменение стоимости', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Тест Стоимость', 400);

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);

    await page.locator('#subscription-price').fill('500');
    await page.getByRole('button', { name: /Сохранить/i }).click();

    await expect(page).toHaveURL(/\/subscriptions$/);
    const row = page.getByRole('row', { name: /Тест Стоимость/i });
    await expect(row).toContainText(/500/);

    const inDb = await getSubscriptionById(sub.id);
    expect(Number(inDb.amount)).toBe(500);
  });

  test('ID 5: Успешное изменение периода подписки', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Тест Период', 1200, 'MONTHLY');

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);

    await page.locator('#subscription-period').selectOption('yearly');
    await page.getByRole('button', { name: /Сохранить/i }).click();

    await expect(page).toHaveURL(/\/subscriptions$/);
    const inDb = await getSubscriptionById(sub.id);
    expect(inDb.period).toBe('YEARLY');
  });

  test('ID 6: Успешное изменение даты списания', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Тест Дата', 400, 'MONTHLY', futureDate);

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);

    await page.locator('#subscription-date').fill(futureDate2);
    await page.getByRole('button', { name: /Сохранить/i }).click();

    await expect(page).toHaveURL(/\/subscriptions$/);
    const row = page.getByRole('row', { name: /Тест Дата/i });
    await expect(row).toContainText(futureFormatted2);
  });

  test('ID 7: Успешное изменение категории', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Тест Категория', 400, 'MONTHLY', futureDate, 5);

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);

    await page.locator('#subscription-category').selectOption({ label: 'Развлечения' });
    await page.getByRole('button', { name: /Сохранить/i }).click();

    await expect(page).toHaveURL(/\/subscriptions$/);
    const row = page.getByRole('row', { name: /Тест Категория/i });
    await expect(row).toContainText('Развлечения');
  });

  test('ID 8: Изменение нескольких полей одновременно', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Старая Подписка', 300, 'YEARLY', futureDate, 1);

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);

    await page.locator('#subscription-name').fill('Spotify');
    await page.locator('#subscription-price').fill('600');
    await page.locator('#subscription-period').selectOption('monthly');
    await page.locator('#subscription-category').selectOption({ label: 'Музыка' });
    await page.locator('#subscription-date').fill(futureDate2);

    await page.getByRole('button', { name: /Сохранить/i }).click();

    await expect(page).toHaveURL(/\/subscriptions$/);
    const row = page.getByRole('row', { name: /Spotify/i });
    await expect(row).toBeVisible();
    await expect(row).toContainText(/600/);
    await expect(row).toContainText('Музыка');

    const inDb = await getSubscriptionById(sub.id);
    expect(inDb.name).toBe('Spotify');
    expect(Number(inDb.amount)).toBe(600);
    expect(inDb.period).toBe('MONTHLY');
  });

  test('ID 9: Сохранение подписки без изменения остальных полей', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Исходное Название', 400, 'MONTHLY', futureDate, 5);

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);

    await page.locator('#subscription-name').fill('Обновленное Название');
    await page.getByRole('button', { name: /Сохранить/i }).click();

    await expect(page).toHaveURL(/\/subscriptions$/);

    const inDb = await getSubscriptionById(sub.id);
    expect(inDb.name).toBe('Обновленное Название');
    expect(Number(inDb.amount)).toBe(400);
    expect(inDb.period).toBe('MONTHLY');
    expect(Number(inDb.category_id)).toBe(5);
  });

  test('ID 10: Проверка отображения обновлённых данных после повторного открытия', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Повторное Открытие', 350);

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);

    await page.locator('#subscription-price').fill('750');
    await page.getByRole('button', { name: /Сохранить/i }).click();

    await expect(page).toHaveURL(/\/subscriptions$/);

    await page.goto(`/subscriptions/${sub.id}/edit`);
    await expect(page.locator('#subscription-price')).toHaveValue(/750(\.00)?/);
  });

  test('ID 11: Отмена редактирования', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Подписка До Отмены', 400);

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);

    await page.locator('#subscription-name').fill('Несохранённое Имя');
    await page.locator('#subscription-price').fill('999');

    await page.getByRole('button', { name: 'Отменить' }).click();

    await expect(page).toHaveURL(/\/subscriptions$/);
    await expect(page.getByText('Подписка До Отмены')).toBeVisible();
    await expect(page.getByText('Несохранённое Имя')).toBeHidden();

    const inDb = await getSubscriptionById(sub.id);
    expect(inDb.name).toBe('Подписка До Отмены');
  });

  test('ID 12: Возврат на предыдущую страницу', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Подписка Back Test', 400);

    await login(page);
    await page.goto('/subscriptions');

    await page.getByRole('button', { name: `Действия для подписки ${sub.name}` }).click();
    await page.getByRole('button', { name: /Редактировать|Изменить/i }).click();

    await expect(page).toHaveURL(new RegExp(`/subscriptions/${sub.id}/edit$`));
    await page.locator('#subscription-name').fill('Отмененный Back');

    await page.goBack();

    await expect(page).toHaveURL(/\/subscriptions$/);
    await expect(page.getByText('Подписка Back Test')).toBeVisible();
    await expect(page.getByText('Отмененный Back')).toBeHidden();
  });

  test('ID 13: Проверка обновления стоимости в дашборде', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Дашборд Тест', 400);

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);

    await page.locator('#subscription-price').fill('500');
    await page.getByRole('button', { name: /Сохранить/i }).click();

    await expect(page).toHaveURL(/\/subscriptions$/);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);

    const summaryRes = await request.get(`${API_BASE}/api/dashboard/summary`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (summaryRes.status() === 200) {
      const summary = await summaryRes.json();
      const val = summary.currencies?.[0]?.monthlyEquivalent ?? summary.totalMonthlyExpenses;
      expect(Number(val)).toBe(500);
    }
  });

  test('ID 14: Проверка редактирования подписки после обновления страницы', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'До Перезагрузки', 400);

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);

    await page.locator('#subscription-name').fill('После Перезагрузки');
    await page.getByRole('button', { name: /Сохранить/i }).click();

    await expect(page).toHaveURL(/\/subscriptions$/);
    await page.reload();

    await expect(page.getByText('После Перезагрузки')).toBeVisible();
  });

  test('ID 15: Сохранение подписки с пустым названием', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Подписка Имя Валидация', 400);

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);

    await page.locator('#subscription-name').fill('');
    await page.getByRole('button', { name: /Сохранить/i }).click();

    const error = page.locator('#name-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText(/название/i);
    expect(page.url()).toContain(`/subscriptions/${sub.id}/edit`);
  });

  test('ID 16: Сохранение подписки с нулевой стоимостью', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Подписка Ноль Валидация', 400);

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);

    await page.locator('#subscription-price').fill('0');
    await page.getByRole('button', { name: /Сохранить/i }).click();

    const error = page.locator('#price-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText(/больше нуля/i);
    expect(page.url()).toContain(`/subscriptions/${sub.id}/edit`);
  });

  test('ID 17: Сохранение подписки с отрицательной стоимостью', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Подписка Минус Валидация', 400);

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);

    await page.locator('#subscription-price').fill('-100');
    await page.getByRole('button', { name: /Сохранить/i }).click();

    const error = page.locator('#price-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText(/больше нуля/i);
    expect(page.url()).toContain(`/subscriptions/${sub.id}/edit`);
  });

  test('ID 18: Ввод некорректного значения стоимости', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Подписка Текст Валидация', 400);

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);

    await page.locator('#subscription-price').fill('текст');
    await page.getByRole('button', { name: /Сохранить/i }).click();

    const error = page.locator('#price-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText(/стоимость/i);
    expect(page.url()).toContain(`/subscriptions/${sub.id}/edit`);

    const inDb = await getSubscriptionById(sub.id);
    expect(Number(inDb.amount)).toBe(400);
  });

  test('ID 19: Сохранение подписки без периода', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Подписка Без Периода', 400);

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);

    await page.locator('#subscription-period').evaluate((select: HTMLSelectElement) => {
      const opt = document.createElement('option');
      opt.value = '';
      select.add(opt, 0);
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
      setter?.call(select, '');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await page.getByRole('button', { name: /Сохранить/i }).click();

    const error = page.locator('#period-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText(/период/i);
  });

  test('ID 20: Сохранение подписки с датой в прошлом', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Подписка Прошлая Дата', 400);

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);

    await page.locator('#subscription-date').fill(pastDate);
    await page.getByRole('button', { name: /Сохранить/i }).click();

    const error = page.locator('#date-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText(/Дата списания не может быть раньше/i);
    expect(page.url()).toContain(`/subscriptions/${sub.id}/edit`);
  });

  test('ID 21: Сохранение подписки без категории', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Подписка Без Категории', 400);

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);

    await page.locator('#subscription-category').selectOption('');
    await page.getByRole('button', { name: /Сохранить/i }).click();

    const error = page.locator('#category-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText(/категорию/i);
    expect(page.url()).toContain(`/subscriptions/${sub.id}/edit`);
  });

  test('ID 22: Ошибка сервера при сохранении изменений', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Ошибка 500 Edit', 400);

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);

    await page.locator('#subscription-name').fill('Ошибка 500 Новое');

    await page.route(`**/api/subscriptions/${sub.id}`, async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal Server Error' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.getByRole('button', { name: /Сохранить/i }).click();

    await expect(page.locator('text=Не удалось сохранить подписку')).toBeVisible();
    expect(page.url()).toContain(`/subscriptions/${sub.id}/edit`);
  });

  test('ID 23: Недоступность сервера при редактировании', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Сетевой Сбой Edit', 400);

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);

    await page.locator('#subscription-name').fill('Сетевой Сбой Данные');

    await page.route(`**/api/subscriptions/${sub.id}`, (route) => {
      if (route.request().method() === 'PUT') {
        return route.abort('failed');
      }
      return route.continue();
    });

    await page.getByRole('button', { name: /Сохранить/i }).click();

    await expect(page.locator('text=Не удалось сохранить подписку')).toBeVisible();
    await expect(page.locator('#subscription-name')).toHaveValue('Сетевой Сбой Данные');
  });

  test('ID 24: Попытка редактирования без авторизации', async ({ page, request }) => {
    await page.goto('/subscriptions/1/edit');
    await expect(page).toHaveURL(/\/login/);

    const res = await request.put(`${API_BASE}/api/subscriptions/1`, {
      data: {
        name: 'Неавторизованная подписка',
        amount: 200,
        currency: 'RUB',
        period: 'MONTHLY',
        nextPaymentDate: futureDate,
        categoryId: 1,
      },
    });
    expect(res.status()).toBe(401);
  });

  test('ID 25: Попытка изменить чужую подписку', async ({ page, request }) => {
    const otherEmail = `other_sub_user_${Date.now()}@example.com`;
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
    const otherSub = await createSubViaApi(request, otherToken, 'Чужая подписка Edit', 888);

    await login(page);
    await page.goto(`/subscriptions/${otherSub.id}/edit`);
    await expect(page.getByRole('heading', { name: 'Подписка не найдена' })).toBeVisible();

    const putRes = await request.put(`${API_BASE}/api/subscriptions/${otherSub.id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: 'Взлом чужой подписки',
        amount: 10,
        currency: 'RUB',
        period: 'MONTHLY',
        nextPaymentDate: futureDate,
        categoryId: 1,
      },
    });
    expect([403, 404]).toContain(putRes.status());

    const inDb = await getSubscriptionById(otherSub.id);
    expect(inDb.name).toBe('Чужая подписка Edit');
  });

  test('ID 26: Повторное нажатие «Сохранить» во время загрузки', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Подписка Даблклик Edit', 400);

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);

    const newName = 'Успешный Даблклик';
    await page.locator('#subscription-name').fill(newName);

    const saveBtn = page.getByRole('button', { name: /Сохранить/i });
    await saveBtn.dblclick();

    await expect(page).toHaveURL(/\/subscriptions$/);

    const countInDb = await countSubscriptionsByUserEmail(USER.email, newName);
    expect(countInDb).toBe(1);
  });

  test('ID 27: Изменение подписки, которая была удалена', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Удаляемая Сессия', 400);

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);
    await expect(page.locator('#subscription-name')).toHaveValue('Удаляемая Сессия');

    await request.delete(`${API_BASE}/api/subscriptions/${sub.id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    await page.locator('#subscription-name').fill('Фантомное Обновление');
    await page.getByRole('button', { name: /Сохранить/i }).click();

    await expect(page.getByText(/Подписка или категория не найдена|Не удалось сохранить подписку/i).first()).toBeVisible();

    const count = await countSubscriptionsByUserEmail(USER.email, 'Фантомное Обновление');
    expect(count).toBe(0);
  });

  test('ID 28: Проверка сохранения при истечении авторизации', async ({ page, request }) => {
    const sub = await createSubViaApi(request, authToken, 'Сессия Истекла Edit', 400);

    await login(page);
    await page.goto(`/subscriptions/${sub.id}/edit`);
    await expect(page.locator('#subscription-name')).toHaveValue('Сессия Истекла Edit');

    await page.route(`**/api/subscriptions/${sub.id}`, async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Unauthorized' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.locator('#subscription-name').fill('Без Авторизации');
    await page.getByRole('button', { name: /Сохранить/i }).click();

    await expect(page).toHaveURL(/\/login/);

    const res = await request.put(`${API_BASE}/api/subscriptions/${sub.id}`, {
      headers: { Authorization: 'Bearer expired.token.value' },
      data: {
        name: 'Без Авторизации API',
        amount: 400,
        currency: 'RUB',
        period: 'MONTHLY',
        nextPaymentDate: futureDate,
        categoryId: 1,
      },
    });
    expect(res.status()).toBe(401);
  });
});
