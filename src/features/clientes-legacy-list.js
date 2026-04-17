// @ts-check

/**
 * @param {{
 *   cliDom: import('../types/domain').ScreenDom;
 *   esc: (value: unknown) => string;
 *   avc: (nome: unknown) => { bg: string; c: string };
 *   ini: (nome: unknown) => string;
 *   getBadgeAniversario: (cliente: import('../types/domain').Cliente | null | undefined) => string;
 *   getClientes: typeof import('./clientes/repository.js').getClientes;
 *   getContatoInfo: typeof import('./clientes/domain.js').getContatoInfo;
 *   parseTimes: typeof import('./clientes/domain.js').parseTimes;
 *   TAB_LABELS: typeof import('./clientes/domain.js').TAB_LABELS;
 *   PRAZO_LABELS: typeof import('./clientes/domain.js').PRAZO_LABELS;
 *   ST_B: typeof import('./clientes/domain.js').ST_B;
 *   filterClientesFromLegacy: typeof import('../shared/clientes-pilot-bridge.js').filterClientesFromLegacy;
 *   getClienteSegmentosFromLegacy: typeof import('../shared/clientes-pilot-bridge.js').getClienteSegmentosFromLegacy;
 *   measureRender: typeof import('../shared/render-metrics.js').measureRender;
 *   buildSkeletonLines: typeof import('./runtime-loading.js').buildSkeletonLines;
 *   isRuntimeBootstrapping: () => boolean;
 * }} deps
 */
export function createClientesLegacyList(deps) {
  const {
    cliDom,
    esc,
    avc,
    ini,
    getBadgeAniversario,
    getClientes,
    getContatoInfo,
    parseTimes,
    TAB_LABELS,
    PRAZO_LABELS,
    ST_B,
    filterClientesFromLegacy,
    getClienteSegmentosFromLegacy,
    measureRender,
    buildSkeletonLines,
    isRuntimeBootstrapping
  } = deps;

  let clientesFilterCache = null;
  let clientesSegCache = null;

  function getFilteredClientes() {
    const q = cliDom.get('cli-busca')?.value || '';
    const seg = cliDom.get('cli-fil-seg')?.value || '';
    const status = cliDom.get('cli-fil-st')?.value || '';
    const clientes = getClientes();

    if (
      clientesFilterCache &&
      clientesFilterCache.ref === clientes &&
      clientesFilterCache.len === clientes.length &&
      clientesFilterCache.q === q &&
      clientesFilterCache.seg === seg &&
      clientesFilterCache.status === status
    ) {
      return clientesFilterCache.result;
    }

    const result = filterClientesFromLegacy(clientes, { q, seg, status });

    clientesFilterCache = { ref: clientes, len: clientes.length, q, seg, status, result };
    return result;
  }

  function getClienteSegmentos() {
    const clientes = getClientes();
    if (
      clientesSegCache &&
      clientesSegCache.ref === clientes &&
      clientesSegCache.len === clientes.length
    ) {
      return clientesSegCache.result;
    }

    const result = getClienteSegmentosFromLegacy(clientes);

    clientesSegCache = { ref: clientes, len: clientes.length, result };
    return result;
  }

  function renderEstadoVazio() {
    const texto = getClientes().length
      ? 'Nenhum cliente encontrado com os filtros atuais.'
      : 'Clique em "Novo cliente" para cadastrar o primeiro.';

    cliDom.html(
      'list',
      'cli-lista',
      `<div class="empty"><div class="ico">CL</div><p>${esc(texto)}</p></div>`,
      'clientes:lista-vazia'
    );
  }

  /**
   * @param {import('../types/domain').Cliente} cliente
   * @param {{ principal: string; secundario: string; badge: string }} contato
   * @param {string[]} times
   */
  function renderTagsCliente(cliente, contato, times) {
    return [
      getBadgeAniversario(cliente),
      contato.badge,
      cliente.optin_marketing ? '<span class="bdg bg">MKT</span>' : '',
      cliente.optin_email ? '<span class="bdg bk">E-mail</span>' : '',
      cliente.optin_sms ? '<span class="bdg bk">SMS</span>' : '',
      cliente.seg ? `<span class="bdg bk">${esc(cliente.seg)}</span>` : '',
      ...times.map((time) => `<span class="bdg bb">${esc(time)}</span>`)
    ]
      .filter(Boolean)
      .join('');
  }

  /**
   * @param {import('../types/domain').Cliente} cliente
   */
  function renderClienteMobile(cliente) {
    const cor = avc(cliente.nome);
    const contato = getContatoInfo(cliente);
    const times = parseTimes(cliente.time);
    const tabela = TAB_LABELS[cliente.tab] || '-';
    const prazo = PRAZO_LABELS[cliente.prazo] || '-';

    return `
      <div class="mobile-card">
        <div class="mobile-card-head">
          <div class="mobile-card-hero">
            <div class="av" style="background:${cor.bg};color:${cor.c}">${esc(ini(cliente.nome))}</div>
            <div class="mobile-card-grow">
              <div class="mobile-card-title">${esc(cliente.nome)}</div>
              ${cliente.apelido ? `<div class="mobile-card-sub">${esc(cliente.apelido)}</div>` : ''}
            </div>
          </div>
          <div>${ST_B[cliente.status] || ''}</div>
        </div>

        <div class="mobile-card-meta mobile-card-meta-gap">
          <div>${esc(contato.principal)}</div>
          ${contato.secundario ? `<div>${esc(contato.secundario)}</div>` : ''}
          ${cliente.email && !contato.principal.includes(cliente.email) ? `<div>${esc(cliente.email)}</div>` : ''}
          <div>${tabela} - ${esc(prazo)}</div>
        </div>

        <div class="mobile-card-tags mobile-card-tags-tight">
          ${renderTagsCliente(cliente, contato, times)}
        </div>

        <div class="mobile-card-actions">
          <button class="btn btn-sm" data-click="abrirCliDet('${cliente.id}')">Detalhes</button>
          <button class="btn btn-p btn-sm" data-click="editarCli('${cliente.id}')">Editar</button>
          <button class="btn btn-sm" data-click="removerCli('${cliente.id}')">Excluir</button>
        </div>
      </div>
    `;
  }

  /**
   * @param {import('../types/domain').Cliente} cliente
   */
  function renderClienteDesktop(cliente) {
    const cor = avc(cliente.nome);
    const contato = getContatoInfo(cliente);
    const times = parseTimes(cliente.time);

    return `
      <tr>
        <td><div class="av" style="background:${cor.bg};color:${cor.c}">${esc(ini(cliente.nome))}</div></td>
        <td>
          <div class="table-cell-strong">${esc(cliente.nome)}</div>
          ${cliente.apelido ? `<div class="table-cell-caption table-cell-muted">${esc(cliente.apelido)}</div>` : ''}
        </td>
        <td>
          <div>${esc(contato.principal)}</div>
          ${contato.secundario ? `<div class="table-cell-caption table-cell-muted">${esc(contato.secundario)}</div>` : ''}
          ${cliente.email && !contato.principal.includes(cliente.email) ? `<div class="table-cell-caption table-cell-muted">${esc(cliente.email)}</div>` : ''}
        </td>
        <td>
          <div class="fg2 gap-4">
            ${getBadgeAniversario(cliente) || '<span class="table-cell-muted">-</span>'}
            ${contato.badge}
            ${cliente.optin_marketing ? '<span class="bdg bg">MKT</span>' : ''}
            ${cliente.optin_email ? '<span class="bdg bk">E-mail</span>' : ''}
            ${cliente.optin_sms ? '<span class="bdg bk">SMS</span>' : ''}
          </div>
        </td>
        <td>
          <div class="fg2 gap-4">
            ${cliente.seg ? `<span class="bdg bk">${esc(cliente.seg)}</span>` : ''}
            ${times.map((time) => `<span class="bdg bb">${esc(time)}</span>`).join('')}
            ${!cliente.seg && !times.length ? '-' : ''}
          </div>
        </td>
        <td>${TAB_LABELS[cliente.tab] || '-'}</td>
        <td class="table-cell-muted">${esc(PRAZO_LABELS[cliente.prazo] || '-')}</td>
        <td>${ST_B[cliente.status] || ''}</td>
        <td>
          <div class="fg2 table-row-actions">
            <button class="btn btn-sm" data-click="abrirCliDet('${cliente.id}')">Detalhes</button>
            <button class="btn btn-p btn-sm" data-click="editarCli('${cliente.id}')">Editar</button>
            <button class="btn btn-sm" data-click="removerCli('${cliente.id}')">Excluir</button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderCliMet() {
    return measureRender(
      'clientes',
      () => {
        const clientes = getClientes();
        if (isRuntimeBootstrapping() && !clientes.length) {
          cliDom.html(
            'metrics',
            'cli-met',
            `
          <div class="sk-grid sk-grid-4">
            <div class="sk-card">${buildSkeletonLines(2)}</div>
            <div class="sk-card">${buildSkeletonLines(2)}</div>
            <div class="sk-card">${buildSkeletonLines(2)}</div>
            <div class="sk-card">${buildSkeletonLines(2)}</div>
          </div>
        `,
            'clientes:skeleton-metrics'
          );
          return;
        }
        const ativos = clientes.filter((cliente) => cliente.status === 'ativo').length;
        const prospectos = clientes.filter((cliente) => cliente.status === 'prospecto').length;
        const segmentos = [...new Set(clientes.map((cliente) => cliente.seg).filter(Boolean))]
          .length;
        const currentSeg = cliDom.get('cli-fil-seg')?.value || '';

        cliDom.html(
          'metrics',
          'cli-met',
          `
        <div class="met"><div class="ml">Total</div><div class="mv">${clientes.length}</div></div>
        <div class="met"><div class="ml">Ativos</div><div class="mv">${ativos}</div></div>
        <div class="met"><div class="ml">Prospectos</div><div class="mv">${prospectos}</div></div>
        <div class="met"><div class="ml">Segmentos</div><div class="mv">${segmentos}</div></div>
      `,
          'clientes:metrics'
        );

        cliDom.select(
          'filters',
          'cli-fil-seg',
          '<option value="">Todos os segmentos</option>' +
            [...new Set(clientes.map((cliente) => cliente.seg).filter(Boolean))]
              .sort((a, b) => a.localeCompare(b))
              .map((seg) => `<option value="${esc(seg)}">${esc(seg)}</option>`)
              .join(''),
          currentSeg,
          'clientes:segmentos'
        );
      },
      'metrics'
    );
  }

  function renderClientes() {
    return measureRender(
      'clientes',
      () => {
        const filtrados = getFilteredClientes();
        if (isRuntimeBootstrapping() && !getClientes().length) {
          cliDom.html(
            'list',
            'cli-lista',
            `<div class="sk-card">${buildSkeletonLines(5)}</div>`,
            'clientes:skeleton-list'
          );
          return;
        }
        if (!filtrados.length) {
          renderEstadoVazio();
          return;
        }

        if (window.matchMedia('(max-width: 1280px)').matches) {
          cliDom.html(
            'list',
            'cli-lista',
            filtrados.map(renderClienteMobile).join(''),
            'clientes:lista-mobile'
          );
          return;
        }

        cliDom.html(
          'list',
          'cli-lista',
          `
        <div class="tw">
          <table class="tbl">
            <thead>
              <tr>
                <th></th>
                <th>Nome</th>
                <th>Contato</th>
                <th>Marketing</th>
                <th>Segmento</th>
                <th>Tabela</th>
                <th>Prazo</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${filtrados.map(renderClienteDesktop).join('')}</tbody>
          </table>
        </div>
      `,
          'clientes:lista-desktop'
        );
      },
      'list'
    );
  }

  function renderCliSegs() {
    return measureRender(
      'clientes',
      () => {
        const el = cliDom.get('cli-segs-lista');
        if (!el) return;

        const segmentos = getClienteSegmentos();

        cliDom.html(
          'segments',
          'cli-segs-lista',
          segmentos
            .map((seg) => {
              const clientes = getClientes().filter(
                (cliente) => (cliente.seg || 'Sem segmento') === seg
              );

              return `
          <div class="card">
            <div class="fb form-gap-bottom-xs">
              <div class="table-cell-strong">${esc(seg)}</div>
              <span class="bdg bb">${clientes.length}</span>
            </div>
            <div class="fg2">
              ${clientes
                .map((cliente) => {
                  const cor = avc(cliente.nome);
                  return `
                  <button
                    class="btn btn-inline-card"
                    type="button"
                    data-click="abrirCliDet('${cliente.id}')"
                  >
                    <div class="av av-sm" style="background:${cor.bg};color:${cor.c}">
                      ${esc(ini(cliente.nome))}
                    </div>
                    <span class="btn-inline-card__label">${esc(cliente.apelido || cliente.nome)}</span>
                  </button>
                `;
                })
                .join('')}
            </div>
          </div>
        `;
            })
            .join(''),
          'clientes:segmentos-lista'
        );
      },
      'segments'
    );
  }

  function refreshCliDL() {
    cliDom.html(
      'selectors',
      'cli-dl',
      getClientes()
        .map((cliente) => `<option value="${esc(cliente.nome)}">`)
        .join(''),
      'clientes:datalist'
    );
  }

  return {
    renderCliMet,
    renderClientes,
    renderCliSegs,
    refreshCliDL
  };
}
