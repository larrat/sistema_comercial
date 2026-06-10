import type { Projeto, LevantamentoArquitetura, Pedido } from '../../../../types/domain';

export type ProjetosApiContext = {
  url: string;
  key: string;
  token: string;
  filialId: string;
};

function createHeaders(key: string, token: string, prefer?: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {})
  };
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => '');
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

function ensureOk(res: Response, body: unknown, fallback: string): void {
  if (res.ok) return;
  if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
    throw new Error(body.message);
  }
  throw new Error(fallback);
}

export async function listProjetos(context: ProjetosApiContext): Promise<Projeto[]> {
  const url = `${context.url}/rest/v1/projetos?filial_id=eq.${encodeURIComponent(context.filialId)}&order=atualizado_em.desc`;
  const res = await fetch(url, { headers: createHeaders(context.key, context.token) });
  const body = await readJson(res);
  ensureOk(res, body, 'Erro ao listar projetos');
  return Array.isArray(body) ? (body as Projeto[]) : [];
}

export async function getProjeto(context: ProjetosApiContext, id: string): Promise<Projeto> {
  const url = `${context.url}/rest/v1/projetos?id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(url, { headers: createHeaders(context.key, context.token) });
  const body = await readJson(res);
  ensureOk(res, body, 'Erro ao buscar projeto');
  if (Array.isArray(body) && body[0]) return body[0] as Projeto;
  throw new Error('Projeto não encontrado');
}

export async function saveProjeto(context: ProjetosApiContext, payload: Partial<Projeto>): Promise<Projeto> {
  const data = { ...payload, filial_id: context.filialId };
  const res = await fetch(`${context.url}/rest/v1/projetos?on_conflict=id`, {
    method: 'POST',
    headers: createHeaders(context.key, context.token, 'return=representation,resolution=merge-duplicates'),
    body: JSON.stringify(data)
  });
  const body = await readJson(res);
  ensureOk(res, body, 'Erro ao salvar projeto');
  if (Array.isArray(body) && body[0]) return body[0] as Projeto;
  throw new Error('Falha ao retornar projeto salvo');
}

export async function getProjetoLevantamentos(context: ProjetosApiContext, projetoId: string): Promise<LevantamentoArquitetura[]> {
  const url = `${context.url}/rest/v1/levantamentos_arquitetura?projeto_id=eq.${encodeURIComponent(projetoId)}&order=atualizado_em.desc`;
  const res = await fetch(url, { headers: createHeaders(context.key, context.token) });
  const body = await readJson(res);
  ensureOk(res, body, 'Erro ao listar levantamentos');
  return Array.isArray(body) ? (body as LevantamentoArquitetura[]) : [];
}

export async function getProjetoPedidos(context: ProjetosApiContext, projetoId: string): Promise<Pedido[]> {
  const url = `${context.url}/rest/v1/pedidos?projeto_id=eq.${encodeURIComponent(projetoId)}&order=data.desc`;
  const res = await fetch(url, { headers: createHeaders(context.key, context.token) });
  const body = await readJson(res);
  ensureOk(res, body, 'Erro ao listar pedidos');
  return Array.isArray(body) ? (body as Pedido[]) : [];
}
