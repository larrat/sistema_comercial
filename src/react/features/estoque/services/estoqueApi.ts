export type EstoqueApiContext = {
  url: string;
  key: string;
  token: string;
  filialId: string;
};

export async function listMovimentacoes(_context: EstoqueApiContext): Promise<unknown[]> {
  return [];
}
