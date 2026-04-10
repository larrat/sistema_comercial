import { test, expect } from '@playwright/test';
import {
  injectRuntimeConfig,
  openSetup,
  performLogin,
  requireLoginEnv
} from './support/ui-core.helpers.js';

test.describe('UI Core - Setup de Filial', () => {
  test.beforeEach(async ({ page }) => {
    await injectRuntimeConfig(page);
  });

  test('usuario autenticado visualiza filiais ou entra em modo de criacao inicial', async ({
    page
  }) => {
    requireLoginEnv(test);

    await openSetup(page);
    await performLogin(page);

    const setupState = await page.evaluate(() => document.body.dataset.setupState || '');

    const filiais = page.locator('#fil-grid .fil-opt');
    const setupForm = page.locator('#setup-form');
    const setupActions = page.locator('#setup-actions');

    const hasFiliais = (await filiais.count()) > 0;

    if (hasFiliais) {
      expect(setupState).toBe('filiais-ready');
      await expect(filiais.first()).toBeVisible();
      await expect(setupActions).toBeVisible();
      await expect(setupForm).toBeHidden();
      return;
    }

    expect(setupState).toBe('primeira-filial');
    await expect(setupForm).toBeVisible();
    await expect(setupActions).toBeHidden();
  });
});
