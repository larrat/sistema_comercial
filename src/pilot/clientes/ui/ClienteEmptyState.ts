export type ClienteEmptyStateContext = 'no-data' | 'no-match';

/**
 * Renderiza o estado vazio da lista de clientes.
 * Função pura: sem acesso a DOM, sem estado global.
 */
export function renderClienteEmptyState(context: ClienteEmptyStateContext): string {
  const texto =
    context === 'no-match'
      ? 'Nenhum cliente encontrado com os filtros atuais.'
      : 'Clique em "Novo cliente" para cadastrar o primeiro.';

  return `<div class="empty"><div class="ico">CL</div><p>${texto}</p></div>`;
}
