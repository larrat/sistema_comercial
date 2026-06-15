import { normalizePedStatus } from '../../pedidos/types';
import type { ContaReceber, ContaReceberBaixa } from '../../../../types/domain';

import type { ApiContext } from '../../../shared/types/api';
export type CrApiContext = ApiContext;

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

export async function listContas(ctx: CrApiContext, diasHistorico = 90): Promise<ContaReceber[]> {
  // Limita ao período configurado (padrão: últimos 90 dias) para não carregar
  // milhares de registros no browser. Contas mais antigas podem ser buscadas
  // aumentando diasHistorico ou criando um relatório histórico separado.
  const dataLimite = new Date(Date.now() - diasHistorico * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const res = await fetch(
    `${ctx.url}/rest/v1/contas_receber` +
      `?filial_id=eq.${encodeURIComponent(ctx.filialId)}` +
      `&or=(status.eq.pendente,status.eq.parcial,status.eq.cancelado,vencimento.gte.${dataLimite})` +
      `&order=vencimento.asc` +
      `&limit=500`,
    { headers: headers(ctx.key, ctx.token), signal: AbortSignal.timeout(12000) }
  );
  const body = await readJson(res);
  ensureOk(res, body, 'Erro ao carregar contas a receber');
  return Array.isArray(body) ? (body as ContaReceber[]) : [];
}

export async function listBaixas(ctx: CrApiContext, diasHistorico = 90): Promise<ContaReceberBaixa[]> {
  const dataLimite = new Date(Date.now() - diasHistorico * 24 * 60 * 60 * 1000).toISOString();

  const res = await fetch(
    `${ctx.url}/rest/v1/contas_receber_baixas` +
      `?filial_id=eq.${encodeURIComponent(ctx.filialId)}` +
      `&recebido_em=gte.${encodeURIComponent(dataLimite)}` +
      `&order=recebido_em.desc` +
      `&limit=500`,
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
  // Nota: O lançamento de caixa é feito automaticamente pelo trigger
  // trg_caixa_auto_baixas → fn_log_caixa_auto() no banco de dados.
  // Não inserir aqui para evitar duplicidade.
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

const PRAZO_DIAS: Record<string, number> = {
  '7d': 7,
  '15d': 15,
  '30d': 30,
  '60d': 60
};

function calcVencimento(dataBase: string | undefined, prazo: string | undefined): string | null {
  const dias = PRAZO_DIAS[prazo ?? ''];
  if (!dias) return null;
  const base = dataBase ? new Date(dataBase + 'T00:00:00') : new Date();
  base.setDate(base.getDate() + dias);
  return base.toISOString().split('T')[0];
}

export type ContaReceberInput = {
  pedido_id: string;
  pedido_num: number;
  cliente_id: string | null;
  cliente: string;
  valor: number;
  data: string | undefined;
  prazo: string | undefined;
};

async function inserirConta(
  context: CrApiContext,
  conta: ContaReceber
): Promise<void> {
  const res = await fetch(`${context.url}/rest/v1/contas_receber`, {
    method: 'POST',
    headers: {
      apikey: context.key,
      Authorization: `Bearer ${context.token}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify(conta),
    signal: AbortSignal.timeout(12000)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Falha ao salvar conta a receber: ${res.status} ${text}`);
  }
}

/**
 * Gera conta a receber manualmente para qualquer pedido entregue.
 * Ao contrário de gerarContaSeNecessario, não verifica status anterior
 * e lança erro visível se o prazo não tiver dias configurados.
 */
export async function gerarContaForcado(
  context: CrApiContext,
  input: ContaReceberInput
): Promise<void> {
  const vencimento = calcVencimento(input.data, input.prazo);
  if (!vencimento) {
    throw new Error(
      `Prazo "${input.prazo || 'não definido'}" não gera conta a receber. ` +
        'Use prazo de 7d, 15d, 30d ou 60d no pedido.'
    );
  }

  await inserirConta(context, {
    id: globalThis.crypto.randomUUID(),
    filial_id: context.filialId,
    pedido_id: input.pedido_id,
    pedido_num: input.pedido_num ?? null,
    cliente_id: input.cliente_id ?? null,
    cliente: input.cliente,
    valor: input.valor,
    valor_recebido: 0,
    valor_em_aberto: input.valor,
    vencimento,
    status: 'pendente',
    recebido_em: null,
    ultimo_recebimento_em: null
  });
}

/**
 * Gera conta a receber quando um pedido vira "entregue" pela primeira vez,
 * se o prazo tiver dias configurados (7d, 15d, 30d, 60d).
 *
 * Espelha exatamente a lógica de _gerarContaSeNecessario() do legado.
 * Condições para gerar:
 *   - statusNovo === 'entregue'
 *   - statusAnterior !== 'entregue'  (não re-gera em transições idempotentes)
 *   - prazo tem dias configurados (não gera para prazo 'imediato')
 */
export async function gerarContaSeNecessario(
  context: CrApiContext,
  input: ContaReceberInput,
  statusNovo: string,
  statusAnterior: string
): Promise<void> {
  if (normalizePedStatus(statusNovo) !== 'entregue') return;
  if (normalizePedStatus(statusAnterior) === 'entregue') return;

  const vencimento = calcVencimento(input.data, input.prazo);
  if (!vencimento) return;

  await inserirConta(context, {
    id: globalThis.crypto.randomUUID(),
    filial_id: context.filialId,
    pedido_id: input.pedido_id,
    pedido_num: input.pedido_num ?? null,
    cliente_id: input.cliente_id ?? null,
    cliente: input.cliente,
    valor: input.valor,
    valor_recebido: 0,
    valor_em_aberto: input.valor,
    vencimento,
    status: 'pendente',
    recebido_em: null,
    ultimo_recebimento_em: null
  });
}
