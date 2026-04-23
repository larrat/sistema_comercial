import { expect } from '@playwright/test';
import {
  injectRuntimeConfig,
  openSetup,
  performLogin,
  requireLoginEnv,
  selectFirstFilialAndEnter,
  expectBootstrapOk
} from './ui-core.helpers.js';

export function makeSmokeLabel(prefix) {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export async function bootstrapToApp(page, test) {
  requireLoginEnv(test);
  await injectRuntimeConfig(page);
  await openSetup(page);
  await performLogin(page);

  const setupState = await page.evaluate(() => document.body.dataset.setupState || '');
  if (setupState === 'filiais-ready') {
    await selectFirstFilialAndEnter(page, test);
    await expectBootstrapOk(page);
    return;
  }

  if (setupState === 'primeira-filial') {
    test.skip(
      true,
      'Ambiente sem filial pronta para os smoke tests da Sprint 3. Execute com um usuário já vinculado a uma filial.'
    );
  }

  throw new Error(`Estado de setup inesperado: ${setupState}`);
}

export async function reloadAndWaitApp(page, test) {
  await page.reload();

  await expect
    .poll(async () => page.evaluate(() => document.body.dataset.currentScreen || ''))
    .not.toBe('');

  const currentScreen = await page.evaluate(() => document.body.dataset.currentScreen || '');
  if (currentScreen === 'screen-setup') {
    const setupState = await page.evaluate(() => document.body.dataset.setupState || '');
    if (setupState === 'filiais-ready') {
      await selectFirstFilialAndEnter(page, test);
    }
  }

  await expectBootstrapOk(page);
}

export async function navigateToPage(page, pageKey) {
  const navButton = page.locator(`.sb-nav .ni[data-p="${pageKey}"]`).first();
  await expect(navButton).toBeVisible();
  await navButton.click();
  await expect
    .poll(async () => page.evaluate(() => document.body.dataset.currentPage || ''))
    .toBe(pageKey);
  await expect(page.locator(`#pg-${pageKey}`)).toHaveClass(/on/);
}

export async function getApiContext(page) {
  return page.evaluate(() => {
    const rawSession = localStorage.getItem('sc_auth_session_v1');
    const session = rawSession ? JSON.parse(rawSession) : null;
    return {
      url: window.__SC_SUPABASE_URL__ || localStorage.getItem('sc_supabase_url') || '',
      key: window.__SC_SUPABASE_KEY__ || localStorage.getItem('sc_supabase_key') || '',
      token: session?.access_token || '',
      filialId: localStorage.getItem('sc_filial_id') || ''
    };
  });
}

function buildHeaders(ctx, prefer) {
  return {
    apikey: ctx.key,
    Authorization: `Bearer ${ctx.token}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {})
  };
}

export async function sbFetch(ctx, path, options = {}) {
  const res = await fetch(`${ctx.url}/rest/v1/${path}`, {
    method: options.method || 'GET',
    headers: buildHeaders(ctx, options.prefer),
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await res.text().catch(() => '');
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    throw new Error(
      `${options.method || 'GET'} ${path} falhou (${res.status})${body?.message ? `: ${body.message}` : ''}`
    );
  }

  return body;
}

export async function findOneByName(ctx, table, filialId, field, value) {
  const query = `${table}?filial_id=eq.${encodeURIComponent(filialId)}&${field}=eq.${encodeURIComponent(value)}&limit=1`;
  const rows = await sbFetch(ctx, query);
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

export async function deleteById(ctx, table, id) {
  if (!id) return;
  await sbFetch(ctx, `${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function createFornecedor(ctx, fornecedor) {
  const rows = await sbFetch(ctx, 'fornecedores?on_conflict=id', {
    method: 'POST',
    body: fornecedor,
    prefer: 'resolution=merge-duplicates,return=representation'
  });
  return Array.isArray(rows) && rows[0] ? rows[0] : fornecedor;
}

export async function createProduto(ctx, produto) {
  const rows = await sbFetch(ctx, 'produtos?on_conflict=id', {
    method: 'POST',
    body: produto,
    prefer: 'resolution=merge-duplicates,return=representation'
  });
  return Array.isArray(rows) && rows[0] ? rows[0] : produto;
}

export async function createCliente(ctx, cliente) {
  const rows = await sbFetch(ctx, 'clientes?on_conflict=id', {
    method: 'POST',
    body: cliente,
    prefer: 'resolution=merge-duplicates,return=representation'
  });
  return Array.isArray(rows) && rows[0] ? rows[0] : cliente;
}

export async function createPedido(ctx, pedido) {
  const rows = await sbFetch(ctx, 'pedidos?on_conflict=id', {
    method: 'POST',
    body: {
      ...pedido,
      itens: JSON.stringify(pedido.itens)
    },
    prefer: 'resolution=merge-duplicates,return=representation'
  });
  return Array.isArray(rows) && rows[0] ? rows[0] : pedido;
}

export async function createContaReceber(ctx, conta) {
  const rows = await sbFetch(ctx, 'contas_receber?on_conflict=id', {
    method: 'POST',
    body: conta,
    prefer: 'resolution=merge-duplicates,return=representation'
  });
  return Array.isArray(rows) && rows[0] ? rows[0] : conta;
}

export async function listContasByPedido(ctx, pedidoId) {
  const rows = await sbFetch(
    ctx,
    `contas_receber?filial_id=eq.${encodeURIComponent(ctx.filialId)}&pedido_id=eq.${encodeURIComponent(pedidoId)}`
  );
  return Array.isArray(rows) ? rows : [];
}

export async function listBaixasByConta(ctx, contaId) {
  const rows = await sbFetch(
    ctx,
    `contas_receber_baixas?filial_id=eq.${encodeURIComponent(ctx.filialId)}&conta_receber_id=eq.${encodeURIComponent(contaId)}`
  );
  return Array.isArray(rows) ? rows : [];
}

export async function waitForToast(page) {
  await expect
    .poll(async () => page.locator('.toast, .ntf, .empty-inline, .bdg.bg, .bdg.ba').count())
    .toBeGreaterThan(0);
}
