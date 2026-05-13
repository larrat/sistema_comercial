import { useEffect, useState, type FormEvent } from 'react';

import type { Cliente } from '../../../../types/domain';
import {
  FormSection,
  Input,
  Button,
  Select,
  FormField,
  Badge,
  FormError,
  FormActions
} from '../../../shared/ui';
import type { AnalyticsMetadata } from '../../../shared/lib/analytics';
import { useClienteMutations } from '../hooks/useClienteMutations';
import { useRcas } from '../hooks/useRcas';

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
  analyticsOrigin?: string;
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

export function ClienteForm({
  initialCliente = null,
  onSaved,
  onCancel,
  analyticsOrigin = 'unknown'
}: Props) {
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

  function getChangedFieldNames(): string[] {
    if (!initialCliente) return [];
    const initialValues = toFormValues(initialCliente);
    return (Object.keys(values) as Array<keyof ClienteFormValues>).filter((key) => {
      const currentValue = values[key];
      const previousValue = initialValues[key];
      if (typeof currentValue === 'boolean' || typeof previousValue === 'boolean') {
        return Boolean(currentValue) !== Boolean(previousValue);
      }
      return String(currentValue ?? '').trim() !== String(previousValue ?? '').trim();
    });
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
    if (values.email.trim() && !isValidEmail(values.email.trim())) {
      setLocalError('Informe um e-mail válido ou deixe o campo vazio.');
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

    const trackingMetadata: Record<string, AnalyticsMetadata> = initialCliente
      ? {
          origin: analyticsOrigin,
          changed_fields: getChangedFieldNames(),
          mode: 'edit'
        }
      : {
          origin: analyticsOrigin,
          mode: 'create'
        };

    const saved = await submitCliente(
      {
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
      },
      {
        eventName: initialCliente ? 'cliente_editado' : 'cliente_criado',
        metadata: trackingMetadata
      }
    );

    onSaved?.(saved);

    if (!initialCliente) {
      setValues(toFormValues(null));
    }
  }

  return (
    <form className="flex flex-col gap-8" onSubmit={handleSubmit} data-testid="cliente-form">
      <FormSection
        title="Essencial"
        description="Identificação e contato para o time conseguir atender e vender."
        aside={<Badge variant="blue">Obrigatório primeiro</Badge>}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nome / Razão social"
            id="cliente-nome"
            required
            value={values.nome}
            onChange={(e) => update('nome', e.target.value)}
            data-testid="form-nome"
          />
          <Input
            label="Apelido / Fantasia"
            id="cliente-apelido"
            helperText="Como a equipe identifica esse cliente no dia a dia."
            value={values.apelido}
            onChange={(e) => update('apelido', e.target.value)}
            placeholder="Como a equipe identifica esse cliente no dia a dia"
            data-testid="form-apelido"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="CPF / CNPJ"
            id="cliente-doc"
            helperText="Aceita CPF ou CNPJ; a formatação entra ao sair do campo."
            inputMode="numeric"
            value={values.doc}
            onChange={(e) => update('doc', e.target.value)}
            onBlur={(e) => update('doc', formatCpfCnpj(e.target.value))}
            placeholder="Somente numeros ou documento completo"
            data-testid="form-doc"
          />
          <Select
            label="Tipo"
            id="cliente-tipo"
            value={values.tipo}
            onChange={(e) => update('tipo', e.target.value)}
            options={[
              { value: 'PJ', label: 'PJ' },
              { value: 'PF', label: 'PF' }
            ]}
          />
          <Select
            label="Status"
            id="cliente-status"
            value={values.status}
            onChange={(e) => update('status', e.target.value)}
            options={[
              { value: 'ativo', label: 'Ativo' },
              { value: 'prospecto', label: 'Prospecto' },
              { value: 'inativo', label: 'Inativo' }
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Telefone"
            id="cliente-tel"
            type="tel"
            inputMode="tel"
            value={values.tel}
            onChange={(e) => update('tel', e.target.value)}
            onBlur={(e) => update('tel', formatPhone(e.target.value))}
            placeholder="(11) 3333-4444"
            autoComplete="tel"
            data-testid="form-tel"
          />
          <Input
            label="WhatsApp"
            id="cliente-whatsapp"
            type="tel"
            inputMode="tel"
            value={values.whatsapp}
            onChange={(e) => update('whatsapp', e.target.value)}
            onBlur={(e) => update('whatsapp', formatPhone(e.target.value))}
            placeholder="(11) 99999-0000"
            autoComplete="tel"
            data-testid="form-whatsapp"
          />
          <Input
            label="E-mail"
            id="cliente-email"
            type="email"
            value={values.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="exemplo@cliente.com.br"
            autoComplete="email"
            data-testid="form-email"
          />
        </div>
      </FormSection>

      <FormSection
        title="Comercial"
        description="Organize quem atende, qual segmento e quais condições básicas valem para esse cliente."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Responsável / Comprador"
            id="cliente-resp"
            value={values.resp}
            onChange={(e) => update('resp', e.target.value)}
            data-testid="form-resp"
          />
          <Select
            label="Vendedor"
            id="cliente-rca"
            value={values.rca_id}
            onChange={(e) => handleRcaChange(e.target.value)}
            options={[
              { value: '', label: 'Sem vendedor' },
              ...rcas.map((rca) => ({ value: rca.id, label: rca.nome }))
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="Segmento"
            id="cliente-seg"
            value={values.seg}
            onChange={(e) => update('seg', e.target.value)}
            placeholder="Ex: Atacado, Farmacia, Revenda"
            data-testid="form-seg"
          />
          <Select
            label="Tabela de preço"
            id="cliente-tab"
            value={values.tab}
            onChange={(e) => update('tab', e.target.value)}
            options={[
              { value: 'padrao', label: 'Padrao' },
              { value: 'especial', label: 'Especial' },
              { value: 'vip', label: 'VIP' }
            ]}
          />
          <Select
            label="Prazo de pagamento"
            id="cliente-prazo"
            value={values.prazo}
            onChange={(e) => update('prazo', e.target.value)}
            options={[
              { value: 'a_vista', label: 'A vista' },
              { value: '7d', label: '7 dias' },
              { value: '15d', label: '15 dias' },
              { value: '30d', label: '30 dias' },
              { value: '60d', label: '60 dias' }
            ]}
          />
          <Input
            label="Time(s)"
            id="cliente-time"
            value={values.time}
            placeholder="Ex: Flamengo, Paysandu"
            onChange={(e) => update('time', e.target.value)}
            data-testid="form-time"
          />
        </div>
      </FormSection>

      <FormSection title="Localização e observações">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Cidade"
            id="cliente-cidade"
            value={values.cidade}
            onChange={(e) => update('cidade', e.target.value)}
            data-testid="form-cidade"
          />
          <Input
            label="Estado"
            id="cliente-estado"
            value={values.estado}
            onChange={(e) => update('estado', e.target.value)}
            onBlur={(e) => update('estado', normalizeUf(e.target.value))}
            maxLength={2}
            placeholder="UF"
            data-testid="form-estado"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Data de aniversário"
            id="cliente-aniv"
            type="date"
            value={values.data_aniversario}
            onChange={(e) => update('data_aniversario', e.target.value)}
            data-testid="form-aniv"
          />
          <FormField label="Opt-ins de marketing">
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
          </FormField>
        </div>

        <FormField label="Observações" htmlFor="cliente-obs">
          <textarea
            id="cliente-obs"
            className="rf-input-premium min-h-[100px] resize-none"
            rows={3}
            value={values.obs}
            onChange={(e) => update('obs', e.target.value)}
          />
        </FormField>
      </FormSection>

      <FormError message={localError || error} data-testid="form-error" />

      <div className="form-sticky-actions">
        <FormActions
          onCancel={onCancel}
          loading={saving}
          submitLabel={initialCliente ? 'Salvar alterações' : 'Salvar cliente'}
        />
      </div>
    </form>
  );
}
