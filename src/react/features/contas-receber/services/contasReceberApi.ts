import type { ContaReceber, ContaReceberBaixa } from '../../../../types/domain';

export type CrApiContext = {
  url: string;
  key: string;
  token: string;
  filialId: string;
};

function headers(key: string, token: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function ensureOk(res: Response, body: unknown, fallback: string): void {
  if (res.ok) return;
  if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
    throw new Error(body.message);
  }
  throw new Error(`${fallback}: ${res.status}`);
}

export async function listContas(ctx: CrApiContext): Promise<ContaReceber[]> {
  const res = await fetch(
    `${ctx.url}/rest/v1/contas_receber?filial_id=eq.${encodeURIComponent(ctx.filialId)}&order=vencimento.asc`,
    { headers: headers(ctx.key, ctx.token), signal: AbortSignal.timeout(12000) }
  );
  const body = await readJson(res);
  ensureOk(res, body, 'Erro ao carregar contas a receber');
  return Array.isArray(body) ? (body as ContaReceber[]) : [];
}

export async function listBaixas(ctx: CrApiContext): Promise<ContaReceberBaixa[]> {
  const res = await fetch(
    `${ctx.url}/rest/v1/contas_receber_baixas?filial_id=eq.${encodeURIComponent(ctx.filialId)}&order=recebido_em.desc`,
    { headers: headers(ctx.key, ctx.token), signal: AbortSignal.timeout(12000) }
  );
  const body = await readJson(res);
  ensureOk(res, body, 'Erro ao carregar baixas');
  return Array.isArray(body) ? (body as ContaReceberBaixa[]) : [];
}

export async function upsertConta(ctx: CrApiContext, conta: ContaReceber): Promise<void> {
  const res = await fetch(`${ctx.url}/rest/v1/contas_receber`, {
    method: 'POST',
    headers: {
      ...headers(ctx.key, ctx.token),
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify(conta),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, 'Erro ao atualizar conta');
}

export async function createBaixa(ctx: CrApiContext, baixa: ContaReceberBaixa): Promise<void> {
  const res = await fetch(`${ctx.url}/rest/v1/contas_receber_baixas`, {
    method: 'POST',
    headers: {
      ...headers(ctx.key, ctx.token),
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify(baixa),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, 'Erro ao registrar baixa');
}

export async function deleteBaixa(ctx: CrApiContext, baixaId: string): Promise<void> {
  const res = await fetch(
    `${ctx.url}/rest/v1/contas_receber_baixas?id=eq.${encodeURIComponent(baixaId)}`,
    { method: 'DELETE', headers: headers(ctx.key, ctx.token), signal: AbortSignal.timeout(12000) }
  );
  if (!res.ok) throw new Error(`Erro ao remover baixa: ${res.status}`);
}

export async function deleteBaixasByConta(ctx: CrApiContext, contaId: string): Promise<void> {
  const res = await fetch(
    `${ctx.url}/rest/v1/contas_receber_baixas?conta_receber_id=eq.${encodeURIComponent(contaId)}`,
    { method: 'DELETE', headers: headers(ctx.key, ctx.token), signal: AbortSignal.timeout(12000) }
  );
  if (!res.ok) throw new Error(`Erro ao remover baixas: ${res.status}`);
}

export async function registrarBaixaRpc(
  ctx: CrApiContext,
  params: {
    baixaId: string;
    contaId: string;
    valor: number;
    recebidoEm: string;
    observacao: string | null;
  }
): Promise<void> {
  const res = await fetch(`${ctx.url}/rest/v1/rpc/rpc_registrar_baixa`, {
    method: 'POST',
    headers: headers(ctx.key, ctx.token),
    body: JSON.stringify({
      p_baixa_id: params.baixaId,
      p_conta_receber_id: params.contaId,
      p_valor: params.valor,
      p_recebido_em: params.recebidoEm,
      p_observacao: params.observacao
    }),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, 'Erro ao registrar baixa');
}

export async function estornarBaixaRpc(ctx: CrApiContext, baixaId: string): Promise<void> {
  const res = await fetch(`${ctx.url}/rest/v1/rpc/rpc_estornar_baixa`, {
    method: 'POST',
    headers: headers(ctx.key, ctx.token),
    body: JSON.stringify({ p_baixa_id: baixaId }),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, 'Erro ao estornar baixa');
}

export async function marcarContaPendenteRpc(ctx: CrApiContext, contaId: string): Promise<void> {
  const res = await fetch(`${ctx.url}/rest/v1/rpc/rpc_marcar_conta_pendente`, {
    method: 'POST',
    headers: headers(ctx.key, ctx.token),
    body: JSON.stringify({ p_conta_receber_id: contaId }),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, 'Erro ao desfazer recebimento');
}
