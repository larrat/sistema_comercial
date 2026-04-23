import { useRef, useState } from 'react';
import { useCotacaoImport } from '../hooks/useCotacaoImport';
import { useCotacaoStore } from '../store/useCotacaoStore';
import { CotacaoLogs } from './CotacaoLogs';
import type { Fornecedor } from '../types';

type Props = {
  fornecedores: Fornecedor[];
  logs: import('../types').CotacaoLog[];
  onNovoFornecedor: () => void;
};

export function CotacaoImport({ fornecedores, logs, onNovoFornecedor }: Props) {
  const [fornId, setFornId] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { handleFile } = useCotacaoImport();
  const importResumo = useCotacaoStore((s) => s.importResumo);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
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

        <label
          className="upz"
          style={{ cursor: fornId ? 'pointer' : 'not-allowed', opacity: fornId ? 1 : 0.5 }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            disabled={!fornId}
            onChange={(e) => void onFileChange(e)}
            style={{ display: 'none' }}
          />
          <div className="upload-drop-icon">ARQ</div>
          <strong className="upload-drop-title">Clique ou arraste o arquivo</strong>
          <p className="upload-drop-copy">.xlsx .xls .csv — qualquer layout</p>
        </label>

        {importResumo && (
          <div className="card-shell rf-ui-import-resumo" style={{ marginTop: 12 }}>
            <div className="table-cell-strong" style={{ marginBottom: 4 }}>
              Última importação
            </div>
            <div className="rf-ui-inline-stats">
              <span>{importResumo.novos} novos</span>
              <span>{importResumo.atualizados} atualizados</span>
              {importResumo.ignorados > 0 && <span>{importResumo.ignorados} ignorados</span>}
              {importResumo.falhas > 0 && (
                <span style={{ color: 'var(--red)' }}>{importResumo.falhas} falhas</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card-shell">
        <div className="ct">Histórico de importações</div>
        <CotacaoLogs logs={logs} />
      </div>
    </div>
  );
}
