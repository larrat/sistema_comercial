import { EmptyState, ErrorState, LoadingState, Modal } from '../../../shared/ui';
import type { ClienteLight } from '../services/clientesLightApi';

type PdvClienteModalProps = {
  open: boolean;
  query: string;
  results: ClienteLight[];
  loading: boolean;
  error: string | null;
  onQueryChange: (value: string) => void;
  onSelect: (cliente: ClienteLight) => void;
  onClose: () => void;
};

export function PdvClienteModal({
  open,
  query,
  results,
  loading,
  error,
  onQueryChange,
  onSelect,
  onClose
}: PdvClienteModalProps) {
  return (
    <Modal
      open={open}
      title="Adicionar cliente"
      onClose={onClose}
      footer={
        <button className="btn btn-sm" type="button" onClick={onClose}>
          Fechar
        </button>
      }
    >
      <div className="rf-pdv-modal-search">
        <input
          className="inp"
          type="search"
          placeholder="Buscar por nome ou WhatsApp..."
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          autoFocus
        />
      </div>

      {loading ? <LoadingState title="Buscando clientes..." compact /> : null}
      {!loading && error ? <ErrorState title={error} compact /> : null}

      {!loading && !error && !query.trim() ? (
        <EmptyState
          title="Comece digitando para localizar um cliente."
          description="A busca procura por nome, telefone e WhatsApp."
          compact
        />
      ) : null}

      {!loading && !error && query.trim() && results.length === 0 ? (
        <EmptyState
          title="Nenhum cliente encontrado."
          description="Você pode seguir sem cliente ou tentar outro termo."
          compact
        />
      ) : null}

      {!loading && !error && results.length > 0 ? (
        <div className="rf-pdv-client-results">
          {results.map((cliente) => (
            <button
              key={cliente.id}
              className="rf-pdv-client-result"
              type="button"
              onClick={() => onSelect(cliente)}
            >
              <div className="rf-pdv-client-result__copy">
                <strong>{cliente.nome}</strong>
                <span>{cliente.whatsapp || cliente.tel || 'Sem telefone'}</span>
              </div>
              <span className="rf-pdv-client-result__cta">Selecionar</span>
            </button>
          ))}
        </div>
      ) : null}
    </Modal>
  );
}
