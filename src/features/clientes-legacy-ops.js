// @ts-check

/**
 * @param {{
 *   removerClienteAction: typeof import('./clientes/actions.js').removerClienteAction;
 *   toast: (message: string) => void;
 *   renderCliMet: () => void;
 *   renderClientes: () => void;
 *   renderCliSegs: () => void;
 *   refreshCliDL: () => void;
 }} deps
 */
export function createClientesLegacyOps(deps) {
  const { removerClienteAction, toast, renderCliMet, renderClientes, renderCliSegs, refreshCliDL } =
    deps;

  /**
   * @param {string} id
   */
  async function removerCli(id) {
    if (!confirm('Remover cliente?')) return;

    const result = await removerClienteAction(id);
    if (!result.ok) {
      toast(`Erro: ${result.error instanceof Error ? result.error.message : 'erro desconhecido'}`);
      return;
    }

    renderCliMet();
    renderClientes();
    renderCliSegs();
    refreshCliDL();

    toast('Cliente removido.');
  }

  return {
    removerCli
  };
}
