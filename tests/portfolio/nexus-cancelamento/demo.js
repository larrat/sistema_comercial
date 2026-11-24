import { cancelar, criarCenario, estado } from './banco.js';

const banco = await criarCenario();
try {
  const antes = await estado(banco);
  const resposta = await cancelar(banco);
  const depois = await estado(banco);
  const repeticao = await cancelar(banco);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ antes, depois, resposta, repeticao }));
  } else {
    console.log('Nexus | Cancelamento do pedido fictício #42 (banco local)');
    console.table({ antes, depois });
    console.log(
      'Segunda tentativa:',
      repeticao.ja_cancelado ? 'nenhum lançamento duplicado' : 'verificar'
    );
  }
} finally {
  await banco.close();
}
