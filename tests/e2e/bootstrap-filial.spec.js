import { test, expect } from '@playwright/test';
import { injectRuntimeConfig, openSetup, performLogin, requireLoginEnv, selectFirstFilialAndEnter, expectBootstrapOk } from './support/ui-core.helpers.js';

test.describe('UI Core - Bootstrap da Filial', () => {
  test.beforeEach(async ({ page }) => {
    await injectRuntimeConfig(page);
  });

  test('selecionar filial leva ao bootstrap minimo do app', async ({ page }) => {
    requireLoginEnv(test);

    await openSetup(page);
    await performLogin(page);
    await expect.poll(async () => page.evaluate(() => document.body.dataset.setupState || '')).toBe('filiais-ready');
    await selectFirstFilialAndEnter(page, test);

    await expectBootstrapOk(page);
    await expect(page.locator('#setup-form')).toBeHidden();
  });
});
