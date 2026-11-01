import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
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
