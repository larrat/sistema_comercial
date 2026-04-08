import { test, expect } from '@playwright/test';
import { injectRuntimeConfig, openSetup, performLogin, requireLoginEnv } from './support/ui-core.helpers.js';

test.describe('UI Core - Login', () => {
  test.beforeEach(async ({ page }) => {
    await injectRuntimeConfig(page);
  });

  test('login autenticado fecha o gate inicial', async ({ page }) => {
    requireLoginEnv(test);

    await openSetup(page);
    await performLogin(page);

    await expect.poll(async () => page.evaluate(() => document.body.dataset.setupState || '')).toMatch(/filiais-ready|primeira-filial/);
    await expect(page.locator('#setup-auth')).toBeHidden();
    await expect(page.locator('#fil-grid')).toBeVisible();
  });
});
