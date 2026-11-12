import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

// Compile the existing TSX through the installed Vite; no listening HTTP server,
// backend, credentials, extra package, or browser session is needed for these tests.
const compiler = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-stats-tests',
  server: { middlewareMode: true, watch: null, hmr: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  esbuild: { jsx: 'automatic' },
});
after(() => compiler.close());
const { default: DashboardStatsCards } = await compiler.ssrLoadModule('/src/components/DashboardStatsCards.tsx');
const { default: CategoryChart } = await compiler.ssrLoadModule('/src/components/CategoryChart.tsx');
const { default: UpcomingPayments } = await compiler.ssrLoadModule('/src/components/UpcomingPayments.tsx');
const { default: UpcomingPaymentsModal } = await compiler.ssrLoadModule('/src/components/UpcomingPaymentsModal.tsx');
const { default: CategoryDetailsModal } = await compiler.ssrLoadModule('/src/components/CategoryDetailsModal.tsx');
const render = (state) => renderToStaticMarkup(createElement(DashboardStatsCards, { state, onRetry() {} }));
const ready = (patch = {}) => ({ kind: 'ready', data: {
  month: '2026-11', currency: 'RUB', monthlyEquivalentMinor: 320000, scheduledChargesMinor: 376000, ...patch,
} });

test('cards render two different aggregates and use the supplied calendar month', () => {
  const html = render(ready());
  assert.equal((html.match(/<article/g) || []).length, 2);
  assert.match(html, /Подписки обходятся в месяц/);
  assert.match(html, /Реально спишется в ноябре/);
  assert.match(html, /3\s200\s₽/);
  assert.match(html, /3\s760\s₽/);
  assert.match(html, /ноябрь 2026/);
  assert.doesNotMatch(html, /-12%|480|Повторить загрузку сумм/);
});

test('genuine zeros render as two monetary values, not unknown placeholders', () => {
  const html = render(ready({ monthlyEquivalentMinor: 0, scheduledChargesMinor: 0 }));
  assert.equal((html.match(/>0\s₽</g) || []).length, 2);
  assert.doesNotMatch(html, /Данные недоступны/);
});

test('prototype layout keeps calculation explanations accessible but not in the visual card body', () => {
  const html = render(ready());
  assert.match(html, /aria-describedby="monthly-equivalent-description"/);
  assert.match(html, /id="monthly-equivalent-description" class="sr-only"/);
  assert.match(html, /id="scheduled-charges-description" class="sr-only"/);
  assert.equal((html.match(/в сравнении с прошлым месяцем/g) || []).length, 2);
  assert.equal((html.match(/нет данных<\/span>/g) || []).length, 2);
});

test('loading renders exactly two amount skeletons and an accessible status without stale money', () => {
  const html = render({ kind: 'loading' });
  assert.equal((html.match(/class="skeleton/g) || []).length, 2);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /role="status"/);
  assert.doesNotMatch(html, /₽|Данные недоступны/);
});

test('missing API renders unknown amounts with an explicit notice, not fake zeros or retry', () => {
  const html = render({ kind: 'unavailable' });
  assert.equal((html.match(/Данные недоступны/g) || []).length, 2);
  assert.match(html, /API статистики ещё не подключён/);
  assert.match(html, /прочерки не означают нулевые расходы/);
  assert.doesNotMatch(html, /₽|Повторить загрузку сумм/);
});

test('an error clears both amounts and renders an accessible retry without raw server details', () => {
  const html = render({ kind: 'error', message: 'private-server-details' });
  assert.match(html, /role="alert"/);
  assert.match(html, /Повторить загрузку сумм/);
  assert.equal((html.match(/Данные недоступны/g) || []).length, 2);
  assert.doesNotMatch(html, /₽|private-server-details/);
});

test('chart exposes category controls and exact monetary alternatives to pointer-only segments', () => {
  const html = renderToStaticMarkup(createElement(CategoryChart, { categories: [
    { id: 'film', name: 'Кино', amountMinor: 12345 }, { id: 'zero', name: 'Ноль', amountMinor: 0 },
  ] }));
  assert.equal((html.match(/<path /g) || []).length, 1);
  assert.equal((html.match(/<button /g) || []).length, 1);
  assert.match(html, /aria-controls=/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /role="status"/);
  assert.match(html, /123,45\s₽/);
  assert.match(html, /100%/);
  assert.doesNotMatch(html, /Ноль|NaN|Infinity/);
});

test('empty chart communicates no expenses without fake slices or interactive controls', () => {
  const html = renderToStaticMarkup(createElement(CategoryChart, { categories: [] }));
  assert.match(html, /За этот месяц нет расходов/);
  assert.doesNotMatch(html, /<svg|<path|<button/);
});

const paymentItems = [7, 3, 1, 5, 4, 2, 6].map((day) => ({
  id: String(day), name: `Подписка ${day}`, categoryName: 'Музыка', date: `2026-11-0${day}`, amountMinor: day * 100,
}));
const renderPayments = (state, props = {}) => renderToStaticMarkup(createElement(UpcomingPayments, {
  state, today: '2026-11-02', onRetry() {}, ...props,
}));

test('upcoming block renders four chronological payments with category, amount, date and local icon fallback', () => {
  const html = renderPayments({ kind: 'ready', payments: paymentItems });
  assert.equal((html.match(/<time /g) || []).length, 4);
  assert.match(html, /Музыка/);
  assert.match(html, /dateTime="2026-11-02"/);
  assert.ok(html.indexOf('Подписка 2') < html.indexOf('Подписка 3'));
  assert.doesNotMatch(html, /Подписка 1|Подписка 6|Подписка 7|<img|https?:/);
});

test('All is a dialog trigger when wired and an explicitly unavailable control until popup is ready', () => {
  const state = { kind: 'ready', payments: paymentItems };
  const pending = renderPayments(state);
  assert.match(pending, /aria-haspopup="dialog" disabled/);
  assert.match(pending, /Полный список списаний скоро будет доступен/);
  assert.doesNotMatch(pending, /href="\/subscriptions"/);
  const wired = renderPayments(state, { onShowAll() {} });
  assert.doesNotMatch(wired, / disabled(?:=""|>| )|Полный список списаний скоро будет доступен/);
});

test('empty or all-past payments do not render rows or an enabled All button', () => {
  for (const payments of [[], [paymentItems[2]]]) {
    const html = renderPayments({ kind: 'ready', payments }, { onShowAll() {} });
    assert.match(html, /Предстоящих списаний нет/);
    assert.match(html, /disabled/);
    assert.doesNotMatch(html, /<table|<time/);
  }
});

test('loading renders four skeleton icons and no stale payments', () => {
  const html = renderPayments({ kind: 'loading' });
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /role="status"/);
  assert.equal((html.match(/!rounded-full/g) || []).length, 4);
  assert.doesNotMatch(html, /<time|₽/);
});

test('unavailable API and error states never fabricate zero amounts or expose server details', () => {
  const unavailable = renderPayments({ kind: 'unavailable' });
  assert.match(unavailable, /API ближайших списаний пока не подключён/);
  assert.doesNotMatch(unavailable, /₽|<time|Повторить загрузку списаний/);
  const error = renderPayments({ kind: 'error', message: 'private-server-detail' });
  assert.match(error, /role="alert"/);
  assert.match(error, /Повторить загрузку списаний/);
  assert.doesNotMatch(error, /private-server-detail|₽|<time/);
});

test('payment text is escaped and long names remain intact with wrapping styles', () => {
  const html = renderPayments({ kind: 'ready', payments: [{
    id: 'long', name: '<script>alert(1)</script>' + 'ДлинноеНазвание'.repeat(12), date: '2026-11-02', amountMinor: 12345,
  }] });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Категория не указана/);
  assert.match(html, /123,45\s₽/);
  assert.match(html, /overflow-wrap:anywhere/);
});

const renderModal = (Component, props) => renderToStaticMarkup(createElement(MemoryRouter, null,
  createElement(Component, { onClose() {}, ...props })));

test('full payments popup excludes past records, includes all six future charges and totals them without mutation', () => {
  const payments = [6, 3, 1, 5, 4, 2].map((day) => ({ id: String(day), name: `Future ${day}`, date: `2099-11-0${day}`, amountMinor: 10000 }));
  payments.push({ id: 'past', name: 'Expired payment', date: '2000-01-01', amountMinor: 999999 });
  const before = structuredClone(payments);
  const html = renderModal(UpcomingPaymentsModal, { payments });
  assert.equal((html.match(/<time /g) || []).length, 6);
  assert.doesNotMatch(html, /Expired payment/);
  assert.match(html, /600[\s,]00\s₽/);
  assert.ok(html.indexOf('Future 1') < html.indexOf('Future 6'));
  assert.match(html, /<dialog/);
  assert.match(html, /href="\/subscriptions"/);
  assert.deepEqual(payments, before);
});

test('payments popup has a genuine empty state for an all-past list', () => {
  const html = renderModal(UpcomingPaymentsModal, { payments: [{ id: 'past', name: 'Expired', date: '2000-01-01', amountMinor: 10000 }] });
  assert.match(html, /Предстоящих списаний нет/);
  assert.doesNotMatch(html, /<time /);
});

test('category popup retains the supplied month even outside the current year and exposes exact totals and percentages', () => {
  const html = renderModal(CategoryDetailsModal, { month: '2025-02', categories: [
    { id: 'a', name: 'Кино', amountMinor: 10000 }, { id: 'b', name: 'Музыка', amountMinor: 30000 },
  ] });
  assert.match(html, /option value="2025-02" selected/);
  assert.match(html, /400[\s,]00\s₽/);
  assert.match(html, /aria-valuenow="25"/);
  assert.match(html, /aria-valuenow="75"/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test('details trigger is exposed only when wired; zero expense popup stays empty', () => {
  const chart = renderToStaticMarkup(createElement(CategoryChart, { categories: [{ id: 'a', name: 'Кино', amountMinor: 10000 }], onOpenDetails() {} }));
  assert.match(chart, /aria-haspopup="dialog"/);
  assert.match(chart, /Подробнее/);
  const empty = renderModal(CategoryDetailsModal, { month: '2026-11', categories: [] });
  assert.match(empty, /За этот месяц расходов нет/);
  assert.doesNotMatch(empty, /role="progressbar"/);
});
