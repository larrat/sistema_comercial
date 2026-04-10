import { useState } from 'react';

import type { Cliente } from '../../../../types/domain';
import { useClienteNotes } from '../hooks/useClienteNotes';
import { ClienteContextSummary } from './ClienteContextSummary';

type Props = {
  cliente: Cliente;
  onEditar?: (id: string) => void;
  onClose?: () => void;
};

type DetailTab = 'resumo' | 'notas';

export function ClienteDetailPanel({ cliente, onEditar, onClose }: Props) {
  const [tab, setTab] = useState<DetailTab>('resumo');
  const [notaDraft, setNotaDraft] = useState('');
  const { notas, loading, saving, error, submitNota } = useClienteNotes({ clienteId: cliente.id });

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
      </div>

      {tab === 'resumo' && <ClienteContextSummary cliente={cliente} />}

      {tab === 'notas' && (
        <div className="form-gap-lg" data-testid="cliente-detail-notas">
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
            <div className="form-gap-bottom-xs" data-testid="nota-list">
              {notas.map((nota, index) => (
                <div key={`${nota.data}-${index}`} className="empty-inline">
                  <strong>{nota.data}</strong>
                  <p>{nota.texto}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-inline" data-testid="nota-empty">
              Nenhuma nota.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
