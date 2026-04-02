import { SB } from './api.js';
import { D, State, P, C, PD, FORNS, CPRECOS, CCFG, MOVS } from './store.js';
import { toast, abrirModal, fecharModal, uid, norm, fmt, fmtN, fmtQ, pct, mk2mg, mg2mk, prV } from './core/utils.js';
import {
  initCotacaoModule,
  renderFornSel,
  renderCotLogs,
  renderCotForns,
  renderCotTabela,
  salvarForn,
  remForn,
  cotLock,
  updPreco,
  cotFile,
  confirmarMapa,
  renderMapaBody
} from './modules/cotacao.js';

// --------------------------------------------------
// Bootstrap do módulo de cotação
// --------------------------------------------------
initCotacaoModule({
  renderCotLogs,
  renderProdMet: () => window.renderProdMet && window.renderProdMet(),
  renderProdutos: () => window.renderProdutos && window.renderProdutos()
});

// --------------------------------------------------
// O restante do seu main.js atual continua aqui
// mantendo dashboard, produtos, clientes, pedidos, estoque
// --------------------------------------------------

// Exemplo: mantenha suas funções existentes abaixo deste ponto
// renderSetup, entrar, ir, renderProdutos, renderClientes etc.
// Você não precisa mover tudo agora.
// Só remova do main.js antigo:
// - cotFile
// - renderFornSel
// - renderCotLogs
// - renderCotForns
// - renderCotTabela
// - salvarForn
// - remForn
// - cotLock
// - updPreco
// - detectarCabecalho
// - normalizarNumeroBR
// - abrirMapaModal
// - renderMapaBody
// - confirmarMapa
//
// E deixe o restante como estava.

// --------------------------------------------------
// Exposição global
// --------------------------------------------------
window.abrirModal = abrirModal;
window.fecharModal = fecharModal;

window.renderFornSel = renderFornSel;
window.renderCotLogs = renderCotLogs;
window.renderCotForns = renderCotForns;
window.renderCotTabela = renderCotTabela;
window.salvarForn = salvarForn;
window.remForn = remForn;
window.cotLock = cotLock;
window.updPreco = updPreco;
window.cotFile = cotFile;
window.confirmarMapa = confirmarMapa;
window.renderMapaBody = renderMapaBody;