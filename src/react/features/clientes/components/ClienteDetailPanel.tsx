import { useState } from 'react';

import type { Cliente } from '../../../../types/domain';
import { useClienteNotes } from '../hooks/useClienteNotes';
import { ClienteContextSummary } from './ClienteContextSummary';
import { ClienteFidelidadePanel } from './ClienteFidelidadePanel';

export type DetailTab = 'resumo' | 'notas' | 'fidelidade';

type Props = {
  cliente: Cliente;
  onEditar?: (id: string) => void;
  onClose?: () => void;
  activeTab?: DetailTab;
  onTabChange?: (tab: DetailTab) => void;
};

export function ClienteDetailPanel({ cliente, onEditar, onClose, activeTab, onTabChange }: Props) {
  const [internalTab, setInternalTab] = useState<DetailTab>('resumo');
  const [notaDraft, setNotaDraft] = useState('');
  const { notas, loading, saving, error, submitNota } = useClienteNotes({ clienteId: cliente.id });
  const tab = activeTab ?? internalTab;

  function setTab(nextTab: DetailTab) {
    if (onTabChange) {
      onTabChange(nextTab);
      return;
    }
    setInternalTab(nextTab);
  }

  async function handleSubmitNota() {
    await submitNota(notaDraft);
    setNotaDraft('');
  }

  return (
    <div className="card-shell form-gap-lg" data-testid="cliente-detail-panel">
      <div className="fb form-gap-bottom-xs">
        <div>
          <div className="table-cell-caption table-cell-muted">Detalhe do cliente</div>
          <h3 className="table-cell-strong">{cliente.nome}</h3>
          <div className="table-cell-caption table-cell-muted">
            {cliente.seg || 'Sem segmento'} • {cliente.cidade || 'Cidade não informada'}
          </div>
        </div>
        <div className="mobile-card-actions">
          {onEditar && (
            <button
              className="btn btn-p btn-sm"
              onClick={() => onEditar(cliente.id)}
              data-testid="detalhe-editar"
            >
              Editar
            </button>
          )}
          {onClose && (
            <button className="btn btn-sm" onClick={onClose} data-testid="detalhe-fechar">
              Fechar
            </button>
          )}
        </div>
      </div>

      <div className="tabs" data-testid="cliente-detail-tabs">
        <button className={`tb ${tab === 'resumo' ? 'on' : ''}`} onClick={() => setTab('resumo')}>
          Resumo
        </button>
        <button className={`tb ${tab === 'notas' ? 'on' : ''}`} onClick={() => setTab('notas')}>
          Notas / histórico
        </button>
        <button
          className={`tb ${tab === 'fidelidade' ? 'on' : ''}`}
          onClick={() => setTab('fidelidade')}
        >
          Fidelidade
        </button>
      </div>

      {tab === 'resumo' && <ClienteContextSummary cliente={cliente} />}

      {tab === 'notas' && (
        <div className="form-gap-lg" data-testid="cliente-detail-notas">
          <div className="cli-detail-label form-gap-bottom-xs">Notas / histórico</div>
          <div className="fg2 cli-detail-notes-input form-gap-bottom-xs">
            <input
              className="inp input-flex"
              placeholder="Adicionar nota..."
              value={notaDraft}
              onChange={(e) => setNotaDraft(e.target.value)}
              data-testid="nota-input"
            />
            <button
              className="btn btn-sm"
              onClick={handleSubmitNota}
              disabled={saving}
              data-testid="nota-add"
            >
              {saving ? 'Salvando...' : '+'}
            </button>
          </div>

          {error && (
            <div className="empty" data-testid="nota-error">
              <p>{error}</p>
            </div>
          )}

          {loading ? (
            <div className="sk-card" data-testid="nota-loading">
              <div className="sk-line" />
              <div className="sk-line" />
            </div>
          ) : notas.length ? (
            <div className="cli-detail-notes" data-testid="nota-list">
              {notas.map((nota, index) => (
                <div key={`${nota.data}-${index}`} className="nota">
                  <p>{nota.texto}</p>
                  <div className="nota-d">{nota.data}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-inline table-cell-muted" data-testid="nota-empty">
              Nenhuma nota.
            </div>
          )}
        </div>
      )}

      {tab === 'fidelidade' && <ClienteFidelidadePanel cliente={cliente} />}
    </div>
  );
}
