import { getSupabaseConfig } from '../../../app/supabaseConfig';

export type CaixaTransacao = {
  id?: number;
  filial_id: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  categoria_id: string;
  descricao: string;
  entidade_id?: string;
  entidade_tipo?: string;
  criado_em?: string;
};

export async function listCategorias(token: string) {
  const { url, key } = getSupabaseConfig();
  const res = await fetch(`${url}/rest/v1/caixa_categorias?select=*&order=nome`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` }
  });
  return await res.json();
}

export async function listTransacoes(token: string, filialId: string) {
  const { url, key } = getSupabaseConfig();
  const res = await fetch(
    `${url}/rest/v1/caixa_transacoes?filial_id=eq.${filialId}&select=*,caixa_categorias(nome)&order=criado_em.desc`,
    {
      headers: { apikey: key, Authorization: `Bearer ${token}` }
    }
  );
  return (await res.json()) as (CaixaTransacao & { caixa_categorias: { nome: string } })[];
}

export async function addTransacao(token: string, transacao: CaixaTransacao) {
  const { url, key } = getSupabaseConfig();
  const res = await fetch(`${url}/rest/v1/caixa_transacoes`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(transacao)
  });
  if (!res.ok) throw new Error('Erro ao registrar movimentação de caixa');
}

export async function getSaldo(token: string, filialId: string) {
  const transacoes = await listTransacoes(token, filialId);
  return transacoes.reduce((acc, t) => {
    return t.tipo === 'entrada' ? acc + t.valor : acc - t.valor;
  }, 0);
}
