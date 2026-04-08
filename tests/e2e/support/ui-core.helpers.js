import { expect } from '@playwright/test';

export const E2E_LOGIN_EMAIL = process.env.E2E_LOGIN_EMAIL || '';
export const E2E_LOGIN_PASSWORD = process.env.E2E_LOGIN_PASSWORD || '';
export const E2E_SUPABASE_URL = process.env.E2E_SUPABASE_URL || '';
export const E2E_SUPABASE_KEY = process.env.E2E_SUPABASE_KEY || '';

export async function injectRuntimeConfig(page) {
  await page.addInitScript((config) => {
    window.__SC_ALLOW_LEGACY_SUPABASE_DEFAULTS__ = false;
    window.__SC_E2E_MODE__ = true;
    window.__SC_E2E_UI_CORE__ = true;
    if (config.url) window.__SC_SUPABASE_URL__ = config.url;
    if (config.key) window.__SC_SUPABASE_KEY__ = config.key;
  }, {
    url: E2E_SUPABASE_URL,
    key: E2E_SUPABASE_KEY
  });
}

export function requireLoginEnv(test) {
  test.skip(!E2E_LOGIN_EMAIL || !E2E_LOGIN_PASSWORD, 'Defina E2E_LOGIN_EMAIL e E2E_LOGIN_PASSWORD para executar o fluxo real.');
}

export async function openSetup(page) {
  await page.goto('/');
  await expect.poll(async () => page.evaluate(() => document.body.dataset.currentScreen || '')).toBe('screen-setup');
  await expect.poll(async () => page.evaluate(() => document.body.dataset.setupState || '')).not.toBe('');
  await expect(page.locator('#screen-setup')).toBeVisible();
  await expect(page.locator('#auth-email')).toBeVisible();
  await expect(page.locator('#auth-password')).toBeVisible();
}

export async function performLogin(page) {
  await page.locator('#auth-email').fill(E2E_LOGIN_EMAIL);
  await page.locator('#auth-password').fill(E2E_LOGIN_PASSWORD);
  await page.locator('#auth-login-btn').click();
  await expect.poll(async () => page.evaluate(() => document.body.dataset.authFlow || '')).toBe('authenticated');
  await expect.poll(async () => page.evaluate(() => document.body.dataset.authGate || '')).toBe('authenticated');
  await expect.poll(async () => page.evaluate(() => document.body.dataset.setupState || '')).toMatch(/filiais-ready|primeira-filial/);
  await expect(page.locator('#setup-auth')).toBeHidden();
}

export async function selectFirstFilialAndEnter(page, test) {
  const filiais = page.locator('#fil-grid .fil-opt');
  const count = await filiais.count();

  if (!count) {
    test.skip(true, 'Ambiente sem filiais para automacao do setup. Criacao da primeira filial permanece manual no inicio da Onda B.');
  }

  await filiais.first().click();
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect.poll(async () => page.evaluate(() => document.body.dataset.bootstrapState || '')).not.toBe('starting');
}

export async function expectBootstrapOk(page) {
  await expect.poll(async () => page.evaluate(() => document.body.dataset.bootstrapState || '')).toBe('ready');
  await expect.poll(async () => page.evaluate(() => document.body.dataset.runtimeBootstrap || '')).toBe('ready');
  await expect.poll(async () => page.evaluate(() => document.body.dataset.runtimeLoading || '')).toBe('false');
  await expect.poll(async () => page.evaluate(() => document.body.dataset.currentScreen || '')).toBe('screen-app');
  await expect.poll(async () => page.evaluate(() => document.body.dataset.currentPage || '')).toBe('dashboard');
  await expect.poll(async () => page.evaluate(() => document.body.dataset.navState || '')).toBe('ready');
  await expect(page.locator('#screen-app')).toBeVisible();
  await expect(page.locator('#screen-setup')).toBeHidden();
  await expect(page.locator('#app-title')).toBeVisible();
  await expect(page.locator('#sb-fname')).not.toHaveText('-');
}
