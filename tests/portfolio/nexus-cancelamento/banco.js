import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const pedidoId = 'PED-DEMO-42';
const contaId = 'REC-DEMO-42';
const filialId = 'FILIAL-DEMO';
const produtoId = 'PROD-DEMO';

const ler = (path) => readFile(new URL(path, import.meta.url), 'utf8');

export async function criarCenario() {
  const banco = new PGlite('memory://');
  try {
    await banco.exec(await ler('./schema.sql'));
    // A rotina histórica é carregada sem adaptação, antes de semear a base vazia.
    await banco.exec(await ler('../../../sql/legacy_archive/73_limpeza_pedidos_cancelados.sql'));
    await banco.exec(await ler('./cenario.sql'));
    return banco;
  } catch (erro) {
    await banco.close();
    throw erro;
  }
}

export async function estado(banco) {
  const {
    rows: [registro]
  } = await banco.query(
    `select
      p.status as "pedido",
      c.status as "recebivel",
      c.valor_em_aberto::integer as "emAberto",
      c.valor_recebido::integer as "recebido",
      (select count(*)::integer from public.contas_receber_baixas b
        where b.conta_receber_id = c.id) as "baixas",
      (select sum(case when m.tipo = 'entrada' then m.qty else -m.qty end)::integer
        from public.movimentacoes m where m.filial_id = $3 and m.prod_id = $4) as "estoque",
      (select count(*)::integer from public.movimentacoes m
        where m.filial_id = $3 and m.prod_id = $4 and m.id like ('MOV-CANCEL-' || p.id || '-%')) as "devolucoes"
    from public.pedidos p
    join public.contas_receber c on c.pedido_id = p.id
    where p.id = $1 and c.id = $2`,
    [pedidoId, contaId, filialId, produtoId]
  );
  return registro;
}

export async function cancelar(banco) {
  const {
    rows: [linha]
  } = await banco.query('select public.pedido_cancelar_seguro($1, $2) as resultado', [
    pedidoId,
    'Solicitação do cliente fictício'
  ]);
  return linha.resultado;
}
