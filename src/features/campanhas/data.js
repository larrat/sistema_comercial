// @ts-check
/**
 * campanhas/data.js — módulo de estado, helpers puros e carregamento de dados.
 *
 * Sem imports de render.js ou actions.js (zero dependências circulares).
 * Outros módulos importam daqui o estado compartilhado e os accessors de cache.
 */

import { SB } from '../../app/api.js';
import { D, State, C } from '../../app/store.js';
import { toast, uid, notify } from '../../shared/utils.js';
import { SEVERITY } from '../../shared/messages.js';

/** @typedef {import('../../types/domain').Campanha} Campanha */
/** @typedef {import('../../types/domain').CampanhaEnvio} CampanhaEnvio */
/** @typedef {import('../../types/domain').CampanhaFilaResult} CampanhaFilaResult */
/**
 * @typedef {object} CampanhaDiagnostico
 * @property {string | null} filialId
 * @property {number} carregadasFilial
 * @property {number | null} totalBanco
 * @property {number | null} outrasFiliais
 * @property {Campanha[]} candidatasOutrasFiliais
 * @property {string} origem
 * @property {string | null} erro
 */

// ── Estado compartilhado (live bindings exportados) ───────────────────────────

/** @type {CampanhaDiagnostico} */
export let campDiag = {
  filialId: null,
  carregadasFilial: 0,
  totalBanco: null,
  outrasFiliais: null,
  candidatasOutrasFiliais: [],
  origem: 'cache',
  erro: null
};

export const campUiState = {
  waSelecionados: new Set(),
  waPreviewAtualId: null,
  waLoteIds: [],
  waLoteIndex: -1,
  statusFeedback: null
};

/** @type {any | null} */
export let campanhasStatsCache = null;
/** @type {any | null} */
export let campanhasHistoricoCache = null;

// ── Helpers de runtime ────────────────────────────────────────────────────────

export function isRuntimeBootstrapping() {
  return document.body.dataset.runtimeBootstrap === 'starting';
}

/** @returns {Campanha[]} */
export function getCampanhasCache() {
  if (!D.campanhas) D.campanhas = {};
  if (!D.campanhas[State.FIL]) D.campanhas[State.FIL] = [];
  return D.campanhas[State.FIL];
}

/** @returns {CampanhaEnvio[]} */
export function getEnviosCache() {
  if (!D.campanhaEnvios) D.campanhaEnvios = {};
  if (!D.campanhaEnvios[State.FIL]) D.campanhaEnvios[State.FIL] = [];
  return D.campanhaEnvios[State.FIL];
}

// ── Helpers de formatação ─────────────────────────────────────────────────────

export function escAttr(v) {
  return String(v || '').replace(/"/g, '&quot;');
}

export function normalizarNumeroWhatsAppBR(raw) {
  let s = String(raw || '').replace(/\D/g, '');
  if (!s) return '';
  if (s.startsWith('55')) return s;
  return '55' + s;
}

export function buildWhatsAppUrl(numero, mensagem) {
  const num = normalizarNumeroWhatsAppBR(numero);
  const txt = encodeURIComponent(String(mensagem || ''));
  return `https://wa.me/${num}?text=${txt}`;
}

export function formatarDataBR(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function labelCanal(v) {
  const key = String(v || '').trim();
  if (key === 'whatsapp_manual') return 'WhatsApp manual';
  if (key === 'email') return 'E-mail';
  if (key === 'sms') return 'SMS';
  return key || '&mdash;';
}

export function labelStatusEnvio(status) {
  const key = String(status || '').trim();
  if (key === 'manual') return 'Manual';
  if (key === 'pendente') return 'Pendente';
  if (key === 'enviado') return 'Enviado';
  if (key === 'falhou') return 'Falhou';
  return key || '&mdash;';
}

export function contarResumoEnvios(envios) {
  return {
    pendentes: envios.filter((e) => e.status === 'manual' || e.status === 'pendente').length,
    enviados: envios.filter((e) => e.status === 'enviado').length,
    falhas: envios.filter((e) => e.status === 'falhou').length
  };
}

export function getCampanhasStats(campanhas = getCampanhasCache(), envios = getEnviosCache()) {
  if (
    campanhasStatsCache &&
    campanhasStatsCache.campanhasRef === campanhas &&
    campanhasStatsCache.campanhasLen === campanhas.length &&
    campanhasStatsCache.enviosRef === envios &&
    campanhasStatsCache.enviosLen === envios.length
  ) {
    return campanhasStatsCache.result;
  }

  const result = {
    ativas: campanhas.filter((c) => c.ativo).length,
    resumo: contarResumoEnvios(envios)
  };

  campanhasStatsCache = {
    campanhasRef: campanhas,
    campanhasLen: campanhas.length,
    enviosRef: envios,
    enviosLen: envios.length,
    result
  };

  return result;
}

/**
 * @param {string | null | undefined} envioId
 * @returns {CampanhaEnvio | null}
 */
export function getEnvioById(envioId) {
  return getEnviosCache().find((e) => e.id === envioId) || null;
}

export function getFilaWhatsApp() {
  return getEnviosCache()
    .filter(
      (e) => e.canal === 'whatsapp_manual' && (e.status === 'manual' || e.status === 'pendente')
    )
    .sort((a, b) => String(b.criado_em || '').localeCompare(String(a.criado_em || '')));
}

/**
 * @param {string} campanhaId
 * @returns {CampanhaEnvio | null}
 */
export function getPrimeiroEnvioWhatsAppPendenteCampanha(campanhaId) {
  return (
    getFilaWhatsApp().find(
      (e) =>
        e.campanha_id === campanhaId &&
        (e.status === 'manual' || e.status === 'pendente') &&
        !!String(e.destino || '').trim()
    ) || null
  );
}

export function getEnviosHistoricoFiltrados() {
  const busca = String(document.getElementById('camp-envios-busca')?.value || '')
    .trim()
    .toLowerCase();
  const status = String(document.getElementById('camp-envios-fil-status')?.value || '').trim();
  const canal = String(document.getElementById('camp-envios-fil-canal')?.value || '').trim();
  const envios = getEnviosCache();
  const clientes = C() || [];

  if (
    campanhasHistoricoCache &&
    campanhasHistoricoCache.enviosRef === envios &&
    campanhasHistoricoCache.enviosLen === envios.length &&
    campanhasHistoricoCache.clientesRef === clientes &&
    campanhasHistoricoCache.clientesLen === clientes.length &&
    campanhasHistoricoCache.busca === busca &&
    campanhasHistoricoCache.status === status &&
    campanhasHistoricoCache.canal === canal
  ) {
    return campanhasHistoricoCache.result;
  }

  const result = envios
    .slice()
    .filter((e) => !status || String(e.status || '') === status)
    .filter((e) => !canal || String(e.canal || '') === canal)
    .filter((e) => {
      if (!busca) return true;
      const cliente = clientes.find((c) => c.id === e.cliente_id);
      const haystack = [cliente?.nome, e.destino, e.cliente_id, e.mensagem].join(' ').toLowerCase();
      return haystack.includes(busca);
    })
    .sort((a, b) => String(b.criado_em || '').localeCompare(String(a.criado_em || '')));

  campanhasHistoricoCache = {
    enviosRef: envios,
    enviosLen: envios.length,
    clientesRef: clientes,
    clientesLen: clientes.length,
    busca,
    status,
    canal,
    result
  };

  return result;
}

export function agruparHistoricoEnviosPorCampanha(envios) {
  /** @type {Map<string, CampanhaEnvio[]>} */
  const grupos = new Map();
  envios.forEach((envio) => {
    const key = String(envio.campanha_id || 'sem-campanha');
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)?.push(envio);
  });

  return Array.from(grupos.entries())
    .map(([campanhaId, itens]) => ({
      campanhaId,
      campanha: getCampanhasCache().find((c) => c.id === campanhaId) || null,
      envios: itens
        .slice()
        .sort((a, b) => String(b.criado_em || '').localeCompare(String(a.criado_em || '')))
    }))
    .sort((a, b) =>
      String(b.envios[0]?.criado_em || '').localeCompare(String(a.envios[0]?.criado_em || ''))
    );
}

// ── Carregamento de dados ─────────────────────────────────────────────────────

export async function carregarCampanhas() {
  campDiag = {
    filialId: State.FIL,
    carregadasFilial: 0,
    totalBanco: null,
    outrasFiliais: null,
    candidatasOutrasFiliais: [],
    origem: 'api-filial',
    erro: null
  };

  const campanhasResult = await SB.toResult(() => SB.getCampanhas(State.FIL));
  if (campanhasResult.ok) {
    const campanhas = campanhasResult.data;
    if (!D.campanhas) D.campanhas = {};
    D.campanhas[State.FIL] = campanhas || [];
    campDiag.carregadasFilial = D.campanhas[State.FIL].length;

    if (!D.campanhas[State.FIL].length) {
      const allResult = await SB.toResult(() => SB.getCampanhasAll());
      if (allResult.ok) {
        const all = allResult.data;
        const sameFilial = (all || []).filter(
          (c) => String(c.filial_id || '') === String(State.FIL || '')
        );
        const outrasFiliais = (all || []).filter(
          (c) => String(c.filial_id || '') !== String(State.FIL || '')
        );

        campDiag.totalBanco = (all || []).length;
        campDiag.outrasFiliais = Math.max(0, (all || []).length - sameFilial.length);
        campDiag.candidatasOutrasFiliais = outrasFiliais;

        if (sameFilial.length) {
          D.campanhas[State.FIL] = sameFilial;
          campDiag.carregadasFilial = sameFilial.length;
          campDiag.origem = 'api-fallback';
        } else if ((all || []).length) {
          campDiag.origem = 'api-sem-filial';
        }
      } else {
        campDiag.origem = 'api-filial';
        campDiag.erro = String(allResult.error?.message || allResult.error || '');
      }
    }

    return D.campanhas[State.FIL];
  }

  console.error('Falha ao carregar campanhas', campanhasResult.error);
  toast('Falha ao carregar campanhas do banco. Exibindo dados locais.');
  campDiag.origem = 'cache';
  campDiag.erro = String(campanhasResult.error?.message || campanhasResult.error || '');
  campDiag.carregadasFilial = getCampanhasCache().length;
  return getCampanhasCache();
}

export async function carregarCampanhaEnvios() {
  const enviosResult = await SB.toResult(() => SB.getCampanhaEnvios(State.FIL));
  if (enviosResult.ok) {
    const envios = enviosResult.data;
    if (!D.campanhaEnvios) D.campanhaEnvios = {};
    D.campanhaEnvios[State.FIL] = envios || [];
    return D.campanhaEnvios[State.FIL];
  }
  console.error('Falha ao carregar envios de campanhas', enviosResult.error);
  toast('Falha ao carregar envios do banco. Exibindo dados locais.');
  return getEnviosCache();
}

export async function adotarCampanhasParaFilialAtiva() {
  const candidatas = campDiag.candidatasOutrasFiliais || [];
  if (!candidatas.length) {
    toast('Nenhuma campanha disponível para importar.');
    return;
  }

  const atuais = getCampanhasCache();
  const existentes = new Set(
    atuais.map((c) =>
      [c.nome, c.tipo, c.canal, Number(c.dias_antecedencia || 0)].join('|').toLowerCase()
    )
  );

  const paraImportar = candidatas.filter((c) => {
    const k = [c.nome, c.tipo, c.canal, Number(c.dias_antecedencia || 0)].join('|').toLowerCase();
    return !existentes.has(k);
  });

  if (!paraImportar.length) {
    toast('As campanhas candidatas já existem na filial ativa.');
    return;
  }

  let importadas = 0;
  let falhasPersistencia = 0;

  for (const c of paraImportar) {
    const nova = {
      ...c,
      id: uid(),
      filial_id: State.FIL
    };

    const persistResult = await SB.toResult(() => SB.upsertCampanha(nova));
    if (!persistResult.ok) {
      falhasPersistencia++;
      console.error('Falha ao persistir campanha importada', nova, persistResult.error);
    }

    atuais.unshift(nova);
    importadas++;
  }

  notify(
    `Importação concluída: ${importadas} campanha${importadas !== 1 ? 's' : ''}, ${falhasPersistencia} falha${falhasPersistencia !== 1 ? 's' : ''}.`,
    falhasPersistencia > 0 ? SEVERITY.WARNING : SEVERITY.SUCCESS
  );
}
