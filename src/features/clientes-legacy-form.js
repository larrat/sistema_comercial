// @ts-check

/**
 * @param {{
 *   State: import('../app/store.js').State;
 *   cliDom: import('../types/domain').ScreenDom;
 *   MSG: typeof import('../shared/messages.js').MSG;
 *   SEVERITY: typeof import('../shared/messages.js').SEVERITY;
 *   notify: typeof import('../shared/utils.js').notify;
 *   notifyGuided: typeof import('../shared/utils.js').notifyGuided;
 *   focusField: typeof import('../shared/utils.js').focusField;
 *   abrirModal: typeof import('../shared/utils.js').abrirModal;
 *   fecharModal: typeof import('../shared/utils.js').fecharModal;
 *   refreshRcaSelectors: typeof import('./rcas.js').refreshRcaSelectors;
 *   getRcaNomeById: typeof import('./rcas.js').getRcaNomeById;
 *   parseTimes: typeof import('./clientes/domain.js').parseTimes;
 *   getClientes: typeof import('./clientes/repository.js').getClientes;
 *   getClienteById: typeof import('./clientes/repository.js').getClienteById;
 *   checkClienteIdentity: typeof import('../shared/clientes-pilot-bridge.js').checkClienteIdentity;
 *   salvarClienteAction: typeof import('./clientes/actions.js').salvarClienteAction;
 *   renderCliMet: () => void;
 *   renderClientes: () => void;
 *   renderCliSegs: () => void;
 *   refreshCliDL: () => void;
 *   setFlowStepSafe: (flowId: string, nextStep: number) => void;
 * }} deps
 */
export function createClientesLegacyForm(deps) {
  const {
    State,
    cliDom,
    MSG,
    SEVERITY,
    notify,
    notifyGuided,
    focusField,
    abrirModal,
    fecharModal,
    refreshRcaSelectors,
    getRcaNomeById,
    parseTimes,
    getClientes,
    getClienteById,
    checkClienteIdentity,
    salvarClienteAction,
    renderCliMet,
    renderClientes,
    renderCliSegs,
    refreshCliDL,
    setFlowStepSafe
  } = deps;

  const CLI_FORM_IDS = [
    'c-nome',
    'c-apelido',
    'c-doc',
    'c-tel',
    'c-whatsapp',
    'c-email',
    'c-aniv',
    'c-time',
    'c-resp',
    'c-seg',
    'c-cidade',
    'c-estado',
    'c-obs'
  ];

  const CLI_SELECT_DEFAULTS = {
    'c-tipo': 'PJ',
    'c-status': 'ativo',
    'c-rca': '',
    'c-tab': 'padrao',
    'c-prazo': 'a_vista'
  };

  const CLI_CHECKBOX_IDS = ['c-optin-marketing', 'c-optin-email', 'c-optin-sms'];

  /** @type {Record<string, string>} */
  const CLI_FIELD_DOM_IDS = {
    doc: 'c-doc',
    email: 'c-email',
    tel: 'c-tel',
    whatsapp: 'c-whatsapp'
  };

  /**
   * @param {{
   *   doc?: string;
   *   email?: string;
   *   tel?: string;
   *   whatsapp?: string;
   *   editId?: string | null;
   * }} [input]
   */
  function findClienteDuplicadoIdentidade({
    doc = '',
    email = '',
    tel = '',
    whatsapp = '',
    editId = null
  } = {}) {
    const conflict = checkClienteIdentity(
      { id: editId, nome: '', doc, email, tel, whatsapp },
      getClientes()
    );
    if (!conflict) return null;
    return {
      key: conflict.field,
      label: conflict.label,
      fieldId: CLI_FIELD_DOM_IDS[conflict.field] ?? `c-${conflict.field}`,
      value: conflict.normalizedValue,
      cliente: conflict.existing
    };
  }

  /**
   * @param {unknown} err
   */
  function extractClienteConstraintName(err) {
    /** @type {{ message?: unknown; details?: unknown } | null} */
    const errObj =
      err && typeof err === 'object'
        ? /** @type {{ message?: unknown; details?: unknown }} */ (err)
        : null;

    /** @type {{ response?: { message?: unknown; details?: unknown; code?: unknown } } | null} */
    const detailsObj =
      errObj?.details && typeof errObj.details === 'object'
        ? /** @type {{ response?: { message?: unknown; details?: unknown; code?: unknown } }} */ (
            errObj.details
          )
        : null;

    const text = [
      errObj?.message,
      detailsObj?.response?.message,
      detailsObj?.response?.details,
      detailsObj?.response?.code
    ]
      .map((value) => String(value || ''))
      .join(' | ');

    const match = text.match(/ux_clientes_[A-Za-z0-9_]+/);
    return match ? match[0] : '';
  }

  /**
   * @param {unknown} err
   * @param {ReturnType<typeof findClienteDuplicadoIdentidade> | null} [fallbackConflict=null]
   */
  function handleClienteDuplicadoError(err, fallbackConflict = null) {
    const constraint = extractClienteConstraintName(err);
    const conflictByConstraint =
      constraint === 'ux_clientes_filial_doc_norm'
        ? { label: 'documento', fieldId: 'c-doc', cliente: null }
        : constraint === 'ux_clientes_filial_email_norm'
          ? { label: 'e-mail', fieldId: 'c-email', cliente: null }
          : constraint === 'ux_clientes_filial_tel_norm' ||
              constraint === 'ux_clientes_filial_tel_identity'
            ? { label: 'telefone', fieldId: 'c-tel', cliente: null }
            : constraint === 'ux_clientes_filial_whatsapp_norm' ||
                constraint === 'ux_clientes_filial_whatsapp_identity'
              ? { label: 'WhatsApp', fieldId: 'c-whatsapp', cliente: null }
              : null;

    const conflict = fallbackConflict || conflictByConstraint;
    if (!conflict) return false;

    notifyGuided({
      severity: SEVERITY.WARNING,
      what: `${conflict.label} ja cadastrado para outro cliente${conflict.cliente?.nome ? ` (${conflict.cliente.nome})` : ''}`,
      impact: 'o cliente nao foi salvo para evitar duplicidade no cadastro',
      next: `revise o campo ${conflict.label} ou edite o cadastro existente`
    });
    focusField(conflict.fieldId, { markError: true });
    return true;
  }

  function limparFormCli() {
    State.editIds.cli = null;
    refreshRcaSelectors();

    cliDom.text('modal', 'cli-modal-titulo', 'Novo cliente', 'clientes:modal-titulo');
    cliDom.text('modal', 'cli-flow-save', 'Salvar cliente', 'clientes:modal-acao');

    CLI_FORM_IDS.forEach((id) => cliDom.value(id, ''));
    Object.entries(CLI_SELECT_DEFAULTS).forEach(([id, value]) => cliDom.value(id, value));
    CLI_CHECKBOX_IDS.forEach((id) => cliDom.checked(id, false));

    setFlowStepSafe('cli', 1);
  }

  /**
   * @param {string} id
   */
  function editarCli(id) {
    const cliente = getClienteById(id);
    if (!cliente) return;

    State.editIds.cli = id;
    refreshRcaSelectors();

    cliDom.text('modal', 'cli-modal-titulo', 'Editar cliente', 'clientes:modal-titulo');
    cliDom.text('modal', 'cli-flow-save', 'Atualizar cliente', 'clientes:modal-acao');

    cliDom.value('c-nome', cliente.nome || '');
    cliDom.value('c-apelido', cliente.apelido || '');
    cliDom.value('c-doc', cliente.doc || '');
    cliDom.value('c-tipo', cliente.tipo || 'PJ');
    cliDom.value('c-status', cliente.status || 'ativo');
    cliDom.value('c-tel', cliente.tel || '');
    cliDom.value('c-whatsapp', cliente.whatsapp || '');
    cliDom.value('c-email', cliente.email || '');
    cliDom.value('c-aniv', cliente.data_aniversario || '');
    cliDom.value('c-time', parseTimes(cliente.time).join(', '));
    cliDom.value('c-resp', cliente.resp || '');
    cliDom.value('c-rca', cliente.rca_id || '');
    cliDom.value('c-seg', cliente.seg || '');
    cliDom.value('c-tab', cliente.tab || 'padrao');
    cliDom.value('c-prazo', cliente.prazo || 'a_vista');
    cliDom.value('c-cidade', cliente.cidade || '');
    cliDom.value('c-estado', cliente.estado || '');
    cliDom.value('c-obs', cliente.obs || '');
    cliDom.checked('c-optin-marketing', !!cliente.optin_marketing);
    cliDom.checked('c-optin-email', !!cliente.optin_email);
    cliDom.checked('c-optin-sms', !!cliente.optin_sms);

    setFlowStepSafe('cli', 1);
    abrirModal('modal-cliente');
  }

  async function salvarCliente() {
    const nome = cliDom.get('c-nome')?.value.trim() || '';
    if (!nome) {
      notify(MSG.forms.required('Nome do cliente'), SEVERITY.WARNING);
      focusField('c-nome', { markError: true });
      return;
    }

    const editId = State.editIds.cli;
    const rcaId = String(cliDom.get('c-rca')?.value || '').trim();
    const rcaNome = rcaId ? getRcaNomeById(rcaId) : '';
    const cliente = {
      id: editId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      filial_id: State.FIL,
      nome,
      rca_id: rcaId || null,
      rca_nome: rcaNome || null,
      apelido: cliDom.get('c-apelido')?.value.trim() || '',
      doc: cliDom.get('c-doc')?.value.trim() || '',
      tipo: cliDom.get('c-tipo')?.value || 'PJ',
      status: cliDom.get('c-status')?.value || 'ativo',
      tel: cliDom.get('c-tel')?.value.trim() || '',
      whatsapp: cliDom.get('c-whatsapp')?.value.trim() || '',
      email: cliDom.get('c-email')?.value.trim() || '',
      data_aniversario: cliDom.get('c-aniv')?.value || null,
      optin_marketing: !!cliDom.get('c-optin-marketing')?.checked,
      optin_email: !!cliDom.get('c-optin-email')?.checked,
      optin_sms: !!cliDom.get('c-optin-sms')?.checked,
      time: parseTimes(cliDom.get('c-time')?.value || '').join(', '),
      resp: cliDom.get('c-resp')?.value.trim() || '',
      seg: cliDom.get('c-seg')?.value.trim() || '',
      tab: cliDom.get('c-tab')?.value || 'padrao',
      prazo: cliDom.get('c-prazo')?.value || 'a_vista',
      cidade: cliDom.get('c-cidade')?.value.trim() || '',
      estado: cliDom.get('c-estado')?.value.trim() || '',
      obs: cliDom.get('c-obs')?.value.trim() || ''
    };

    const clienteDuplicado = findClienteDuplicadoIdentidade({
      doc: cliente.doc,
      email: cliente.email,
      tel: cliente.tel,
      whatsapp: cliente.whatsapp,
      editId
    });

    if (clienteDuplicado) {
      notifyGuided({
        severity: SEVERITY.WARNING,
        what: `${clienteDuplicado.label} ja cadastrado para ${clienteDuplicado.cliente.nome}`,
        impact: 'o cliente nao foi salvo para evitar duplicidade no cadastro',
        next: `revise o campo ${clienteDuplicado.label} ou edite o cadastro existente`
      });
      focusField(clienteDuplicado.fieldId, { markError: true });
      return;
    }

    const result = await salvarClienteAction(cliente, editId);
    if (!result.ok) {
      if (handleClienteDuplicadoError(result.error, clienteDuplicado)) {
        return;
      }
      notify(
        `Erro ao salvar cliente: ${String(result.error instanceof Error ? result.error.message : 'erro desconhecido')}.`,
        SEVERITY.ERROR
      );
      return;
    }

    fecharModal('modal-cliente');
    renderCliMet();
    renderClientes();
    renderCliSegs();
    refreshCliDL();

    const canais = [
      cliente.whatsapp ? 'WhatsApp' : '',
      cliente.tel ? 'Telefone' : '',
      cliente.email ? 'E-mail' : ''
    ].filter(Boolean);
    const prontoCampanha = cliente.optin_marketing && canais.length > 0;

    notify(
      editId
        ? `Cliente atualizado: ${cliente.nome} - Canais: ${canais.join(', ') || 'nenhum'} - Campanhas: ${prontoCampanha ? 'pronto' : 'parcial'}`
        : `Cliente cadastrado: ${cliente.nome} - Canais: ${canais.join(', ') || 'nenhum'} - Campanhas: ${prontoCampanha ? 'pronto' : 'parcial'}`,
      SEVERITY.SUCCESS
    );
  }

  return {
    limparFormCli,
    editarCli,
    salvarCliente
  };
}
