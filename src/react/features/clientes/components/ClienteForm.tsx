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

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function formatCpfCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function formatPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

function normalizeUf(value: string): string {
  return value
    .replace(/[^a-z]/gi, '')
    .slice(0, 2)
    .toUpperCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function ClienteForm({ initialCliente = null, onSaved, onCancel }: Props) {
  const [values, setValues] = useState<ClienteFormValues>(() => toFormValues(initialCliente));
  const [localError, setLocalError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { submitCliente, saving, error } = useClienteMutations();
  const rcas = useRcas();

  useEffect(() => {
    setValues(toFormValues(initialCliente));
    setLocalError(null);
    setShowAdvanced(
      Boolean(
        initialCliente?.cidade ||
        initialCliente?.estado ||
        initialCliente?.data_aniversario ||
        initialCliente?.time ||
        initialCliente?.obs ||
        initialCliente?.optin_marketing ||
        initialCliente?.optin_email ||
        initialCliente?.optin_sms
      )
    );
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
      setLocalError('Nome do cliente e obrigatorio.');
      return;
    }
    if (values.email.trim() && !isValidEmail(values.email.trim())) {
      setLocalError('Informe um e-mail valido ou deixe o campo vazio.');
      return;
    }
    if (values.optin_email && !values.email.trim()) {
      setLocalError('Para liberar opt-in de e-mail, informe o e-mail do cliente.');
      return;
    }
    if (values.optin_sms && !values.tel.trim() && !values.whatsapp.trim()) {
      setLocalError('Para liberar opt-in de SMS, informe telefone ou WhatsApp.');
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
      setShowAdvanced(false);
    }
  }

  const title = initialCliente ? 'Editar cliente' : 'Novo cliente';
  const subtitle = initialCliente
    ? 'Revise os dados essenciais e deixe os detalhes complementares agrupados no avancado.'
    : 'Comece pelo contato principal e pelos dados comerciais. O restante pode ficar para depois.';

  return (
    <form className="card-shell form-gap-lg" onSubmit={handleSubmit} data-testid="cliente-form">
      <div className="form-shell-head">
        <div className="form-shell-kicker">Cadastro</div>
        <div className="fb form-gap-bottom-xs">
          <div>
            <h3 className="table-cell-strong">{title}</h3>
            <p className="form-shell-copy">{subtitle}</p>
          </div>
        </div>
      </div>

      {initialCliente && <ClienteContextSummary cliente={initialCliente} />}

      <section className="form-section-card">
        <div className="form-section-head">
          <div>
            <div className="form-section-title">Essencial</div>
            <p className="form-section-copy">
              Identificacao e contato para o time conseguir atender e vender.
            </p>
          </div>
          <span className="bdg bb">Obrigatorio primeiro</span>
        </div>

        <div className="grid grid-2">
          <label className="form-field">
            <span>Nome / Razao social *</span>
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
              placeholder="Como a equipe identifica esse cliente no dia a dia"
              data-testid="form-apelido"
            />
          </label>
        </div>

        <div className="grid grid-3">
          <label className="form-field">
            <span>CPF / CNPJ</span>
            <input
              className="inp"
              inputMode="numeric"
              value={values.doc}
              onChange={(e) => update('doc', e.target.value)}
              onBlur={(e) => update('doc', formatCpfCnpj(e.target.value))}
              placeholder="Somente numeros ou documento completo"
              data-testid="form-doc"
            />
            <small className="field-help">
              Aceita CPF ou CNPJ; a formatacao entra ao sair do campo.
            </small>
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

        <div className="grid grid-3">
          <label className="form-field">
            <span>Telefone</span>
            <input
              className="inp"
              type="tel"
              inputMode="tel"
              value={values.tel}
              onChange={(e) => update('tel', e.target.value)}
              onBlur={(e) => update('tel', formatPhone(e.target.value))}
              placeholder="(11) 3333-4444"
              autoComplete="tel"
              data-testid="form-tel"
            />
          </label>
          <label className="form-field">
            <span>WhatsApp</span>
            <input
              className="inp"
              type="tel"
              inputMode="tel"
              value={values.whatsapp}
              onChange={(e) => update('whatsapp', e.target.value)}
              onBlur={(e) => update('whatsapp', formatPhone(e.target.value))}
              placeholder="(11) 99999-0000"
              autoComplete="tel"
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
              placeholder="exemplo@cliente.com.br"
              autoComplete="email"
              data-testid="form-email"
            />
          </label>
        </div>
      </section>

      <section className="form-section-card">
        <div className="form-section-head">
          <div>
            <div className="form-section-title">Comercial</div>
            <p className="form-section-copy">
              Organize quem atende, qual segmento e quais condicoes basicas valem para esse cliente.
            </p>
          </div>
        </div>

        <div className="grid grid-2">
          <label className="form-field">
            <span>Responsavel / Comprador</span>
            <input
              className="inp"
              value={values.resp}
              onChange={(e) => update('resp', e.target.value)}
              data-testid="form-resp"
            />
          </label>
          <label className="form-field">
            <span>Vendedor</span>
            <select
              className="inp"
              value={values.rca_id}
              onChange={(e) => handleRcaChange(e.target.value)}
              data-testid="form-rca"
            >
              <option value="">Sem vendedor</option>
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
            <span>Segmento</span>
            <input
              className="inp"
              value={values.seg}
              onChange={(e) => update('seg', e.target.value)}
              placeholder="Ex: Atacado, Farmacia, Revenda"
              data-testid="form-seg"
            />
          </label>
          <label className="form-field">
            <span>Tabela de preco</span>
            <select
              className="inp"
              value={values.tab}
              onChange={(e) => update('tab', e.target.value)}
              data-testid="form-tab"
            >
              <option value="padrao">Padrao</option>
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
              <option value="a_vista">A vista</option>
              <option value="7d">7 dias</option>
              <option value="15d">15 dias</option>
              <option value="30d">30 dias</option>
              <option value="60d">60 dias</option>
            </select>
          </label>
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
        </div>
      </section>

      <details
        className="form-advanced-block"
        open={showAdvanced}
        onToggle={(event) => setShowAdvanced(event.currentTarget.open)}
      >
        <summary className="form-advanced-summary">
          <span>Detalhes avancados</span>
          <span className="table-cell-caption table-cell-muted">
            Localizacao, marketing e observacoes
          </span>
        </summary>

        <div className="form-advanced-body">
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
                onBlur={(e) => update('estado', normalizeUf(e.target.value))}
                maxLength={2}
                placeholder="UF"
                data-testid="form-estado"
              />
            </label>
          </div>

          <div className="grid grid-2">
            <label className="form-field">
              <span>Data de aniversario</span>
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
                  />
                  Marketing
                </label>
                <label className="optin-choice">
                  <input
                    type="checkbox"
                    checked={values.optin_email}
                    onChange={(e) => update('optin_email', e.target.checked)}
                    data-testid="form-optin-email"
                  />
                  E-mail
                </label>
                <label className="optin-choice">
                  <input
                    type="checkbox"
                    checked={values.optin_sms}
                    onChange={(e) => update('optin_sms', e.target.checked)}
                    data-testid="form-optin-sms"
                  />
                  SMS
                </label>
              </div>
            </div>
          </div>

          <label className="form-field">
            <span>Observacoes</span>
            <textarea
              className="inp"
              rows={3}
              value={values.obs}
              onChange={(e) => update('obs', e.target.value)}
              data-testid="form-obs"
            />
          </label>
        </div>
      </details>

      {(localError || error) && (
        <div className="empty" data-testid="form-error">
          <p>{localError || error}</p>
        </div>
      )}

      <div className="form-sticky-actions">
        <div className="modal-actions">
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
          <button
            type="submit"
            className="btn btn-p btn-sm"
            disabled={saving}
            data-testid="salvar-btn"
          >
            {saving ? 'Salvando...' : initialCliente ? 'Salvar alteracoes' : 'Salvar cliente'}
          </button>
        </div>
      </div>
    </form>
  );
}
