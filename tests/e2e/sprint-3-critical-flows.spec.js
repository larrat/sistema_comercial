import { test, expect } from '@playwright/test';
import {
  bootstrapToApp,
  reloadAndWaitApp,
  navigateToPage,
  getApiContext,
  makeSmokeLabel,
  findOneByName,
  deleteById,
  createProduto,
  createCliente,
  createPedido,
  createContaReceber,
  createFornecedor,
  listContasByPedido,
  listBaixasByConta
} from './support/app-smoke.helpers.js';

test.describe('Sprint 3 - Smoke dos fluxos críticos', () => {
  test('cadastro de produto via modal legado', async ({ page }) => {
    const produtoNome = makeSmokeLabel('E2E Produto');
    let ctx = null;
    let produtoId = null;

    try {
      await bootstrapToApp(page, test);
      ctx = await getApiContext(page);

      await navigateToPage(page, 'produtos');
      await page.locator('#app-act-primary').click();

      await expect(page.locator('#modal-produto')).toHaveClass(/on/);
      await page.locator('#p-nome').fill(produtoNome);
      await page.locator('#p-sku').fill(`SKU-${Date.now()}`);
      await page.locator('#p-custo').fill('12.50');
      await page.locator('#prod-flow-save').click();

      await expect
        .poll(async () =>
          page.locator('#modal-produto').evaluate((el) => el.classList.contains('on'))
        )
        .toBe(false);
      await expect(page.locator('#prod-lista')).toContainText(produtoNome);

      const produto = await findOneByName(ctx, 'produtos', ctx.filialId, 'nome', produtoNome);
      produtoId = produto?.id || null;
      expect(produtoId).toBeTruthy();
    } finally {
      if (ctx && produtoId) {
        await deleteById(ctx, 'produtos', produtoId);
      }
    }
  });

  test('cadastro de cliente via fluxo React', async ({ page }) => {
    const clienteNome = makeSmokeLabel('E2E Cliente');
    let ctx = null;
    let clienteId = null;

    try {
      await bootstrapToApp(page, test);
      ctx = await getApiContext(page);

      await navigateToPage(page, 'clientes');
      await expect(page.locator('[data-testid="cliente-list-view"]')).toBeVisible();
      await page.locator('#app-act-primary').click();

      await expect(page.locator('[data-testid="cliente-form"]')).toBeVisible();
      await page.locator('[data-testid="form-nome"]').fill(clienteNome);
      await page.locator('[data-testid="form-email"]').fill(`e2e.${Date.now()}@teste.local`);
      await page.locator('[data-testid="salvar-btn"]').click();

      await expect(page.locator('[data-testid="cliente-detail-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="cliente-detail-panel"]')).toContainText(clienteNome);

      const cliente = await findOneByName(ctx, 'clientes', ctx.filialId, 'nome', clienteNome);
      clienteId = cliente?.id || null;
      expect(clienteId).toBeTruthy();
    } finally {
      if (ctx && clienteId) {
        await deleteById(ctx, 'clientes', clienteId);
      }
    }
  });

  test('novo pedido via fluxo React', async ({ page }) => {
    const produtoNome = makeSmokeLabel('E2E Produto Pedido');
    const clienteNome = makeSmokeLabel('E2E Cliente Pedido');
    let ctx = null;
    let produtoId = null;
    let clienteId = null;
    let pedidoId = null;

    try {
      await bootstrapToApp(page, test);
      ctx = await getApiContext(page);

      const produto = await createProduto(ctx, {
        id: crypto.randomUUID(),
        filial_id: ctx.filialId,
        nome: produtoNome,
        sku: `SKU-PED-${Date.now()}`,
        un: 'un',
        cat: 'E2E',
        custo: 15,
        mkv: 20,
        mka: 10,
        pfa: 16.5,
        qtmin: 1,
        dv: 0,
        da: 0,
        emin: 0,
        esal: 10,
        ecm: 15
      });
      produtoId = produto.id;

      const cliente = await createCliente(ctx, {
        id: crypto.randomUUID(),
        filial_id: ctx.filialId,
        nome: clienteNome,
        tipo: 'PJ',
        status: 'ativo',
        prazo: '30d',
        tab: 'padrao'
      });
      clienteId = cliente.id;

      await reloadAndWaitApp(page, test);
      await navigateToPage(page, 'pedidos');
      await expect(page.locator('[data-testid="pedido-list-view"]')).toBeVisible();
      await page.locator('[data-testid="pedido-novo-btn"]').click();

      await expect(page.locator('[data-testid="pedido-form"]')).toBeVisible();
      await page.locator('[data-testid="pedido-form-cli"]').fill(clienteNome);
      await page.locator('[data-testid="pedido-item-prod"]').selectOption(produtoId);
      await page.locator('[data-testid="pedido-item-add-btn"]').click();
      await page.locator('[data-testid="pedido-form-submit"]').click();

      await expect(page.locator('[data-testid="pedido-detail-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="pedido-detail-panel"]')).toContainText(clienteNome);

      const pedidos = await fetch(
        `${ctx.url}/rest/v1/pedidos?filial_id=eq.${encodeURIComponent(ctx.filialId)}&cli=eq.${encodeURIComponent(clienteNome)}&order=num.desc`,
        {
          headers: {
            apikey: ctx.key,
            Authorization: `Bearer ${ctx.token}`
          }
        }
      ).then((res) => res.json());
      pedidoId = Array.isArray(pedidos) && pedidos[0] ? pedidos[0].id : null;
      expect(pedidoId).toBeTruthy();
    } finally {
      if (ctx && pedidoId) {
        const contas = await listContasByPedido(ctx, pedidoId);
        for (const conta of contas) {
          const baixas = await listBaixasByConta(ctx, conta.id);
          for (const baixa of baixas) await deleteById(ctx, 'contas_receber_baixas', baixa.id);
          await deleteById(ctx, 'contas_receber', conta.id);
        }
        await deleteById(ctx, 'pedidos', pedidoId);
      }
      if (ctx && clienteId) await deleteById(ctx, 'clientes', clienteId);
      if (ctx && produtoId) await deleteById(ctx, 'produtos', produtoId);
    }
  });

  test('baixa parcial no detalhe do pedido', async ({ page }) => {
    const produtoNome = makeSmokeLabel('E2E Produto Receber');
    const clienteNome = makeSmokeLabel('E2E Cliente Receber');
    const pedidoId = crypto.randomUUID();
    const contaId = crypto.randomUUID();
    let ctx = null;
    let produtoId = null;
    let clienteId = null;

    try {
      await bootstrapToApp(page, test);
      ctx = await getApiContext(page);

      const produto = await createProduto(ctx, {
        id: crypto.randomUUID(),
        filial_id: ctx.filialId,
        nome: produtoNome,
        sku: `SKU-REC-${Date.now()}`,
        un: 'un',
        cat: 'E2E',
        custo: 20,
        mkv: 25,
        mka: 15,
        pfa: 23,
        qtmin: 1,
        dv: 0,
        da: 0,
        emin: 0,
        esal: 20,
        ecm: 20
      });
      produtoId = produto.id;

      const cliente = await createCliente(ctx, {
        id: crypto.randomUUID(),
        filial_id: ctx.filialId,
        nome: clienteNome,
        tipo: 'PJ',
        status: 'ativo',
        prazo: '30d',
        tab: 'padrao'
      });
      clienteId = cliente.id;

      await createPedido(ctx, {
        id: pedidoId,
        filial_id: ctx.filialId,
        num: Date.now(),
        cli: clienteNome,
        cliente_id: clienteId,
        rca_id: null,
        rca_nome: null,
        data: new Date().toISOString().slice(0, 10),
        status: 'entregue',
        pgto: 'boleto',
        prazo: '30d',
        tipo: 'varejo',
        obs: 'Smoke baixa parcial',
        itens: [
          {
            prodId: produtoId,
            nome: produtoNome,
            un: 'un',
            qty: 2,
            preco: 25,
            custo: 20,
            custo_base: 20,
            preco_base: 25,
            orig: 'estoque'
          }
        ],
        total: 50
      });

      await createContaReceber(ctx, {
        id: contaId,
        filial_id: ctx.filialId,
        pedido_id: pedidoId,
        pedido_num: Date.now(),
        cliente_id: clienteId,
        cliente: clienteNome,
        valor: 50,
        valor_recebido: 0,
        valor_em_aberto: 50,
        vencimento: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        status: 'pendente',
        recebido_em: null,
        ultimo_recebimento_em: null,
        obs: 'Smoke baixa parcial'
      });

      await reloadAndWaitApp(page, test);
      await navigateToPage(page, 'pedidos');
      await page.locator('[data-testid="pedido-busca"]').fill(clienteNome);

      const rowTitle = page.locator(`[data-testid^="pedido-row-title-"]`).first();
      await expect(rowTitle).toBeVisible();
      await rowTitle.click();

      await expect(page.locator('[data-testid="pedido-detail-panel"]')).toBeVisible();
      await page.locator('[data-testid="pedido-detail-baixa-parcial"]').click();
      await page.locator('input[placeholder="0,00"]').fill('20');
      await page.locator('[data-testid="pedido-detail-confirmar-baixa"]').click();

      await expect(page.locator('[data-testid="pedido-detail-panel"]')).toContainText('Parcial');
      await expect(page.locator('[data-testid="pedido-detail-panel"]')).toContainText('R$ 20,00');

      const baixas = await listBaixasByConta(ctx, contaId);
      expect(baixas.length).toBeGreaterThan(0);
    } finally {
      if (ctx) {
        const baixas = await listBaixasByConta(ctx, contaId);
        for (const baixa of baixas) await deleteById(ctx, 'contas_receber_baixas', baixa.id);
        await deleteById(ctx, 'contas_receber', contaId);
        await deleteById(ctx, 'pedidos', pedidoId);
      }
      if (ctx && clienteId) await deleteById(ctx, 'clientes', clienteId);
      if (ctx && produtoId) await deleteById(ctx, 'produtos', produtoId);
    }
  });

  test('importacao de cotacao com mapeamento de planilha', async ({ page }) => {
    const fornecedorNome = makeSmokeLabel('E2E Fornecedor');
    const produtoImportado = makeSmokeLabel('E2E Item Importado');
    const arquivoNome = `cotacao-${Date.now()}.csv`;
    let ctx = null;
    let fornecedorId = null;
    let produtoId = null;

    try {
      await bootstrapToApp(page, test);
      ctx = await getApiContext(page);

      const fornecedor = await createFornecedor(ctx, {
        id: crypto.randomUUID(),
        filial_id: ctx.filialId,
        nome: fornecedorNome,
        contato: 'Smoke Sprint 3',
        prazo: '7'
      });
      fornecedorId = fornecedor.id;

      await reloadAndWaitApp(page, test);
      await navigateToPage(page, 'cotacao');

      await page.locator('#cot-forn-sel').selectOption(fornecedorId);
      await page.locator('#cot-tc-importar input[type="file"]').setInputFiles({
        name: arquivoNome,
        mimeType: 'text/csv',
        buffer: Buffer.from(`produto;preco\n${produtoImportado};17,90\n`, 'utf-8')
      });

      await expect(page.locator('#modal-mapa')).toHaveClass(/on/);
      await expect(page.locator('#mapa-body')).toContainText(produtoImportado);
      await page.locator('button:has-text("Confirmar importação")').click();

      await expect
        .poll(async () => page.locator('#modal-mapa').evaluate((el) => el.classList.contains('on')))
        .toBe(false);
      await expect(page.locator('#cot-logs')).toContainText(arquivoNome);

      const produto = await findOneByName(ctx, 'produtos', ctx.filialId, 'nome', produtoImportado);
      produtoId = produto?.id || null;
      expect(produtoId).toBeTruthy();
    } finally {
      if (ctx && produtoId) await deleteById(ctx, 'produtos', produtoId);
      if (ctx && fornecedorId) await deleteById(ctx, 'fornecedores', fornecedorId);
    }
  });
});
