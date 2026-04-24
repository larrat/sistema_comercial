import { useState } from 'react';
import { useCotacaoImport } from '../hooks/useCotacaoImport';
import { CotacaoLogs } from './CotacaoLogs';
import { ImportacaoDropzone } from './ImportacaoDropzone';
import { ImportacaoResumo } from './ImportacaoResumo';
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
    <div className="rf-ui-cot-grid">
      <div className="card-shell">
        <div className="ct">Importar planilha de fornecedor</div>
        <div className="rf-ui-form-grid form-gap-bottom">
          <label className="rf-ui-field">
            <span className="rf-ui-field__label">Fornecedor</span>
            <select
              className="inp sel"
              value={fornId}
              onChange={(e) => setFornId(e.target.value)}
            >
              <option value="">— selecione —</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>
          <div className="rf-ui-field" style={{ alignSelf: 'flex-end' }}>
            <button type="button" className="btn" onClick={onNovoFornecedor}>
              + Novo fornecedor
            </button>
          </div>
        </div>

        <ImportacaoDropzone disabled={!fornId} onSelect={onFileChange} />

        <ImportacaoResumo />
      </div>

      <div className="card-shell">
        <div className="ct">Histórico de importações</div>
        <CotacaoLogs logs={logs} />
      </div>
    </div>
  );
}
