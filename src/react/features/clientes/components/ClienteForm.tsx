import { useEffect, useState, type FormEvent } from 'react';

import type { Cliente } from '../../../../types/domain';
import { useClienteMutations } from '../hooks/useClienteMutations';
import { useRcas } from '../hooks/useRcas';
import { ClienteContextSummary } from './ClienteContextSummary';

type ClienteFormValues = {
  nome: string;
  apelido: string;
  doc: string;
  tipo: string;
  status: string;
  tel: string;
  whatsapp: string;
  email: string;
  resp: string;
  rca_id: string;
  rca_nome: string;
  time: string;
  seg: string;
  tab: string;
  prazo: string;
  cidade: string;
  estado: string;
  data_aniversario: string;
  optin_marketing: boolean;
  optin_email: boolean;
  optin_sms: boolean;
  obs: string;
};

type Props = {
  initialCliente?: Cliente | null;
  onSaved?: (cliente: Cliente) => void;
  onCancel?: () => void;
};

function toFormValues(cliente?: Cliente | null): ClienteFormValues {
  return {
    nome: cliente?.nome ?? '',
    apelido: cliente?.apelido ?? '',
    doc: cliente?.doc ?? '',
    tipo: cliente?.tipo ?? 'PJ',
    status: cliente?.status ?? 'ativo',
    tel: cliente?.tel ?? '',
    whatsapp: cliente?.whatsapp ?? '',
    email: cliente?.email ?? '',
    resp: cliente?.resp ?? '',
    rca_id: cliente?.rca_id ?? '',
    rca_nome: cliente?.rca_nome ?? '',
    time: typeof cliente?.time === 'string' ? cliente.time : (cliente?.time ?? []).join(', '),
    seg: cliente?.seg ?? '',
    tab: cliente?.tab ?? 'padrao',
    prazo: cliente?.prazo ?? 'a_vista',
    cidade: cliente?.cidade ?? '',
    estado: cliente?.estado ?? '',
    data_aniversario: cliente?.data_aniversario ?? '',
    optin_marketing: !!cliente?.optin_marketing,
    optin_email: !!cliente?.optin_email,
    optin_sms: !!cliente?.optin_sms,
    obs: cliente?.obs ?? ''
  };
}

export function ClienteForm({ initialCliente = null, onSaved, onCancel }: Props) {
  const [values, setValues] = useState<ClienteFormValues>(() => toFormValues(initialCliente));
  const [localError, setLocalError] = useState<string | null>(null);
  const { submitCliente, saving, error } = useClienteMutations();
  const rcas = useRcas();

  useEffect(() => {
    setValues(toFormValues(initialCliente));
    setLocalError(null);
  }, [initialCliente]);

  function update<K extends keyof ClienteFormValues>(key: K, value: ClienteFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleRcaChange(rcaId: string) {
    const rca = rcas.find((r) => r.id === rcaId);
    setValues((current) => ({
      ...current,
      rca_id: rcaId,
      rca_nome: rca?.nome ?? ''
    }));
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
      apelido: values.apelido,
      doc: values.doc,
      tipo: values.tipo,
      status: values.status,
      tel: values.tel,
      whatsapp: values.whatsapp,
      email: values.email,
      resp: values.resp,
      rca_id: values.rca_id || null,
      rca_nome: values.rca_nome || null,
      time: values.time,
      seg: values.seg,
      tab: values.tab,
      prazo: values.prazo,
      cidade: values.cidade,
      estado: values.estado,
      data_aniversario: values.data_aniversario,
      optin_marketing: values.optin_marketing,
      optin_email: values.optin_email,
      optin_sms: values.optin_sms,
      obs: values.obs
    });

    onSaved?.(saved);

    if (!initialCliente) {
      setValues(toFormValues(null));
    }
  }

  return (
    <form className="card-shell form-gap-lg" onSubmit={handleSubmit} data-testid="cliente-form">
      <div className="fb form-gap-bottom-xs">
        <div>
          <h3 className="table-cell-strong">
            {initialCliente ? 'Editar cliente' : 'Novo cliente'}
          </h3>
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

      {/* Identificação */}
      <div className="grid grid-2">
        <label className="form-field">
          <span>Nome / Razão social *</span>
          <input
            className="inp"
            value={values.nome}
            onChange={(e) => update('nome', e.target.value)}
            data-testid="form-nome"
          />
        </label>
        <label className="form-field">
          <span>Apelido / Fantasia</span>
          <input
            className="inp"
            value={values.apelido}
            onChange={(e) => update('apelido', e.target.value)}
            data-testid="form-apelido"
          />
        </label>
      </div>

      <div className="grid grid-3">
        <label className="form-field">
          <span>CPF / CNPJ</span>
          <input
            className="inp"
            value={values.doc}
            onChange={(e) => update('doc', e.target.value)}
            data-testid="form-doc"
          />
        </label>
        <label className="form-field">
          <span>Tipo</span>
          <select
            className="inp"
            value={values.tipo}
            onChange={(e) => update('tipo', e.target.value)}
            data-testid="form-tipo"
          >
            <option value="PJ">PJ</option>
            <option value="PF">PF</option>
          </select>
        </label>
        <label className="form-field">
          <span>Status</span>
          <select
            className="inp"
            value={values.status}
            onChange={(e) => update('status', e.target.value)}
            data-testid="form-status"
          >
            <option value="ativo">Ativo</option>
            <option value="prospecto">Prospecto</option>
            <option value="inativo">Inativo</option>
          </select>
        </label>
      </div>

      {/* Contato */}
      <div className="grid grid-3">
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
      </div>

      {/* Comercial */}
      <div className="grid grid-2">
        <label className="form-field">
          <span>Responsável / Comprador</span>
          <input
            className="inp"
            value={values.resp}
            onChange={(e) => update('resp', e.target.value)}
            data-testid="form-resp"
          />
        </label>
        <label className="form-field">
          <span>RCA / Vendedor</span>
          <select
            className="inp"
            value={values.rca_id}
            onChange={(e) => handleRcaChange(e.target.value)}
            data-testid="form-rca"
          >
            <option value="">Sem RCA</option>
            {rcas.map((rca) => (
              <option key={rca.id} value={rca.id}>
                {rca.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-4">
        <label className="form-field">
          <span>Time(s)</span>
          <input
            className="inp"
            value={values.time}
            placeholder="Ex: Flamengo, Paysandu"
            onChange={(e) => update('time', e.target.value)}
            data-testid="form-time"
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
        <label className="form-field">
          <span>Tabela de preço</span>
          <select
            className="inp"
            value={values.tab}
            onChange={(e) => update('tab', e.target.value)}
            data-testid="form-tab"
          >
            <option value="padrao">Padrão</option>
            <option value="especial">Especial</option>
            <option value="vip">VIP</option>
          </select>
        </label>
        <label className="form-field">
          <span>Prazo de pagamento</span>
          <select
            className="inp"
            value={values.prazo}
            onChange={(e) => update('prazo', e.target.value)}
            data-testid="form-prazo"
          >
            <option value="a_vista">À vista</option>
            <option value="7d">7 dias</option>
            <option value="15d">15 dias</option>
            <option value="30d">30 dias</option>
            <option value="60d">60 dias</option>
          </select>
        </label>
      </div>

      {/* Localização */}
      <div className="grid grid-2">
        <label className="form-field">
          <span>Cidade</span>
          <input
            className="inp"
            value={values.cidade}
            onChange={(e) => update('cidade', e.target.value)}
            data-testid="form-cidade"
          />
        </label>
        <label className="form-field">
          <span>Estado</span>
          <input
            className="inp"
            value={values.estado}
            onChange={(e) => update('estado', e.target.value)}
            data-testid="form-estado"
          />
        </label>
      </div>

      {/* Extras */}
      <div className="grid grid-2">
        <label className="form-field">
          <span>Data de aniversário</span>
          <input
            className="inp"
            type="date"
            value={values.data_aniversario}
            onChange={(e) => update('data_aniversario', e.target.value)}
            data-testid="form-aniv"
          />
        </label>
        <div className="form-field">
          <span>Opt-ins de marketing</span>
          <div className="fg2">
            <label className="optin-choice">
              <input
                type="checkbox"
                checked={values.optin_marketing}
                onChange={(e) => update('optin_marketing', e.target.checked)}
                data-testid="form-optin-marketing"
              />{' '}
              Marketing
            </label>
            <label className="optin-choice">
              <input
                type="checkbox"
                checked={values.optin_email}
                onChange={(e) => update('optin_email', e.target.checked)}
                data-testid="form-optin-email"
              />{' '}
              E-mail
            </label>
            <label className="optin-choice">
              <input
                type="checkbox"
                checked={values.optin_sms}
                onChange={(e) => update('optin_sms', e.target.checked)}
                data-testid="form-optin-sms"
              />{' '}
              SMS
            </label>
          </div>
        </div>
      </div>

      <label className="form-field">
        <span>Observações</span>
        <textarea
          className="inp"
          rows={3}
          value={values.obs}
          onChange={(e) => update('obs', e.target.value)}
          data-testid="form-obs"
        />
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
