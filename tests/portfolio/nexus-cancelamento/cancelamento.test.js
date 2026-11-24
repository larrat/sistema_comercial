import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cancelar, criarCenario, estado } from './banco.js';

test('cancelamento devolve 3 unidades ao Kardex e encerra o recebível sem duplicar lançamentos', async (t) => {
  const banco = await criarCenario();
  t.after(() => banco.close());
  assert.deepEqual(await estado(banco), {
    pedido: 'concluido',
    recebivel: 'parcial',
    emAberto: 100,
    recebido: 50,
    baixas: 1,
    estoque: 7,
    devolucoes: 0
  });

  const resposta = await cancelar(banco);
  assert.equal(resposta.ok, true);
  assert.equal(resposta.contas_canceladas, 1);
  assert.equal(resposta.itens_estoque_revertidos, 1);
  const depois = {
    pedido: 'cancelado',
    recebivel: 'cancelado',
    emAberto: 0,
    recebido: 0,
    baixas: 0,
    estoque: 10,
    devolucoes: 1
  };

  assert.deepEqual(await estado(banco), depois);
  assert.equal((await cancelar(banco)).ja_cancelado, true);
  assert.deepEqual(await estado(banco), depois);
});

test('erro ao devolver o estoque preserva o pedido, o recebível e a baixa', async (t) => {
  const banco = await criarCenario();
  t.after(() => banco.close());
  const antes = await estado(banco);
  // Falha determinística no esquema fictício: simula Kardex indisponível para a devolução.
  await banco.exec(`alter table public.movimentacoes
    add constraint bloquear_devolucao_demo check (id not like 'MOV-CANCEL-%')`);

  await assert.rejects(() => cancelar(banco), /bloquear_devolucao_demo/);
  assert.deepEqual(await estado(banco), antes);
});

test('NF-e marcada como emitida bloqueia o cancelamento sem alterar os módulos', async (t) => {
  const banco = await criarCenario();
  t.after(() => banco.close());
  await banco.query("update public.pedidos set fiscal_status = 'emitido' where id = $1", [
    'PED-DEMO-42'
  ]);
  const antes = await estado(banco);

  await assert.rejects(() => cancelar(banco), /Nota Fiscal emitida/);
  assert.deepEqual(await estado(banco), antes);
});
