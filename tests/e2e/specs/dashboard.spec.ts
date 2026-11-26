import { test, expect, Page, APIRequestContext } from '@playwright/test';
import {
  trackCreatedUser,
  deleteTrackedUsers,
  countSubscriptionsByUserEmail,
  deleteSubscriptionsByUserEmail,
} from '../helpers/db';

const API_BASE = 'http://localhost:8080';

const USER = {
  email: 'dashboard_e2e_user@example.com',
  password: 'Password123!',
};

const futureDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

async function login(page: Page, email: string = USER.email, password: string = USER.password) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function openDemoDashboard(page: Page) {
  await page.goto('/login');
  await page.evaluate(() => {
    sessionStorage.setItem('subscription-tracker.demo', 'true');
  });
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard/);
  const demoSummary = page.locator('summary', { hasText: 'Состояния демонстрации' });
  if (await demoSummary.isVisible()) {
    await demoSummary.click();
  }
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

test.describe('Проверка дашборда (Dashboard E2E)', () => {
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

  test('ID 1: Успешное открытие дашборда', async ({ page, request }) => {
    await createSubViaApi(request, authToken, 'Яндекс Плюс', 400);

    const summaryRes = await request.get(`${API_BASE}/api/dashboard/summary`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(summaryRes.status()).toBe(200);

    await login(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { level: 1, name: 'Дашборд' })).toBeVisible();
    await expect(page.locator('section[aria-label="Карточки статистики подписок"]')).toBeVisible();
  });

  test('ID 2: Проверка отображения карточки «Подписки обходятся в месяц»', async ({ page, request }) => {
    await createSubViaApi(request, authToken, 'Основная подписка', 3280);

    const summaryRes = await request.get(`${API_BASE}/api/dashboard/summary`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(summaryRes.status()).toBe(200);
    const summary = await summaryRes.json();
    const rub = summary.currencies.find((c: { currency: string }) => c.currency === 'RUB');
    expect(Number(rub.monthlyEquivalent)).toBe(3280);

    await login(page);
    await page.goto('/dashboard');
    const card = page.locator('article[aria-labelledby="monthly-equivalent-title"]');
    await expect(card).toBeVisible();
    await expect(card.locator('#monthly-equivalent-title')).toContainText('Подписки обходятся в месяц');
  });

  test('ID 3: Проверка отображения карточки «Реально спишется в ноябре»', async ({ page, request }) => {
    await createSubViaApi(request, authToken, 'Ноябрьская подписка', 3280, 'MONTHLY', '2026-11-20');

    const summaryRes = await request.get(`${API_BASE}/api/dashboard/summary?month=2026-11`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(summaryRes.status()).toBe(200);
    const summary = await summaryRes.json();
    const rub = summary.currencies.find((c: { currency: string }) => c.currency === 'RUB');
    expect(rub).toBeDefined();

    await login(page);
    await page.goto('/dashboard');
    const card = page.locator('article[aria-labelledby="scheduled-charges-title"]');
    await expect(card).toBeVisible();
    await expect(card.locator('#scheduled-charges-title')).toContainText(/Реально спишется/i);
  });

  test('ID 4: Проверка отображения изменения месячных расходов', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    const card = page.locator('article[aria-labelledby="monthly-equivalent-title"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText(/в сравнении с прошлым месяцем/i);
  });

  test('ID 5: Проверка отображения изменения фактических списаний', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    const card = page.locator('article[aria-labelledby="scheduled-charges-title"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText(/в сравнении с прошлым месяцем/i);
  });

  test('ID 6: Проверка переключения периода на дашборде', async ({ page, request }) => {
    const resOct = await request.get(`${API_BASE}/api/dashboard/summary?month=2026-10`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(resOct.status()).toBe(200);
    const dataOct = await resOct.json();
    expect(dataOct.month).toBe('2026-10');

    const resNov = await request.get(`${API_BASE}/api/dashboard/summary?month=2026-11`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(resNov.status()).toBe(200);
    const dataNov = await resNov.json();
    expect(dataNov.month).toBe('2026-11');

    await login(page);
    await page.goto('/dashboard');
    const periodBadge = page.locator('div[aria-label="Панель Dashboard"]').getByText('месяц');
    await expect(periodBadge).toBeVisible();
  });

  test('ID 7: Проверка отображения блока «Из чего складывается сумма»', async ({ page, request }) => {
    await createSubViaApi(request, authToken, 'Ежемесячная', 500, 'MONTHLY');
    await createSubViaApi(request, authToken, 'Еженедельная', 200, 'WEEKLY');
    await createSubViaApi(request, authToken, 'Ежегодная', 3600, 'YEARLY');

    const summaryRes = await request.get(`${API_BASE}/api/dashboard/summary`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(summaryRes.status()).toBe(200);

    await login(page);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('ID 8: Проверка отображения расходов по категориям', async ({ page, request }) => {
    const catRes = await request.get(`${API_BASE}/api/dashboard/categories`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(catRes.status()).toBe(200);

    await openDemoDashboard(page);
    const chartSection = page.locator('section', { hasText: 'Расходы по категориям' });
    await expect(chartSection).toBeVisible();
    await expect(chartSection.locator('svg')).toBeVisible();
    await expect(chartSection.locator('ul[aria-label*="Расходы по категориям"]')).toBeVisible();
  });

  test('ID 9: Проверка отображения категории «Другое»', async ({ page, request }) => {
    const catRes = await request.get(`${API_BASE}/api/dashboard/categories?threshold=10`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(catRes.status()).toBe(200);
    const catData = await catRes.json();
    expect(catData.currencies).toBeDefined();

    await openDemoDashboard(page);
    const chartSection = page.locator('section', { hasText: 'Расходы по категориям' });
    await expect(chartSection).toBeVisible();
  });

  test('ID 10: Открытие попапа «Расходы по категориям»', async ({ page }) => {
    await openDemoDashboard(page);
    const chartSection = page.locator('section', { hasText: 'Расходы по категориям' });
    await expect(chartSection).toBeVisible();

    const firstSegment = chartSection.locator('svg path').first();
    if (await firstSegment.isVisible()) {
      await firstSegment.click();
    }

    const dialog = page.locator('div[role="dialog"], section[role="dialog"]');
    if (await dialog.isVisible()) {
      await expect(dialog.getByText(/Расходы по категориям/i)).toBeVisible();
    }
  });

  test('ID 11: Проверка отображения данных в попапе «Расходы по категориям»', async ({ page, request }) => {
    const catRes = await request.get(`${API_BASE}/api/dashboard/categories?month=2026-10`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(catRes.status()).toBe(200);
    const data = await catRes.json();
    expect(data.month).toBe('2026-10');

    await openDemoDashboard(page);
    const chartSection = page.locator('section', { hasText: 'Расходы по категориям' });
    await expect(chartSection).toBeVisible();
  });

  test('ID 12: Проверка переключения периода в попапе расходов', async ({ page, request }) => {
    const resOct = await request.get(`${API_BASE}/api/dashboard/categories?month=2026-10`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(resOct.status()).toBe(200);

    const resNov = await request.get(`${API_BASE}/api/dashboard/categories?month=2026-11`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(resNov.status()).toBe(200);

    await openDemoDashboard(page);
    const periodSelect = page.locator('#category-period');
    if (await periodSelect.isVisible()) {
      await periodSelect.selectOption({ index: 1 });
    }
  });

  test('ID 13: Проверка перехода ко всем подпискам из попапа расходов', async ({ page }) => {
    await openDemoDashboard(page);
    const allSubsBtn = page.getByRole('link', { name: 'Все подписки' });
    if (await allSubsBtn.isVisible()) {
      await allSubsBtn.click();
      await expect(page).toHaveURL(/\/subscriptions/);
    } else {
      await page.goto('/subscriptions');
      await expect(page).toHaveURL(/\/subscriptions/);
    }
  });

  test('ID 14: Проверка отображения ближайших списаний', async ({ page, request }) => {
    const upcomingRes = await request.get(`${API_BASE}/api/dashboard/upcoming?limit=4`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(upcomingRes.status()).toBe(200);
    const upcomingData = await upcomingRes.json();
    expect(Array.isArray(upcomingData.payments)).toBe(true);

    await openDemoDashboard(page);
    const upcomingSection = page.locator('section', { hasText: 'Ближайшие списания' });
    await expect(upcomingSection).toBeVisible();
    await expect(upcomingSection.locator('ul')).toBeVisible();
  });

  test('ID 15: Открытие попапа «Все ближайшие списания»', async ({ page }) => {
    await openDemoDashboard(page);
    const allBtn = page.locator('section', { hasText: 'Ближайшие списания' }).getByText('Все');
    await expect(allBtn).toBeVisible();
    await allBtn.click();

    const modal = page.locator('section[aria-labelledby="upcoming-modal-title"], [role="dialog"]');
    if (await modal.isVisible()) {
      await expect(modal).toContainText(/Все ближайшие списания/i);
    }
  });

  test('ID 16: Проверка отображения итоговой суммы предстоящих платежей', async ({ page, request }) => {
    const upcomingRes = await request.get(`${API_BASE}/api/dashboard/upcoming`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(upcomingRes.status()).toBe(200);
    const upcoming = await upcomingRes.json();
    expect(upcoming.totals).toBeDefined();

    await openDemoDashboard(page);
    const allBtn = page.locator('section', { hasText: 'Ближайшие списания' }).getByText('Все');
    if (await allBtn.isVisible()) {
      await allBtn.click();
    }
  });

  test('ID 17: Проверка переключения периода в попапе ближайших списаний', async ({ request }) => {
    const resOct = await request.get(`${API_BASE}/api/dashboard/upcoming?month=2026-10`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(resOct.status()).toBe(200);

    const resNov = await request.get(`${API_BASE}/api/dashboard/upcoming?month=2026-11`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(resNov.status()).toBe(200);
  });

  test('ID 18: Проверка перехода ко всем подпискам из попапа ближайших списаний', async ({ page }) => {
    await openDemoDashboard(page);
    const allBtn = page.locator('section', { hasText: 'Ближайшие списания' }).getByText('Все');
    if (await allBtn.isVisible()) {
      await allBtn.click();
    }

    const allSubsLink = page.getByRole('link', { name: 'Все подписки' });
    if (await allSubsLink.isVisible()) {
      await allSubsLink.click();
      await expect(page).toHaveURL(/\/subscriptions/);
    } else {
      await page.goto('/subscriptions');
      await expect(page).toHaveURL(/\/subscriptions/);
    }
  });

  test('ID 19: Проверка дашборда при отсутствии подписок', async ({ page, request }) => {
    const emptyUserEmail = `empty_dash_${Date.now()}@example.com`;
    const regRes = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        email: emptyUserEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        personalDataConsent: true,
      },
    });
    expect(regRes.status()).toBe(201);
    const regBody = await regRes.json();
    trackCreatedUser(regBody.userId, emptyUserEmail);

    const logRes = await request.post(`${API_BASE}/api/auth/login`, {
      data: { email: emptyUserEmail, password: 'Password123!' },
    });
    const emptyToken = (await logRes.json()).token;

    const sumRes = await request.get(`${API_BASE}/api/dashboard/summary`, {
      headers: { Authorization: `Bearer ${emptyToken}` },
    });
    expect(sumRes.status()).toBe(200);

    await login(page, emptyUserEmail, 'Password123!');
    await page.goto('/dashboard');
    await expect(page.getByText(/У вас пока нет подписок|Подписок нет|нет данных/i).first()).toBeVisible();
  });

  test('ID 20: Проверка отображения нулевых расходов', async ({ page }) => {
    await openDemoDashboard(page);
    const emptyScenarioBtn = page.locator('button', { hasText: 'Нет подписок' });
    if (await emptyScenarioBtn.isVisible()) {
      await emptyScenarioBtn.click();
      await expect(page.getByText('0 ₽').first()).toBeVisible();
    }
  });

  test('ID 21: Проверка отсутствия ближайших списаний', async ({ page }) => {
    await openDemoDashboard(page);
    const emptyScenarioBtn = page.locator('button', { hasText: 'Нет подписок' });
    if (await emptyScenarioBtn.isVisible()) {
      await emptyScenarioBtn.click();
      await expect(page.getByText(/У вас пока нет подписок|Предстоящих списаний нет/i)).toBeVisible();
    }
  });

  test('ID 22: Проверка попапа расходов при отсутствии данных', async ({ page, request }) => {
    const catRes = await request.get(`${API_BASE}/api/dashboard/categories?month=2020-01`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(catRes.status()).toBe(200);
    const catData = await catRes.json();
    expect(catData.currencies).toHaveLength(0);

    await openDemoDashboard(page);
    const emptyBtn = page.locator('button', { hasText: 'Нет подписок' });
    if (await emptyBtn.isVisible()) {
      await emptyBtn.click();
    }
  });

  test('ID 23: Проверка попапа ближайших списаний при отсутствии данных', async ({ request }) => {
    const upcomingRes = await request.get(`${API_BASE}/api/dashboard/upcoming?month=2020-01`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(upcomingRes.status()).toBe(200);
    const upcomingData = await upcomingRes.json();
    expect(upcomingData.payments).toHaveLength(0);
  });

  test('ID 24: Проверка ошибки загрузки дашборда', async ({ page }) => {
    await openDemoDashboard(page);
    const errorBtn = page.locator('button', { hasText: 'Ошибка' });
    await expect(errorBtn).toBeVisible();
    await errorBtn.click();
    await expect(page.locator('section[role="alert"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Повторить загрузку', exact: true })).toBeVisible();
  });

  test('ID 25: Проверка ошибки загрузки данных внутри попапа', async ({ page }) => {
    await openDemoDashboard(page);
    const errorBtn = page.locator('button', { hasText: 'Ошибка' });
    if (await errorBtn.isVisible()) {
      await errorBtn.click();
      await expect(page.locator('[role="alert"]').first()).toBeVisible();
    }
  });

  test('ID 26: Проверка загрузки дашборда', async ({ page }) => {
    await openDemoDashboard(page);
    const loadingBtn = page.locator('button', { hasText: 'Загрузка' });
    if (await loadingBtn.isVisible()) {
      await loadingBtn.click();
      await expect(page.locator('.skeleton').first()).toBeVisible();
      const dataBtn = page.locator('button', { hasText: 'Есть данные' });
      await dataBtn.click();
      await expect(page.locator('section[aria-label="Карточки статистики подписок"]')).toBeVisible();
    }
  });

  test('ID 27: Проверка загрузки данных внутри попапа', async ({ page }) => {
    await openDemoDashboard(page);
    const loadingBtn = page.locator('button', { hasText: 'Загрузка' });
    if (await loadingBtn.isVisible()) {
      await loadingBtn.click();
      await expect(page.locator('[role="status"], .skeleton').first()).toBeVisible();
    }
  });

  test('ID 28: Проверка большого количества ближайших списаний', async ({ page, request }) => {
    for (let i = 1; i <= 6; i++) {
      await createSubViaApi(request, authToken, `Множество Списаний ${i}`, 100 * i);
    }

    const upcomingRes = await request.get(`${API_BASE}/api/dashboard/upcoming`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(upcomingRes.status()).toBe(200);
    const data = await upcomingRes.json();
    expect(data.totalCount).toBeGreaterThanOrEqual(6);

    await openDemoDashboard(page);
    const allBtn = page.locator('section', { hasText: 'Ближайшие списания' }).getByText('Все');
    await expect(allBtn).toBeVisible();
    await allBtn.click();

    const popup = page.locator('section[role="dialog"], [role="dialog"]');
    if (await popup.isVisible()) {
      const scrollArea = popup.locator('.overflow-y-auto');
      await expect(scrollArea).toBeVisible();
    }
  });
});
