import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const compiler = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-profile-tests',
  server: { middlewareMode: true, watch: null, hmr: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  esbuild: { jsx: 'automatic' },
});

after(() => compiler.close());
// Load the provider through the same compiler to share its context with AppLayout.
const { AuthProvider } = await compiler.ssrLoadModule('/src/auth/AuthProvider.tsx');
const { default: AppLayout } = await compiler.ssrLoadModule('/src/components/AppLayout.tsx');

for (const path of ['/dashboard', '/subscriptions', '/subscriptions/new', '/subscriptions/1/edit', '/settings']) {
  test(`profile opens settings from ${path}`, () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [path] },
      createElement(AuthProvider, null, createElement(AppLayout))));
    const profile = html.match(/<a\b[^>]*aria-label="Аккаунт — настройки"[^>]*>[\s\S]*?<\/a>/g) || [];

    assert.equal(profile.length, 1, 'the shared header has one accessible profile link');
    assert.match(profile[0], /href="\/settings"/);
    assert.match(profile[0], /<img\b[^>]*alt=""/);
    if (path === '/settings') assert.match(profile[0], /aria-current="page"/);
    else assert.doesNotMatch(profile[0], /aria-current=/);
  });
}
