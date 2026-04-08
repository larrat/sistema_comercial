// @ts-check

export const SEVERITY = {
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  INFO: 'info'
};

/** @typedef {typeof SEVERITY[keyof typeof SEVERITY]} SeverityValue */

/** @param {unknown} v */
function oneLine(v){
  return String(v || '').replace(/\s+/g, ' ').trim();
}

/**
 * @param {{
 *   severity?: SeverityValue;
 *   what?: string;
 *   impact?: string;
 *   next?: string;
 * }} [input]
 */
export function guidedMessage({ severity = SEVERITY.INFO, what = '', impact = '', next = '' } = {}){
  const prefix =
    severity === SEVERITY.ERROR ? 'Erro' :
    severity === SEVERITY.WARNING ? 'Atencao' :
    severity === SEVERITY.SUCCESS ? 'Sucesso' :
    'Info';

  const a = oneLine(what);
  const b = oneLine(impact);
  const c = oneLine(next);
  return `${prefix}: ${a}${b ? ` Impacto: ${b}.` : ''}${c ? ` Acao: ${c}.` : ''}`.trim();
}

export const MSG = {
  forms: {
    /** @param {string} field */
    required: field => guidedMessage({
      severity: SEVERITY.WARNING,
      what: `campo obrigatorio nao preenchido (${field})`,
      impact: 'o cadastro nao pode ser salvo',
      next: `preencha "${field}" e tente novamente`
    })
  },
  campanhas: {
    notFound: guidedMessage({
      severity: SEVERITY.ERROR,
      what: 'campanha nao encontrada',
      impact: 'a fila nao pode ser gerada',
      next: 'atualize a tela e tente novamente'
    }),
    inactive: guidedMessage({
      severity: SEVERITY.WARNING,
      what: 'a campanha esta inativa',
      impact: 'nenhum cliente entra na fila',
      next: 'ative a campanha e gere a fila novamente'
    }),
    /** @param {unknown} err */
    saveFailed: err => guidedMessage({
      severity: SEVERITY.ERROR,
      what: `falha ao salvar campanha (${oneLine(err || 'erro desconhecido')})`,
      impact: 'o banco pode nao refletir a alteracao',
      next: 'verifique permissoes/tabela no Supabase e tente salvar de novo'
    }),
    savedLocal: guidedMessage({
      severity: SEVERITY.WARNING,
      what: 'campanha salva apenas localmente',
      impact: 'outros usuarios/ambientes nao verao essa alteracao',
      next: 'corrija tabela/permissao da tabela campanhas no Supabase'
    }),
    /** @param {unknown} err */
    queueFetchFailed: err => guidedMessage({
      severity: SEVERITY.ERROR,
      what: `falha ao buscar clientes elegiveis (${oneLine(err || 'erro desconhecido')})`,
      impact: 'a fila nao foi gerada',
      next: 'confira conexao, filial ativa e regras da campanha, depois gere novamente'
    }),
    /** @param {string} [ctx=''] */
    noEligible: (ctx = '') => guidedMessage({
      severity: SEVERITY.INFO,
      what: 'nenhum cliente elegivel encontrado para esta execucao',
      impact: 'nenhum envio foi criado',
      next: ctx || 'revise antecedencia, opt-in e telefone/WhatsApp dos clientes'
    }),
    /**
     * @param {{
     *   criados?: number;
     *   ignorados?: number;
     *   falhas?: number;
     * }} [input]
     */
    queueResult: ({ criados = 0, ignorados = 0, falhas = 0 } = {}) => guidedMessage({
      severity: falhas > 0 ? SEVERITY.WARNING : SEVERITY.SUCCESS,
      what: `fila processada (${criados} criado(s), ${ignorados} ignorado(s), ${falhas} falha(s))`,
      impact: falhas > 0 ? 'parte dos envios pode ter ficado pendente' : 'fila pronta para execucao',
      next: falhas > 0 ? 'abra o historico/fila e trate os itens com falha' : 'abra a fila e execute os envios'
    }),
    missingDestino: guidedMessage({
      severity: SEVERITY.WARNING,
      what: 'envio sem destino de WhatsApp',
      impact: 'o contato nao pode ser aberto para envio',
      next: 'cadastre WhatsApp ou telefone no cliente e tente novamente'
    }),
    /** @param {unknown} err */
    envioUpdateFailed: err => guidedMessage({
      severity: SEVERITY.ERROR,
      what: `falha ao atualizar o envio (${oneLine(err || 'erro desconhecido')})`,
      impact: 'o status pode ficar inconsistente',
      next: 'tente novamente em alguns segundos'
    })
  },
  jogos: {
    missingFilial: guidedMessage({
      severity: SEVERITY.ERROR,
      what: 'nenhuma filial disponivel para a agenda',
      impact: 'nao e possivel salvar/sincronizar jogos',
      next: 'selecione ou crie uma filial e tente novamente'
    }),
    missingApiUrl: guidedMessage({
      severity: SEVERITY.WARNING,
      what: 'URL da API nao informada',
      impact: 'a sincronizacao nao foi iniciada',
      next: 'informe uma URL valida e sincronize novamente'
    }),
    /** @param {unknown} err */
    fetchFailed: err => guidedMessage({
      severity: SEVERITY.ERROR,
      what: `falha ao consultar API externa (${oneLine(err || 'erro desconhecido')})`,
      impact: 'nenhum jogo foi importado',
      next: 'valide a URL e conexao; depois tente sincronizar novamente'
    }),
    emptyPayload: guidedMessage({
      severity: SEVERITY.WARNING,
      what: 'a API retornou dados sem jogos no formato esperado',
      impact: 'nenhum jogo foi processado',
      next: 'use uma API compativel ou ajuste o endpoint'
    }),
    noEligible: guidedMessage({
      severity: SEVERITY.INFO,
      what: 'nenhum jogo elegivel para importar com o filtro atual',
      impact: 'a agenda permanece sem alteracoes',
      next: 'remova ou ajuste o filtro por time e tente novamente'
    }),
    /**
     * @param {{
     *   processados?: number;
     *   falhas?: number;
     * }} [input]
     */
    syncResult: ({ processados = 0, falhas = 0 } = {}) => guidedMessage({
      severity: falhas > 0 ? SEVERITY.WARNING : SEVERITY.SUCCESS,
      what: `sincronizacao concluida (${processados} jogo(s), ${falhas} falha(s) de persistencia)`,
      impact: falhas > 0 ? 'alguns jogos podem estar so no cache local' : 'agenda atualizada no banco',
      next: falhas > 0 ? 'revise permissoes/tabela jogos_agenda e sincronize novamente' : 'confira os jogos no dashboard'
    }),
    invalidForm: guidedMessage({
      severity: SEVERITY.WARNING,
      what: 'dados obrigatorios do jogo nao preenchidos',
      impact: 'o jogo nao foi salvo',
      next: 'preencha titulo e data/hora e tente novamente'
    }),
    saveFallback: guidedMessage({
      severity: SEVERITY.WARNING,
      what: 'jogo salvo apenas localmente',
      impact: 'a agenda pode nao sincronizar entre sessoes',
      next: 'corrija acesso ao banco e salve novamente'
    }),
    removeFallback: guidedMessage({
      severity: SEVERITY.WARNING,
      what: 'jogo removido apenas localmente',
      impact: 'pode reaparecer apos recarga da agenda',
      next: 'corrija acesso ao banco e remova novamente'
    })
  }
};
