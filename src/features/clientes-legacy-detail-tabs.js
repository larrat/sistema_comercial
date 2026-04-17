// @ts-check

/**
 * @param {{
 *   D: import('../app/store.js').D;
 *   State: import('../app/store.js').State;
 *   cliDom: import('../types/domain').ScreenDom;
 *   esc: (value: unknown) => string;
 *   fmt: (value: number) => string;
 *   notify: (message: string, severity?: string) => void;
 *   toast: (message: string) => void;
 *   ST_PED: typeof import('./clientes/domain.js').ST_PED;
 *   adicionarLancamentoFidelidadeAction: typeof import('./clientes/actions.js').adicionarLancamentoFidelidadeAction;
 *   adicionarNotaAction: typeof import('./clientes/actions.js').adicionarNotaAction;
 *   fecharVendaClienteAction: typeof import('./clientes/actions.js').fecharVendaClienteAction;
 *   getClienteById: typeof import('./clientes/repository.js').getClienteById;
 *   getPedidoById: (pedidoId: string) => import('../types/domain').Pedido | undefined;
 *   isPedidoFechavel: (pedido: import('../types/domain').Pedido) => boolean;
 *   renderPedMet: () => void;
 *   renderPedidos: () => void;
 *   reopenDetail: (clienteId: string) => Promise<void>;
 *   SEVERITY: typeof import('../shared/messages.js').SEVERITY;
 * }} deps
 */
export function createClientesLegacyDetailTabs(deps) {
  const {
    D,
    State,
    cliDom,
    esc,
    fmt,
    notify,
    toast,
    ST_PED,
    adicionarLancamentoFidelidadeAction,
    adicionarNotaAction,
    fecharVendaClienteAction,
    getClienteById,
    getPedidoById,
    isPedidoFechavel,
    renderPedMet,
    renderPedidos,
    reopenDetail,
    SEVERITY
  } = deps;

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
    await reopenDetail(clienteId);
    switchCliDetTab(clienteId, 'fidelidade');
  }

  /**
   * @param {string} pedidoId
   * @param {string} clienteId
   */
  async function fecharVendaCliente(pedidoId, clienteId) {
    const cliente = getClienteById(clienteId);
    const pedido = getPedidoById(pedidoId);
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
    await reopenDetail(clienteId);
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
    syncNotasCache,
    renderNotasHtml,
    renderClientePedidosLista,
    renderFidelidadeTab,
    switchCliDetTab,
    adicionarLancamentoFidelidade,
    fecharVendaCliente,
    addNota
  };
}
