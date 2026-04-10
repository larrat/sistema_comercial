import type { Cliente } from '../../../types/domain';
import type { ClienteFiltro } from '../filter';
import { filterClientes, getClienteSegmentos } from '../filter';
import { renderClienteEmptyState } from './ClienteEmptyState';
import { renderClienteListItemDesktop, renderClienteListItemMobile } from './ClienteListItem';

export type ClienteListMode = 'mobile' | 'desktop';

export type ClienteListResult = {
  /** HTML renderizado da lista (ou empty state) */
  html: string;
  /** Total de clientes antes do filtro */
  total: number;
  /** Quantos passaram pelo filtro */
  visible: number;
  /** Segmentos únicos da lista completa (para popular o <select>) */
  segmentos: string[];
};

/**
 * Renderiza a lista completa de clientes aplicando filtro.
 * Função pura: sem DOM, sem estado global.
 *
 * @param clientes - Lista completa do store
 * @param filtro   - Critérios de busca/filtragem
 * @param mode     - 'mobile' ou 'desktop'
 */
export function renderClienteList(
  clientes: Cliente[],
  filtro: ClienteFiltro,
  mode: ClienteListMode
): ClienteListResult {
  const segmentos = getClienteSegmentos(clientes);
  const filtrados = filterClientes(clientes, filtro);

  if (!filtrados.length) {
    const context = clientes.length ? 'no-match' : 'no-data';
    return {
      html: renderClienteEmptyState(context),
      total: clientes.length,
      visible: 0,
      segmentos
    };
  }

  const html =
    mode === 'mobile'
      ? filtrados.map(renderClienteListItemMobile).join('')
      : renderDesktopTable(filtrados);

  return { html, total: clientes.length, visible: filtrados.length, segmentos };
}

function renderDesktopTable(clientes: Cliente[]): string {
  return `
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
    <tbody>${clientes.map(renderClienteListItemDesktop).join('')}</tbody>
  </table>
</div>`.trim();
}
