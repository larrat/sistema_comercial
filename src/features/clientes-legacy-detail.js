// @ts-check

/**
 * @param {{
 *   D: import('../app/store.js').D;
 *   State: import('../app/store.js').State;
 *   SB: import('../app/api.js').SB;
 *   cliDom: import('../types/domain').ScreenDom;
 *   esc: (value: unknown) => string;
 *   avc: (nome: unknown) => { bg: string; c: string };
 *   ini: (nome: unknown) => string;
 *   fmtAniv: (iso?: string | null) => string;
 *   fmt: (value: number) => string;
 *   notify: (message: string, severity?: string) => void;
 *   toast: (message: string) => void;
 *   abrirModal: (id: string) => void;
 *   getContatoInfo: typeof import('./clientes/domain.js').getContatoInfo;
 *   normalizeDoc: typeof import('./clientes/domain.js').normalizeDoc;
 *   normalizeEmail: typeof import('./clientes/domain.js').normalizeEmail;
 *   normalizePhone: typeof import('./clientes/domain.js').normalizePhone;
 *   parseTimes: typeof import('./clientes/domain.js').parseTimes;
 *   PRAZO_DETALHE_LABELS: typeof import('./clientes/domain.js').PRAZO_DETALHE_LABELS;
 *   ST_B: typeof import('./clientes/domain.js').ST_B;
 *   ST_PED: typeof import('./clientes/domain.js').ST_PED;
 *   TAB_LABELS: typeof import('./clientes/domain.js').TAB_LABELS;
 *   getClientes: typeof import('./clientes/repository.js').getClientes;
 *   getClienteById: typeof import('./clientes/repository.js').getClienteById;
 *   getDiasParaAniversario: (iso?: string | null) => number | null;
 *   adicionarLancamentoFidelidadeAction: typeof import('./clientes/actions.js').adicionarLancamentoFidelidadeAction;
 *   adicionarNotaAction: typeof import('./clientes/actions.js').adicionarNotaAction;
 *   fecharVendaClienteAction: typeof import('./clientes/actions.js').fecharVendaClienteAction;
 *   renderPedMet: () => void;
 *   renderPedidos: () => void;
 *   SEVERITY: typeof import('../shared/messages.js').SEVERITY;
 * }} deps
 */
export function createClientesLegacyDetail(deps) {
  const {
    D,
    State,
    SB,
    cliDom,
    esc,
    avc,
    ini,
    fmtAniv,
    fmt,
    notify,
    toast,
    abrirModal,
    getContatoInfo,
    normalizeDoc,
    normalizeEmail,
    normalizePhone,
    parseTimes,
    PRAZO_DETALHE_LABELS,
    ST_B,
    ST_PED,
    TAB_LABELS,
    getClientes,
    getClienteById,
    getDiasParaAniversario,
    adicionarLancamentoFidelidadeAction,
    adicionarNotaAction,
    fecharVendaClienteAction,
    renderPedMet,
    renderPedidos,
    SEVERITY
  } = deps;

  /**
   * @param {string} id
   * @returns {{ input: HTMLInputElement | null; list: HTMLElement | null }}
   */
  function getDetailElements(id) {
    return {
      input: /** @type {HTMLInputElement | null} */ (document.getElementById(`nota-inp-${id}`)),
      list: /** @type {HTMLElement | null} */ (document.getElementById(`notas-${id}`))
    };
  }

  /**
   * @param {string} id
   * @param {Array<{ texto?: string; data?: string }>} notas
   */
  function syncNotasCache(id, notas) {
    if (!D.notas) D.notas = {};
    D.notas[id] = Array.isArray(notas) ? [...notas] : [];
  }

  /**
   * @param {Array<{ texto?: string; data?: string }>} notas
   * @returns {string}
   */
  function renderNotasHtml(notas) {
    if (!notas.length) {
      return '<div class="empty-inline table-cell-muted">Nenhuma nota.</div>';
    }

    return notas
      .map(
        (nota) => `
      <div class="nota">
        <div>${esc(nota.texto)}</div>
        <div class="nota-d">${esc(nota.data)}</div>
      </div>
    `
      )
      .join('');
  }

  /**
   * @param {string} id
   */
  function renderNotasCliente(id) {
    const { list } = getDetailElements(id);
    if (!list) return;
    list.innerHTML = renderNotasHtml(D.notas?.[id] || []);
  }

  /**
   * @param {import('../types/domain').Cliente | null | undefined} cliente
   */
  function getClienteDuplicidadeSignals(cliente) {
    const checks = [
      { label: 'documento', value: normalizeDoc(cliente?.doc), fieldId: 'c-doc' },
      { label: 'e-mail', value: normalizeEmail(cliente?.email), fieldId: 'c-email' },
      { label: 'telefone', value: normalizePhone(cliente?.tel), fieldId: 'c-tel' },
      { label: 'WhatsApp', value: normalizePhone(cliente?.whatsapp), fieldId: 'c-whatsapp' }
    ];

    return checks
      .filter((check) => check.value)
      .map((check) => {
        const duplicado =
          getClientes().find((item) => {
            if (!item || item.id === cliente?.id) return false;
            if (check.label === 'telefone' || check.label === 'WhatsApp') {
              return [normalizePhone(item.tel), normalizePhone(item.whatsapp)]
                .filter(Boolean)
                .includes(check.value);
            }
            if (check.label === 'documento') return normalizeDoc(item.doc) === check.value;
            return normalizeEmail(item.email) === check.value;
          }) || null;

        return duplicado ? { ...check, cliente: duplicado } : null;
      })
      .filter(Boolean);
  }

  /**
   * @param {import('../types/domain').Pedido} pedido
   */
  function isPedidoFechavel(pedido) {
    return pedido.status === 'entregue' && !pedido.venda_fechada;
  }

  /**
   * @param {import('../types/domain').Cliente} cliente
   * @returns {import('../types/domain').Pedido[]}
   */
  function getPedidosCliente(cliente) {
    return (D.pedidos?.[State.FIL] || [])
      .filter((pedido) => {
        const clienteId = String(cliente.id || '').trim();
        const pedidoClienteId = String(pedido?.cliente_id || '').trim();
        if (clienteId && pedidoClienteId) return pedidoClienteId === clienteId;

        const nome = String(cliente.nome || '')
          .trim()
          .toLowerCase();
        return (
          String(pedido?.cli || '')
            .trim()
            .toLowerCase() === nome
        );
      })
      .map((pedido) => ({
        ...pedido,
        itens: Array.isArray(pedido.itens)
          ? pedido.itens
          : (() => {
              try {
                const parsed = JSON.parse(String(pedido.itens || '[]'));
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            })()
      }))
      .sort((a, b) => (b.num || 0) - (a.num || 0));
  }

  /**
   * @param {import('../types/domain').Pedido[]} pedidos
   */
  function renderClientePedidosVazios(pedidos) {
    if (pedidos.length) return '';
    return '<div class="empty-inline table-cell-muted">Nenhuma venda neste grupo.</div>';
  }

  /**
   * @param {import('../types/domain').Pedido[]} pedidos
   * @param {string} clienteId
   * @param {'abertas'|'fechadas'} tipo
   */
  function renderClientePedidosLista(pedidos, clienteId, tipo) {
    if (!pedidos.length) return renderClientePedidosVazios(pedidos);

    return pedidos
      .map((pedido) => {
        const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
        const itensTxt = itens.length ? `${itens.length} item(ns)` : 'Sem itens';
        const fechadoEm = pedido.venda_fechada_em
          ? new Date(pedido.venda_fechada_em).toLocaleString('pt-BR')
          : '';

        return `
        <div class="cli-sale-card">
          <div class="cli-sale-card__head">
            <div>
              <div class="cli-sale-card__title">Pedido #${pedido.num}</div>
              <div class="cli-sale-card__sub">${esc(pedido.data || '-')} | ${itensTxt}</div>
            </div>
            <div class="fg2">
              ${ST_PED[pedido.status] || ''}
              ${pedido.venda_fechada ? '<span class="bdg bb">Fechada</span>' : ''}
            </div>
          </div>
          <div class="cli-sale-card__meta">
            <span>Total: <b>${fmt(pedido.total || 0)}</b></span>
            <span>Pagamento: <b>${esc(String(pedido.pgto || '-'))}</b></span>
            <span>Prazo: <b>${esc(String(pedido.prazo || '-'))}</b></span>
            ${fechadoEm ? `<span>Fechada em: <b>${esc(fechadoEm)}</b></span>` : ''}
          </div>
          <div class="cli-sale-card__actions">
            <button class="btn btn-sm" data-click="verPed('${pedido.id}')">Ver pedido</button>
            ${
              tipo === 'abertas' && isPedidoFechavel(pedido)
                ? `<button class="btn btn-p btn-sm" data-click="fecharVendaCliente('${pedido.id}','${clienteId}')">Fechar venda</button>`
                : ''
            }
          </div>
        </div>
      `;
      })
      .join('');
  }

  /**
   * @param {import('../types/domain').Cliente} cliente
   * @param {import('../types/domain').Pedido[]} pedidos
   */
  function buildClienteContextualPanelV2(cliente, pedidos) {
    const duplicidades = getClienteDuplicidadeSignals(cliente);
    const aniversarioDias = getDiasParaAniversario(cliente?.data_aniversario || '');
    const contato = getContatoInfo(cliente);
    const canaisMarketing = [
      cliente?.optin_marketing && (cliente?.whatsapp || cliente?.tel) ? 'WhatsApp' : '',
      cliente?.optin_email && cliente?.email ? 'E-mail' : '',
      cliente?.optin_sms && cliente?.tel ? 'SMS' : ''
    ].filter(Boolean);
    const pedidoFechavel = pedidos.find((pedido) => isPedidoFechavel(pedido)) || null;
    const pedidoAberto =
      pedidos.find((pedido) => !pedido.venda_fechada && pedido.status !== 'cancelado') || null;

    /** @type {string[]} */
    const cadastroERisco = [];
    /** @type {string[]} */
    const momentoComercial = [];

    /**
     * @param {string} title
     * @param {string} sub
     * @param {string[]} cards
     */
    const renderSection = (title, sub, cards) => {
      if (!cards.length) return '';
      return `
        <section class="context-panel__section">
          <div class="context-panel__section-head">
            <div class="context-panel__section-title">${title}</div>
            <div class="context-panel__section-sub">${sub}</div>
          </div>
          <div class="context-panel__grid">
            ${cards.join('')}
          </div>
        </section>
      `;
    };

    if (duplicidades.length) {
      const duplicidade = duplicidades[0];
      cadastroERisco.push(`
        <article class="context-card context-card--danger">
          <div class="context-card__head">
            <span class="bdg br">Cadastro</span>
            <span class="context-card__kicker">Risco</span>
          </div>
          <div class="context-card__title">Suspeita de duplicidade</div>
          <div class="context-card__copy">${duplicidade.label} tambem aparece em ${esc(duplicidade.cliente?.nome || 'outro cliente')}.</div>
          <div class="context-card__actions">
            <button class="btn btn-sm" data-click="editarCli('${cliente.id}')">Revisar cadastro</button>
          </div>
        </article>
      `);
    }

    if (
      (typeof aniversarioDias === 'number' && aniversarioDias <= 7) ||
      !canaisMarketing.length ||
      contato.principal === 'Sem contato'
    ) {
      const copy =
        contato.principal === 'Sem contato'
          ? 'Cliente sem canal principal de contato cadastrado.'
          : !canaisMarketing.length
            ? 'Cliente sem opt-in pronto para ativacao comercial.'
            : aniversarioDias === 0
              ? 'Aniversario hoje com canal pronto para relacionamento.'
              : aniversarioDias === 1
                ? 'Aniversario amanha com base pronta para abordagem.'
                : `Aniversario em ${aniversarioDias} dia(s) com canal pronto para campanha.`;

      cadastroERisco.push(`
        <article class="context-card context-card--warning">
          <div class="context-card__head">
            <span class="bdg ba">Relacionamento</span>
            <span class="context-card__kicker">Cadastro</span>
          </div>
          <div class="context-card__title">Proxima acao comercial</div>
          <div class="context-card__copy">${copy}</div>
          <div class="context-card__actions">
            <button class="btn btn-sm" data-click="editarCli('${cliente.id}')">Atualizar cadastro</button>
            <button class="btn btn-sm" data-click="ir('campanhas')">Ir para campanhas</button>
          </div>
        </article>
      `);
    }

    if (pedidoFechavel) {
      momentoComercial.push(`
        <article class="context-card context-card--success">
          <div class="context-card__head">
            <span class="bdg bg">Venda</span>
            <span class="context-card__kicker">Fechamento</span>
          </div>
          <div class="context-card__title">Pedido pronto para fechar</div>
          <div class="context-card__copy">Pedido #${pedidoFechavel.num} ja foi entregue e pode virar venda fechada agora.</div>
          <div class="context-card__actions">
            <button class="btn btn-p btn-sm" data-click="fecharVendaCliente('${pedidoFechavel.id}','${cliente.id}')">Fechar venda</button>
          </div>
        </article>
      `);
    } else if (pedidoAberto) {
      momentoComercial.push(`
        <article class="context-card context-card--info">
          <div class="context-card__head">
            <span class="bdg bb">Pipeline</span>
            <span class="context-card__kicker">Pedidos</span>
          </div>
          <div class="context-card__title">Cliente com venda em andamento</div>
          <div class="context-card__copy">Ha pedido(s) aberto(s) para este cliente e vale acompanhar o fechamento.</div>
          <div class="context-card__actions">
            <button class="btn btn-sm" data-click="switchCliDetTab('${cliente.id}','abertas')">Ver vendas abertas</button>
          </div>
        </article>
      `);
    }

    const sections = [
      renderSection(
        'Cadastro e risco',
        'Sinais que pertencem ao cadastro e aos canais deste cliente.',
        cadastroERisco.slice(0, 2)
      ),
      renderSection(
        'Momento comercial',
        'Leitura da jornada do cliente com base nos pedidos e no proximo movimento.',
        momentoComercial.slice(0, 1)
      )
    ].filter(Boolean);

    if (!sections.length) return '';

    return `
      <div class="context-panel context-panel--cliente">
        <div class="context-panel__head">
          <div class="context-panel__title">Contexto do cliente</div>
          <div class="context-panel__sub">Leitura separada entre cadastro, risco e momento comercial</div>
        </div>
        <div class="context-panel__sections">
          ${sections.join('')}
        </div>
      </div>
    `;
  }

  /**
   * @param {string} clienteId
   * @param {'resumo'|'abertas'|'fechadas'|'fidelidade'} tab
   */
  function switchCliDetTab(clienteId, tab) {
    const box = cliDom.get('cli-det-box');
    if (!box) return;

    box.querySelectorAll(`[data-cli-tab="${clienteId}"]`).forEach((el) => {
      el.classList.toggle('on', el instanceof HTMLElement && el.dataset.tab === tab);
    });
    box.querySelectorAll(`[data-cli-panel="${clienteId}"]`).forEach((el) => {
      el.classList.toggle('on', el instanceof HTMLElement && el.dataset.panel === tab);
    });
  }

  /**
   * @param {string} clienteId
   * @param {import('../types/domain').ClienteFidelidadeSaldo | null} saldo
   * @param {import('../types/domain').ClienteFidelidadeLancamento[]} lancamentos
   * @returns {string}
   */
  function renderFidelidadeTab(clienteId, saldo, lancamentos) {
    const TIPO_LABEL = {
      credito: 'Crédito',
      debito: 'Débito',
      ajuste: 'Ajuste',
      expiracao: 'Expiração',
      estorno: 'Estorno'
    };
    const STATUS_LABEL = { pendente: 'Pendente', confirmado: 'Confirmado', cancelado: 'Cancelado' };
    const STATUS_BADGE = { pendente: 'ba', confirmado: 'bg', cancelado: 'br' };

    const saldoHtml = saldo
      ? `
        <div class="fid-saldo-grid">
          <div class="met fid-met">
            <div class="ml">Saldo</div>
            <div class="mv ${saldo.bloqueado ? 'tone-danger' : 'tone-success'}">${Number(saldo.saldo_pontos ?? 0)}<span class="mv-unit"> pts</span></div>
            ${saldo.bloqueado ? `<div class="ms tone-danger">Bloqueado${saldo.motivo_bloqueio ? ` - ${esc(saldo.motivo_bloqueio)}` : ''}</div>` : '<div class="ms tone-success">Ativo</div>'}
          </div>
          <div class="met fid-met">
            <div class="ml">Acumulado</div>
            <div class="mv">${Number(saldo.total_acumulado ?? 0)}<span class="mv-unit"> pts</span></div>
            <div class="ms">total creditado</div>
          </div>
          <div class="met fid-met">
            <div class="ml">Resgatado</div>
            <div class="mv">${Number(saldo.total_resgatado ?? 0)}<span class="mv-unit"> pts</span></div>
            <div class="ms">total debitado</div>
          </div>
        </div>
      `
      : `<div class="empty-inline"><p>Nenhum saldo de fidelidade registrado para este cliente.</p></div>`;

    const lancsHtml = lancamentos.length
      ? `
        <div class="tw fid-hist-table">
          <table class="tbl">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Pontos</th>
                <th>Status</th>
                <th>Origem</th>
                <th>Obs</th>
              </tr>
            </thead>
            <tbody>
              ${lancamentos
                .slice(0, 30)
                .map(
                  (l) => `
                <tr>
                  <td class="table-cell-muted">${l.criado_em ? new Date(l.criado_em).toLocaleDateString('pt-BR') : '-'}</td>
                  <td><span class="bdg ${l.pontos > 0 ? 'bg' : 'br'}">${TIPO_LABEL[l.tipo] || esc(l.tipo || '')}</span></td>
                  <td class="table-cell-strong ${l.pontos > 0 ? 'tone-success' : 'tone-danger'}">${l.pontos > 0 ? '+' : ''}${l.pontos}</td>
                  <td><span class="bdg ${STATUS_BADGE[l.status] || 'bk'}">${STATUS_LABEL[l.status] || esc(l.status || '')}</span></td>
                  <td class="table-cell-muted">${esc(l.origem || '') || '-'}</td>
                  <td class="table-cell-caption">${esc(l.observacao || '') || '-'}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
      : `<div class="empty-inline"><p>Nenhum lançamento registrado.</p></div>`;

    return `
      <div class="fid-panel">
        <div class="cli-detail-label form-gap-bottom-xs">Saldo de fidelidade</div>
        ${saldoHtml}

        <div class="cli-detail-label form-gap-bottom-xs" style="margin-top:16px">Adicionar lançamento manual</div>
        <div class="fid-form fg2 form-gap-bottom-xs">
          <select class="inp fid-tipo" id="fid-tipo-${clienteId}">
            <option value="credito">Crédito</option>
            <option value="debito">Débito</option>
            <option value="ajuste">Ajuste</option>
            <option value="estorno">Estorno</option>
          </select>
          <input type="number" class="inp fid-pontos" id="fid-pontos-${clienteId}" placeholder="Pontos (ex: 100 ou -50)" step="1">
          <input class="inp fid-obs input-flex" id="fid-obs-${clienteId}" placeholder="Observação (opcional)">
          <button class="btn btn-p btn-sm" data-click="adicionarLancamentoFidelidade('${clienteId}')">Lançar</button>
        </div>

        <div class="cli-detail-label form-gap-bottom-xs">Histórico (últimos 30)</div>
        ${lancsHtml}
      </div>
    `;
  }

  /**
   * @param {string} clienteId
   */
  async function adicionarLancamentoFidelidade(clienteId) {
    const tipoEl = /** @type {HTMLSelectElement|null} */ (
      document.getElementById(`fid-tipo-${clienteId}`)
    );
    const pontosEl = /** @type {HTMLInputElement|null} */ (
      document.getElementById(`fid-pontos-${clienteId}`)
    );
    const obsEl = /** @type {HTMLInputElement|null} */ (
      document.getElementById(`fid-obs-${clienteId}`)
    );

    const tipo = tipoEl?.value || 'credito';
    const pontosRaw = Number(pontosEl?.value || 0);
    const obs = obsEl?.value.trim() || null;

    if (!pontosRaw || Number.isNaN(pontosRaw)) {
      notify('Informe a quantidade de pontos para o lançamento.', SEVERITY.WARNING);
      pontosEl?.focus();
      return;
    }

    const pontos = tipo === 'debito' ? -Math.abs(pontosRaw) : pontosRaw;

    const result = await adicionarLancamentoFidelidadeAction(clienteId, {
      tipo,
      pontos,
      observacao: obs
    });
    if (!result.ok) {
      console.error('Erro ao inserir lançamento de fidelidade', result.error);
      notify(
        `Erro ao lançar pontos: ${String(result.error?.message || 'tente novamente')}.`,
        SEVERITY.ERROR
      );
      return;
    }

    notify(`Sucesso: ${pontos > 0 ? '+' : ''}${pontos} pontos lançados.`, SEVERITY.SUCCESS);
    await abrirCliDet(clienteId);
    switchCliDetTab(clienteId, 'fidelidade');
  }

  /**
   * @param {string} id
   */
  async function abrirCliDet(id) {
    const cliente = getClienteById(id);
    if (!cliente) return;

    const cor = avc(cliente.nome);
    let notas = [];

    try {
      notas = (await SB.getNotas(id)) || [];
    } catch (error) {
      console.error('Erro ao carregar notas do cliente', error);
    }

    syncNotasCache(id, notas);

    const [fidelSaldo, fidelLancs] = await Promise.all([
      SB.toResult(() => SB.getClienteFidelidadeSaldo(id)),
      SB.toResult(() => SB.getClienteFidelidadeLancamentos(id))
    ]);

    /** @type {import('../types/domain').ClienteFidelidadeSaldo | null} */
    const saldo = fidelSaldo.ok ? fidelSaldo.data || null : null;
    /** @type {import('../types/domain').ClienteFidelidadeLancamento[]} */
    const lancamentos = fidelLancs.ok ? fidelLancs.data || [] : [];

    const pedidos = getPedidosCliente(cliente);
    const vendasFechadas = pedidos.filter((pedido) => !!pedido.venda_fechada);
    const vendasAbertas = pedidos.filter(
      (pedido) => !pedido.venda_fechada && pedido.status !== 'cancelado'
    );
    const contextoCliente = buildClienteContextualPanelV2(cliente, pedidos);

    const times = parseTimes(cliente.time);
    const contato = [
      cliente.resp ? `Resp: ${cliente.resp}` : '',
      cliente.tel || '',
      cliente.whatsapp ? `WhatsApp: ${cliente.whatsapp}` : '',
      cliente.email || '',
      cliente.data_aniversario ? `Aniversario: ${fmtAniv(cliente.data_aniversario)}` : '',
      cliente.cidade ? `${cliente.cidade}${cliente.estado ? ` - ${cliente.estado}` : ''}` : ''
    ].filter(Boolean);

    cliDom.html(
      'detail',
      'cli-det-box',
      `
      <div class="cli-detail">
        <div class="cli-detail-head fb">
          <div class="cli-detail-hero">
            <div class="av cli-detail-avatar" style="background:${cor.bg};color:${cor.c}">
            ${esc(ini(cliente.nome))}
          </div>
            <div>
              <div class="cli-detail-title">${esc(cliente.nome)}</div>
              ${cliente.apelido ? `<div class="cli-detail-sub">${esc(cliente.apelido)}</div>` : ''}
              <div class="cli-detail-status">${ST_B[cliente.status] || ''}</div>
            </div>
          </div>
        </div>

        <div class="cli-detail-grid">
          <div class="cli-detail-panel">
            <div class="cli-detail-label">Contato</div>
          ${contato.length ? contato.map((item) => `<div class="detail-line">${esc(item)}</div>`).join('') : '-'}
          </div>

          <div class="cli-detail-panel">
            <div class="cli-detail-label">Comercial</div>
            <div>Tabela: ${TAB_LABELS[cliente.tab] || '-'}</div>
            <div>Prazo: ${esc(PRAZO_DETALHE_LABELS[cliente.prazo] || '-')}</div>
          ${cliente.rca_nome ? `<div>RCA: ${esc(cliente.rca_nome)}</div>` : ''}
          ${times.length ? `<div>Times: ${esc(times.join(', '))}</div>` : ''}
          ${cliente.seg ? `<div>Segmento: ${esc(cliente.seg)}</div>` : ''}
          </div>
        </div>

        ${contextoCliente}

        <div class="tabs cli-detail-tabs">
          <button class="tb on" type="button" data-cli-tab="${id}" data-tab="resumo" data-click="switchCliDetTab('${id}','resumo')">Resumo</button>
          <button class="tb" type="button" data-cli-tab="${id}" data-tab="abertas" data-click="switchCliDetTab('${id}','abertas')">Vendas abertas <span class="bdg bk">${vendasAbertas.length}</span></button>
          <button class="tb" type="button" data-cli-tab="${id}" data-tab="fechadas" data-click="switchCliDetTab('${id}','fechadas')">Vendas fechadas <span class="bdg bb">${vendasFechadas.length}</span></button>
          <button class="tb" type="button" data-cli-tab="${id}" data-tab="fidelidade" data-click="switchCliDetTab('${id}','fidelidade')">Fidelidade ${saldo ? `<span class="bdg ${saldo.bloqueado ? 'br' : 'bg'}">${Number(saldo.saldo_pontos ?? 0)} pts</span>` : '<span class="bdg bk">-</span>'}</button>
        </div>

        <div class="tc on" data-cli-panel="${id}" data-panel="resumo">
        ${
          cliente.obs
            ? `
          <div class="panel cli-detail-section">
          <div class="pt">Observacoes</div>
            <p class="detail-copy">${esc(cliente.obs)}</p>
        </div>
        `
            : ''
        }

        <div class="cli-detail-label form-gap-bottom-xs">Notas / historico</div>
        <div class="fg2 cli-detail-notes-input form-gap-bottom-xs">
        <input class="inp input-flex" id="nota-inp-${id}" placeholder="Adicionar nota...">
        <button class="btn btn-sm" data-click="addNota('${id}')">+</button>
      </div>

        <div class="cli-detail-notes" id="notas-${id}">${renderNotasHtml(D.notas?.[id] || [])}</div>
        </div>

        <div class="tc" data-cli-panel="${id}" data-panel="abertas">
          <div class="cli-detail-label form-gap-bottom-xs">Pedidos em andamento ou entregues aguardando fechamento</div>
          <div class="cli-sales-list">
            ${renderClientePedidosLista(vendasAbertas, id, 'abertas')}
          </div>
        </div>

        <div class="tc" data-cli-panel="${id}" data-panel="fechadas">
          <div class="cli-detail-label form-gap-bottom-xs">Vendas fechadas deste cliente</div>
          <div class="cli-sales-list">
            ${renderClientePedidosLista(vendasFechadas, id, 'fechadas')}
          </div>
        </div>

        <div class="tc" data-cli-panel="${id}" data-panel="fidelidade">
          ${renderFidelidadeTab(id, saldo, lancamentos)}
        </div>

        <div class="cli-detail-actions">
        <button class="btn" data-click="fecharModal('modal-cli-det')">Fechar</button>
        <button class="btn btn-p" data-click="fecharModal('modal-cli-det');editarCli('${id}')">Editar</button>
        </div>
      </div>
    `,
      'clientes:detalhe'
    );

    abrirModal('modal-cli-det');
  }

  /**
   * @param {string} pedidoId
   * @param {string} clienteId
   */
  async function fecharVendaCliente(pedidoId, clienteId) {
    const cliente = getClienteById(clienteId);
    const pedido = (D.pedidos?.[State.FIL] || []).find((item) => item.id === pedidoId);
    if (!cliente || !pedido) return;
    if (!isPedidoFechavel(pedido)) {
      toast('Somente pedidos entregues e ainda abertos podem ser fechados.');
      return;
    }
    if (!confirm(`Fechar a venda do pedido #${pedido.num}?`)) return;

    const result = await fecharVendaClienteAction(pedido, {
      userEmail: String(State.user?.email || State.user?.id || '').trim() || null
    });
    if (!result.ok) {
      notify(
        `Erro ao fechar venda: ${String(result.error instanceof Error ? result.error.message : 'erro desconhecido')}.`,
        SEVERITY.ERROR
      );
      return;
    }

    renderPedMet();
    renderPedidos();
    toast(`Venda do pedido #${pedido.num} fechada com sucesso.`);
    await abrirCliDet(clienteId);
    switchCliDetTab(clienteId, 'fechadas');
  }

  /**
   * @param {string} id
   */
  async function addNota(id) {
    const { input } = getDetailElements(id);
    const texto = input?.value.trim() || '';
    if (!texto) return;

    const nota = {
      cliente_id: id,
      texto,
      data: new Date().toLocaleString('pt-BR')
    };

    const result = await adicionarNotaAction(nota);
    if (!result.ok) {
      toast(`Erro: ${result.error instanceof Error ? result.error.message : 'erro desconhecido'}`);
      return;
    }

    if (input) input.value = '';
    renderNotasCliente(id);
    toast('Nota adicionada!');
  }

  return {
    switchCliDetTab,
    adicionarLancamentoFidelidade,
    abrirCliDet,
    fecharVendaCliente,
    addNota
  };
}
