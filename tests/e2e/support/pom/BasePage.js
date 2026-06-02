/**
 * Aplicação da skill: e2e-testing-patterns
 * Benefício: Abstrai a lógica de navegação e isola os seletores da página base,
 * reduzindo a quebra de testes (brittleness) ao longo do tempo.
 */

export class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle');
  }

  async isVisible(selector) {
    return await this.page.locator(selector).isVisible();
  }

  async click(selector) {
    await this.page.locator(selector).click();
  }

  async fill(selector, text) {
    await this.page.locator(selector).fill(text);
  }
}
