import { useState } from 'react';
import { useProdutoStore } from '../../produtos/store/useProdutoStore';
import { useCotacaoStore } from '../store/useCotacaoStore';
import { useFornecedorMutations, usePrecoCotacaoMutation, useCotacaoConfigMutation } from '../hooks/useCotacaoMutations';
import { CotacaoMetrics } from './CotacaoMetrics';
import { CotacaoImport } from './CotacaoImport';
import { FornecedorList } from './FornecedorList';
import { FornecedorForm } from './FornecedorForm';
import { CotacaoTable } from './CotacaoTable';
import { ImportMapModal } from './ImportMapModal';
import { EmptyState } from '../../../shared/ui';

type Tab = 'importar' | 'fornecedores' | 'cotacao';

function exportCotacaoCsv(
  produtos: import('../../../../types/domain').Produto[],
  fornecedores: import('../types').Fornecedor[],
  precos: import('../types').PrecosMap
) {
  const rows = [
    ['Produto', 'Un', ...fornecedores.map((f) => f.nome), 'Melhor preço', 'Melhor fornecedor'],
    ...produtos.map((p) => {
      const prices = fornecedores.map((f) => precos[p.id]?.[f.id] ?? null);
      const valid = prices.filter((v): v is number => v !== null && v > 0);
      const minP = valid.length ? Math.min(...valid) : null;
      const bestFi = prices.findIndex((v) => v !== null && v === minP);
      return [
        p.nome,
        p.un,
        ...prices.map((v) => (v !== null ? v.toFixed(2) : '')),
        minP !== null ? minP.toFixed(2) : '',
        bestFi >= 0 ? (fornecedores[bestFi]?.nome ?? '') : ''
      ];
    })
  ];
  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'cotacao.csv';
  a.click();
}

export function CotacaoPage() {
  const [tab, setTab] = useState<Tab>('importar');

  const status = useCotacaoStore((s) => s.status);
  const error = useCotacaoStore((s) => s.error);
  const fornecedores = useCotacaoStore((s) => s.fornecedores);
  const precos = useCotacaoStore((s) => s.precos);
  const config = useCotacaoStore((s) => s.config);
  const openFornModal = useCotacaoStore((s) => s.openFornModal);

  const produtos = useProdutoStore((s) => s.produtos);

  const { removerFornecedor } = useFornecedorMutations();
  const { atualizarPreco } = usePrecoCotacaoMutation();
  const { toggleLock } = useCotacaoConfigMutation();

  const locked = config?.locked ?? false;
  const logs = config?.logs ?? [];

  if (status === 'loading') {
    return (
      <main className="rf-content rf-ui-stack">
        <EmptyState title="Carregando cotações..." compact />
      </main>
    );
  }

  if (status === 'error' && error) {
    return (
      <main className="rf-content rf-ui-stack">
        <div className="alert alert-error">{error}</div>
      </main>
    );
  }

  return (
    <main className="rf-content rf-ui-stack">
      {tab === 'cotacao' && (
        <CotacaoMetrics produtos={produtos} fornecedores={fornecedores} precos={precos} />
      )}

      <div className="rf-ui-inline-tabs">
        {(['importar', 'fornecedores', 'cotacao'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`tb ${tab === t ? 'on' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'importar' ? 'Importar' : t === 'fornecedores' ? 'Fornecedores' : 'Cotação'}
          </button>
        ))}
      </div>

      {tab === 'importar' && (
        <CotacaoImport
          fornecedores={fornecedores}
          logs={logs}
          onNovoFornecedor={() => openFornModal()}
        />
      )}

      {tab === 'fornecedores' && (
        <FornecedorList
          fornecedores={fornecedores}
          produtos={produtos}
          precos={precos}
          onNovo={() => openFornModal()}
          onRemover={(id) => void removerFornecedor(id)}
        />
      )}

      {tab === 'cotacao' && (
        <CotacaoTable
          produtos={produtos}
          fornecedores={fornecedores}
          precos={precos}
          locked={locked}
          onPriceChange={(pid, fid, val) => void atualizarPreco(pid, fid, val)}
          onToggleLock={() => void toggleLock()}
          onExportCsv={() => exportCotacaoCsv(produtos, fornecedores, precos)}
        />
      )}

      <FornecedorForm />
      <ImportMapModal />
    </main>
  );
}
