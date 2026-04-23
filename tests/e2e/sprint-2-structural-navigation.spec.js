import { test, expect } from '@playwright/test';
import {
  injectRuntimeConfig,
  openSetup,
  performLogin,
  requireLoginEnv,
  selectFirstFilialAndEnter,
  expectBootstrapOk
} from './support/ui-core.helpers.js';

const MENU_GROUPS = [
  ['Inicio', 'Início'],
  ['Cadastros', 'Cadastros'],
  ['Vendas', 'Vendas'],
  ['Financeiro', 'Financeiro'],
  ['Estoque', 'Estoque'],
  ['Marketing', 'Marketing'],
  ['Administracao', 'Administração']
];

const CORE_NAV_PAGES = [
  ['dashboard', /Painel do dia/i],
  ['clientes', /Clientes/i],
  ['pedidos', /Pedidos/i],
  ['receber', /Contas a receber/i],
  ['cotacao', /Compras/i],
  ['estoque', /Estoque/i],
  ['gerencial', /Análises/i],
  ['relatorios', /Relatórios/i],
  ['notificacoes', /Alertas e pendências/i]
];

async function expectCurrentPage(page, pageName) {
  await expect.poll(async () => page.evaluate(() => document.body.dataset.currentPage || '')).toBe(
    pageName
  );
  await expect.poll(async () => page.evaluate(() => document.body.dataset.navState || '')).toBe(
    'ready'
  );
}

test.describe('Sprint 2 - Navegação estrutural', () => {
  test.beforeEach(async ({ page }) => {
    await injectRuntimeConfig(page);
  });

  test('menu por contexto reduz memorizacao e nao expõe RCA nos rotulos centrais', async ({
    page
  }) => {
    requireLoginEnv(test);

    await openSetup(page);
    await performLogin(page);
    await selectFirstFilialAndEnter(page, test);
    await expectBootstrapOk(page);

    for (const [groupKey, label] of MENU_GROUPS) {
      const group = page.locator(`.sb-nav .sb-group[data-group="${groupKey}"]`);
      await expect(group).toHaveCount(1);
      await expect(group.locator('.nl')).toHaveText(label);
    }

    const adminGroup = page.locator('.sb-nav .sb-group[data-group="Administracao"]');
    await expect(adminGroup.locator('[data-p="filiais"]')).toHaveAttribute('data-label', 'Filiais');
    await expect(adminGroup.locator('[data-p="acessos"]')).toHaveAttribute(
      'data-label',
      'Acessos e permissões'
    );

    for (const [pageName, title] of CORE_NAV_PAGES) {
      const navItem = page.locator(`.sb-nav .ni[data-p="${pageName}"]`);
      if (!(await navItem.isVisible())) continue;
      await navItem.click();
      await expectCurrentPage(page, pageName);
      await expect(page.locator('#app-title')).toHaveText(title);
    }

    await page.locator('#sb-search').fill('receber');
    await page.keyboard.press('Enter');
    await expectCurrentPage(page, 'receber');

    await expect(page.locator('body')).not.toContainText(/\bRCA\b/);
  });
});
