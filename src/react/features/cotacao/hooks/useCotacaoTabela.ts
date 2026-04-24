import { useMemo } from 'react';
import { emitToast } from '../../../app/legacy/events';
import { useCotacaoConfigMutation, usePrecoCotacaoMutation } from './useCotacaoMutations';
import { useCotacaoStore } from '../store/useCotacaoStore';

function exportCsvFile(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`)
        .join(';')
    )
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function useCotacaoTabela() {
  const produtos = useCotacaoStore((s) => s.produtos);
  const fornecedores = useCotacaoStore((s) => s.fornecedores);
  const precos = useCotacaoStore((s) => s.precos);
  const config = useCotacaoStore((s) => s.config);
  const { atualizarPreco, savingCells, errorCells } = usePrecoCotacaoMutation();
  const { toggleLock, saving } = useCotacaoConfigMutation();

  const locked = !!config?.locked;

  const exportRows = useMemo(() => {
    const header = ['Produto', 'Unidade', ...fornecedores.map((f) => f.nome)];
    const body = produtos.map((produto) => [
      produto.nome,
      produto.unidade || produto.un || '',
      ...fornecedores.map((fornecedor) => {
        const value = precos[produto.id]?.[fornecedor.id];
        return value != null && value > 0 ? value.toFixed(2).replace('.', ',') : '';
      })
    ]);
    return [header, ...body];
  }, [fornecedores, precos, produtos]);

  function exportCsv() {
    if (!produtos.length || !fornecedores.length) {
      emitToast('Nao ha dados suficientes para exportar a cotacao.', 'warning');
      return;
    }
    exportCsvFile('cotacao.csv', exportRows);
  }

  return {
    produtos,
    fornecedores,
    precos,
    locked,
    atualizarPreco,
    toggleLock,
    lockSaving: saving,
    exportCsv,
    savingCells,
    errorCells
  };
}
