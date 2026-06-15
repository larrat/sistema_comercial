import type { Projeto, LevantamentoArquitetura, Pedido } from '../../../../types/domain';
import { fetchWithAuth, readJson, ensureOk } from '../../../shared/api/apiClient';

import type { ApiContext } from '../../../shared/types/api';
export type ProjetosApiContext = ApiContext;

export async function listProjetos(context: ProjetosApiContext): Promise<Projeto[]> {
  const res = await fetchWithAuth(context, `/rest/v1/projetos?filial_id=eq.${encodeURIComponent(context.filialId)}&order=atualizado_em.desc`);
  await ensureOk(res, 'Erro ao listar projetos');
  const body = await readJson(res);
  return Array.isArray(body) ? (body as Projeto[]) : [];
}

export async function getProjeto(context: ProjetosApiContext, id: string): Promise<Projeto> {
  const res = await fetchWithAuth(context, `/rest/v1/projetos?id=eq.${encodeURIComponent(id)}`);
  await ensureOk(res, 'Erro ao buscar projeto');
  const body = await readJson(res);
  if (Array.isArray(body) && body[0]) return body[0] as Projeto;
  throw new Error('Projeto não encontrado');
}

export async function saveProjeto(context: ProjetosApiContext, payload: Partial<Projeto>): Promise<Projeto> {
  const data = { ...payload, filial_id: context.filialId };
  const res = await fetchWithAuth(context, '/rest/v1/projetos?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify(data)
  });
  await ensureOk(res, 'Erro ao salvar projeto');
  const body = await readJson(res);
  if (Array.isArray(body) && body[0]) return body[0] as Projeto;
  throw new Error('Falha ao retornar projeto salvo');
}

export async function getProjetoLevantamentos(context: ProjetosApiContext, projetoId: string): Promise<LevantamentoArquitetura[]> {
  const res = await fetchWithAuth(context, `/rest/v1/levantamentos_arquitetura?projeto_id=eq.${encodeURIComponent(projetoId)}&order=atualizado_em.desc`);
  await ensureOk(res, 'Erro ao listar levantamentos');
  const body = await readJson(res);
  return Array.isArray(body) ? (body as LevantamentoArquitetura[]) : [];
}

export async function getProjetoPedidos(context: ProjetosApiContext, projetoId: string): Promise<Pedido[]> {
  const res = await fetchWithAuth(context, `/rest/v1/pedidos?projeto_id=eq.${encodeURIComponent(projetoId)}&order=data.desc`);
  await ensureOk(res, 'Erro ao listar pedidos');
  const body = await readJson(res);
  return Array.isArray(body) ? (body as Pedido[]) : [];
}

export async function getProjetoOrcamentos(context: ProjetosApiContext, projetoId: string): Promise<any[]> {
  const res = await fetchWithAuth(context, `/rest/v1/orcamentos_obra?projeto_id=eq.${encodeURIComponent(projetoId)}&order=atualizado_em.desc`);
  await ensureOk(res, 'Erro ao listar orçamentos');
  const body = await readJson(res);
  return Array.isArray(body) ? (body as any[]) : [];
}
