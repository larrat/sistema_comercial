import { useEffect, useState, type FormEvent } from 'react';

import type { Cliente } from '../../../../types/domain';
import { useClienteMutations } from '../hooks/useClienteMutations';
import { ClienteContextSummary } from './ClienteContextSummary';

type ClienteFormValues = {
  nome: string;
  email: string;
  tel: string;
  whatsapp: string;
  seg: string;
  status: string;
};

type Props = {
  initialCliente?: Cliente | null;
  onSaved?: (cliente: Cliente) => void;
  onCancel?: () => void;
};

function toFormValues(cliente?: Cliente | null): ClienteFormValues {
  return {
    nome: cliente?.nome ?? '',
    email: cliente?.email ?? '',
    tel: cliente?.tel ?? '',
    whatsapp: cliente?.whatsapp ?? '',
    seg: cliente?.seg ?? '',
    status: cliente?.status ?? 'ativo'
  };
}

export function ClienteForm({ initialCliente = null, onSaved, onCancel }: Props) {
  const [values, setValues] = useState<ClienteFormValues>(() => toFormValues(initialCliente));
  const [localError, setLocalError] = useState<string | null>(null);
  const { submitCliente, saving, error } = useClienteMutations();

  useEffect(() => {
    setValues(toFormValues(initialCliente));
    setLocalError(null);
  }, [initialCliente]);

  function update<K extends keyof ClienteFormValues>(key: K, value: ClienteFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!values.nome.trim()) {
      setLocalError('Nome do cliente é obrigatório.');
      return;
    }

    setLocalError(null);

    const saved = await submitCliente({
      id: initialCliente?.id,
      nome: values.nome,
      email: values.email,
      tel: values.tel,
      whatsapp: values.whatsapp,
      seg: values.seg,
      status: values.status
    });

    onSaved?.(saved);

    if (!initialCliente) {
      setValues(toFormValues(null));
    }
  }

  return (
    <form className="card-shell form-grid" onSubmit={handleSubmit} data-testid="cliente-form">
      <div className="fb form-gap-bottom-xs">
        <div>
          <h3 className="table-cell-strong">
            {initialCliente ? 'Editar cliente' : 'Novo cliente'}
          </h3>
          <p className="table-cell-caption table-cell-muted">
            Primeira UI real do piloto React conectada ao adapter.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={onCancel}
            data-testid="cancelar-btn"
          >
            Cancelar
          </button>
        )}
      </div>

      {initialCliente && <ClienteContextSummary cliente={initialCliente} />}

      <label className="form-field">
        <span>Nome</span>
        <input
          className="inp"
          value={values.nome}
          onChange={(e) => update('nome', e.target.value)}
          data-testid="form-nome"
        />
      </label>

      <div className="grid grid-2">
        <label className="form-field">
          <span>E-mail</span>
          <input
            className="inp"
            type="email"
            value={values.email}
            onChange={(e) => update('email', e.target.value)}
            data-testid="form-email"
          />
        </label>

        <label className="form-field">
          <span>Segmento</span>
          <input
            className="inp"
            value={values.seg}
            onChange={(e) => update('seg', e.target.value)}
            data-testid="form-seg"
          />
        </label>
      </div>

      <div className="grid grid-2">
        <label className="form-field">
          <span>Telefone</span>
          <input
            className="inp"
            value={values.tel}
            onChange={(e) => update('tel', e.target.value)}
            data-testid="form-tel"
          />
        </label>

        <label className="form-field">
          <span>WhatsApp</span>
          <input
            className="inp"
            value={values.whatsapp}
            onChange={(e) => update('whatsapp', e.target.value)}
            data-testid="form-whatsapp"
          />
        </label>
      </div>

      <label className="form-field">
        <span>Status</span>
        <select
          className="inp"
          value={values.status}
          onChange={(e) => update('status', e.target.value)}
          data-testid="form-status"
        >
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="prospecto">Prospecto</option>
        </select>
      </label>

      {(localError || error) && (
        <div className="empty" data-testid="form-error">
          <p>{localError || error}</p>
        </div>
      )}

      <div className="mobile-card-actions">
        <button
          type="submit"
          className="btn btn-p btn-sm"
          disabled={saving}
          data-testid="salvar-btn"
        >
          {saving ? 'Salvando...' : initialCliente ? 'Salvar alterações' : 'Salvar cliente'}
        </button>
      </div>
    </form>
  );
}
