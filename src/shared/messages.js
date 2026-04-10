// @ts-check

export const SEVERITY = {
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  INFO: 'info'
};

/** @typedef {typeof SEVERITY[keyof typeof SEVERITY]} SeverityValue */

/** @param {unknown} v */
function oneLine(v) {
  return String(v || '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {{
 *   severity?: SeverityValue;
 *   what?: string;
 *   impact?: string;
 *   next?: string;
 * }} [input]
 */
export function guidedMessage({
  severity = SEVERITY.INFO,
  what = '',
  impact = '',
  next = ''
} = {}) {
  const prefix =
    severity === SEVERITY.ERROR
      ? 'Erro'
      : severity === SEVERITY.WARNING
        ? 'Atenção'
        : severity === SEVERITY.SUCCESS
          ? 'Sucesso'
          : 'Info';

  const a = oneLine(what);
  const b = oneLine(impact);
  const c = oneLine(next);
  return `${prefix}: ${a}${b ? ` Impacto: ${b}.` : ''}${c ? ` Ação: ${c}.` : ''}`.trim();
}

export const MSG = {
  forms: {
    /** @param {string} field */
    required: (field) =>
      guidedMessage({
        severity: SEVERITY.WARNING,
        what: `campo obrigatório não preenchido (${field})`,
        impact: 'o cadastro não pode ser salvo',
        next: `preencha "${field}" e tente novamente`
      })
  },
  campanhas: {
    notFound: guidedMessage({
      severity: SEVERITY.ERROR,
      what: 'campanha não encontrada',
      impact: 'a fila não pode ser gerada',
      next: 'atualize a tela e tente novamente'
    }),
    inactive: guidedMessage({
      severity: SEVERITY.WARNING,
      what: 'a campanha est? inativa',
      impact: 'nenhum cliente entra na fila',
      next: 'ative a campanha e gere a fila novamente'
    }),
    /** @param {unknown} err */
    saveFailed: (err) =>
      guidedMessage({
        severity: SEVERITY.ERROR,
        what: `falha ao salvar campanha (${oneLine(err || 'erro desconhecido')})`,
        impact: 'o banco pode não refletir a alteração',
        next: 'verifique permissões/tabela no Supabase e tente salvar de novo'
      }),
    savedLocal: guidedMessage({
      severity: SEVERITY.WARNING,
      what: 'campanha salva apenas localmente',
      impact: 'outros usuários/ambientes não verão essa alteração',
      next: 'corrija tabela/permissão da tabela campanhas no Supabase'
    }),
    /** @param {unknown} err */
    queueFetchFailed: (err) =>
      guidedMessage({
        severity: SEVERITY.ERROR,
        what: `falha ao buscar clientes eleg?veis (${oneLine(err || 'erro desconhecido')})`,
        impact: 'a fila não foi gerada',
        next: 'confira conexão, filial ativa e regras da campanha; depois gere novamente'
      }),
    /** @param {string} [ctx=''] */
    noEligible: (ctx = '') =>
      guidedMessage({
        severity: SEVERITY.INFO,
        what: 'nenhum cliente elegível encontrado para esta execução',
        impact: 'nenhum envio foi criado',
        next: ctx || 'revise antecedência, opt-in e telefone/WhatsApp dos clientes'
      }),
    /**
     * @param {{
     *   criados?: number;
     *   ignorados?: number;
     *   falhas?: number;
     * }} [input]
     */
    queueResult: ({ criados = 0, ignorados = 0, falhas = 0 } = {}) =>
      guidedMessage({
        severity: falhas > 0 ? SEVERITY.WARNING : SEVERITY.SUCCESS,
        what: `fila processada (${criados} criado(s), ${ignorados} ignorado(s), ${falhas} falha(s))`,
        impact:
          falhas > 0 ? 'parte dos envios pode ter ficado pendente' : 'fila pronta para execução',
        next:
          falhas > 0
            ? 'abra o historico/fila e trate os itens com falha'
            : 'abra a fila e execute os envios'
      }),
    missingDestino: guidedMessage({
      severity: SEVERITY.WARNING,
      what: 'envio sem destino de WhatsApp',
      impact: 'o contato não pode ser aberto para envio',
      next: 'cadastre WhatsApp ou telefone no cliente e tente novamente'
    }),
    /** @param {unknown} err */
    envioUpdateFailed: (err) =>
      guidedMessage({
        severity: SEVERITY.ERROR,
        what: `falha ao atualizar o envio (${oneLine(err || 'erro desconhecido')})`,
        impact: 'o status pode ficar inconsistente',
        next: 'tente novamente em alguns segundos'
      })
  },
  jogos: {
    missingFilial: guidedMessage({
      severity: SEVERITY.ERROR,
      what: 'nenhuma filial disponível para a agenda',
      impact: 'não é possível salvar/sincronizar jogos',
      next: 'selecione ou crie uma filial e tente novamente'
    }),
    missingApiUrl: guidedMessage({
      severity: SEVERITY.WARNING,
      what: 'URL da API não informada',
      impact: 'a sincronização não foi iniciada',
      next: 'informe uma URL v?lida e sincronize novamente'
    }),
    /** @param {unknown} err */
    fetchFailed: (err) =>
      guidedMessage({
        severity: SEVERITY.ERROR,
        what: `falha ao consultar API externa (${oneLine(err || 'erro desconhecido')})`,
        impact: 'nenhum jogo foi importado',
        next: 'valide a URL e a conexão; depois tente sincronizar novamente'
      }),
    emptyPayload: guidedMessage({
      severity: SEVERITY.WARNING,
      what: 'a API retornou dados sem jogos no formato esperado',
      impact: 'nenhum jogo foi processado',
      next: 'use uma API compatível ou ajuste o endpoint'
    }),
    noEligible: guidedMessage({
      severity: SEVERITY.INFO,
      what: 'nenhum jogo elegível para importar com o filtro atual',
      impact: 'a agenda permanece sem alterações',
      next: 'remova ou ajuste o filtro por time e tente novamente'
    }),
    /**
     * @param {{
     *   processados?: number;
     *   falhas?: number;
     * }} [input]
     */
    syncResult: ({ processados = 0, falhas = 0 } = {}) =>
      guidedMessage({
        severity: falhas > 0 ? SEVERITY.WARNING : SEVERITY.SUCCESS,
        what: `sincronização concluída (${processados} jogo(s), ${falhas} falha(s) de persistência)`,
        impact:
          falhas > 0 ? 'alguns jogos podem estar s? no cache local' : 'agenda atualizada no banco',
        next:
          falhas > 0
            ? 'revise permissões/tabela jogos_agenda e sincronize novamente'
            : 'confira os jogos no dashboard'
      }),
    invalidForm: guidedMessage({
      severity: SEVERITY.WARNING,
      what: 'dados obrigatórios do jogo não preenchidos',
      impact: 'o jogo não foi salvo',
      next: 'preencha t?tulo e data/hora e tente novamente'
    }),
    saveFallback: guidedMessage({
      severity: SEVERITY.WARNING,
      what: 'jogo salvo apenas localmente',
      impact: 'a agenda pode não sincronizar entre sessões',
      next: 'corrija o acesso ao banco e salve novamente'
    }),
    removeFallback: guidedMessage({
      severity: SEVERITY.WARNING,
      what: 'jogo removido apenas localmente',
      impact: 'pode reaparecer após recarga da agenda',
      next: 'corrija o acesso ao banco e remova novamente'
    })
  }
};
