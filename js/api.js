// js/api.js

const SB_URL = 'https://eiycrokqwhmfmjackjni.supabase.co';
const SB_KEY = 'sb_publishable_Hc1MlzrIX9c79PEHiylpTA_9787bYHJ';

async function sbReq(table, method = 'GET', body = null, params = '') {
  const prefer =
    method === 'POST'
      ? (params.includes('on_conflict')
          ? 'resolution=merge-duplicates,return=representation'
          : 'return=representation')
      : '';

  const res = await fetch(`${SB_URL}/rest/v1/${table}${params}`, {
    method,
    headers: {
      apikey: SB_KEY,
      Authorization: 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const e = await res.text();
    console.error('Supabase erro', res.status, table, params, e);
    if (res.status === 401 || res.status === 403) {
      throw new Error('Chave inválida (' + res.status + '). Verifique SB_KEY.');
    }
    if (res.status === 404) {
      throw new Error('Tabela não encontrada: ' + table + '. Execute o SQL de criação.');
    }
    throw new Error(res.status + ': ' + e);
  }

  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

export const SB = {
  
    upsertProdutosLote: items => sbReq('produtos', 'POST', items, '?on_conflict=id'),

  upsertCotPrecosLote: items =>
    sbReq('cotacao_precos', 'POST', items, '?on_conflict=filial_id,produto_id,fornecedor_id'),

  upsertCotHistoricoLote: items =>
    sbReq('cotacao_historico', 'POST', items, '?on_conflict=filial_id,produto_id,fornecedor_id,mes_ref'),

  getFiliais: () => sbReq('filiais', 'GET', null, '?order=criado_em'),
  upsertFilial: f => sbReq('filiais', 'POST', f, '?on_conflict=id'),
  deleteFilial: id => sbReq(`filiais?id=eq.${id}`, 'DELETE'),

  getProdutos: fid => sbReq('produtos', 'GET', null, `?filial_id=eq.${fid}&order=nome`),
  upsertProduto: p => sbReq('produtos', 'POST', p, '?on_conflict=id'),
  deleteProduto: id => sbReq(`produtos?id=eq.${id}`, 'DELETE'),

  getClientes: fid => sbReq('clientes', 'GET', null, `?filial_id=eq.${fid}&order=nome`),
  upsertCliente: c => sbReq('clientes', 'POST', c, '?on_conflict=id'),
  deleteCliente: id => sbReq(`clientes?id=eq.${id}`, 'DELETE'),

  getPedidos: fid => sbReq('pedidos', 'GET', null, `?filial_id=eq.${fid}&order=num.desc`),
  upsertPedido: p => sbReq('pedidos', 'POST', p, '?on_conflict=id'),
  deletePedido: id => sbReq(`pedidos?id=eq.${id}`, 'DELETE'),

  getFornecedores: fid => sbReq('fornecedores', 'GET', null, `?filial_id=eq.${fid}&order=nome`),
  upsertFornecedor: f => sbReq('fornecedores', 'POST', f, '?on_conflict=id'),
  deleteFornecedor: id => sbReq(`fornecedores?id=eq.${id}`, 'DELETE'),

  getCotPrecos: fid => sbReq('cotacao_precos', 'GET', null, `?filial_id=eq.${fid}`),
  upsertCotPreco: p => sbReq('cotacao_precos', 'POST', p, '?on_conflict=filial_id,produto_id,fornecedor_id'),
  deleteCotPreco: (fid, pid, fnid) =>
    sbReq(`cotacao_precos?filial_id=eq.${fid}&produto_id=eq.${pid}&fornecedor_id=eq.${fnid}`, 'DELETE'),

  getCotHistorico: fid =>
    sbReq('cotacao_historico', 'GET', null, `?filial_id=eq.${fid}&order=mes_ref.desc`),

  upsertCotHistorico: h =>
    sbReq(
      'cotacao_historico',
      'POST',
      h,
      '?on_conflict=filial_id,produto_id,fornecedor_id,mes_ref'
    ),

  getCotConfig: fid => sbReq('cotacao_config', 'GET', null, `?filial_id=eq.${fid}`).then(r => r && r[0]),
  upsertCotConfig: c => sbReq('cotacao_config', 'POST', c, '?on_conflict=filial_id'),

  getMovs: fid => sbReq('movimentacoes', 'GET', null, `?filial_id=eq.${fid}&order=ts.asc`),
  insertMov: m => sbReq('movimentacoes', 'POST', m, ''),
  deleteMov: id => sbReq(`movimentacoes?id=eq.${id}`, 'DELETE'),

  getNotas: cid => sbReq('notas', 'GET', null, `?cliente_id=eq.${cid}&order=criado_em.desc`),
  insertNota: n => sbReq('notas', 'POST', n, '')
};