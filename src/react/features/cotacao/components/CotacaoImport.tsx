import { useState } from 'react';
import { useCotacaoImport } from '../hooks/useCotacaoImport';
import { CotacaoLogs } from './CotacaoLogs';
import { ImportacaoDropzone } from './ImportacaoDropzone';
import { ImportacaoResumo } from './ImportacaoResumo';
import { Select, Button } from '../../../shared/ui';
import type { Fornecedor } from '../types';

type Props = {
  fornecedores: Fornecedor[];
  logs: import('../types').CotacaoLog[];
  onNovoFornecedor: () => void;
};

export function CotacaoImport({ fornecedores, logs, onNovoFornecedor }: Props) {
  const [fornId, setFornId] = useState('');
  const { handleFile } = useCotacaoImport();

  async function onFileChange(file: File) {
    await handleFile(file, fornId);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
          <div className="w-1 h-4 bg-emerald-500 rounded-full" />
          Importar planilha de fornecedor
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end mb-6">
          <Select
            label="Fornecedor"
            id="cotacao-import-forn"
            value={fornId}
            onChange={(e) => setFornId(e.target.value)}
            options={[
              { value: '', label: '— selecione —' },
              ...fornecedores.map((f) => ({ value: f.id, label: f.nome }))
            ]}
          />
          <div className="flex">
            <Button variant="secondary" size="sm" onClick={onNovoFornecedor}>
              + Novo fornecedor
            </Button>
          </div>
        </div>

        {fornecedores.length === 0 ? (
          <p className="table-cell-caption table-cell-muted">
            Nenhum fornecedor cadastrado. Cadastre um fornecedor para liberar o envio de planilhas.
          </p>
        ) : !fornId ? (
          <p className="table-cell-caption table-cell-muted">
            Selecione um fornecedor acima para liberar o envio do arquivo.
          </p>
        ) : null}

        <ImportacaoDropzone disabled={!fornId} onSelect={onFileChange} />

        <ImportacaoResumo />
      </div>

      <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-500 rounded-full" />
          Histórico de importações
        </h3>
        <CotacaoLogs logs={logs} />
      </div>
    </div>
  );
}
