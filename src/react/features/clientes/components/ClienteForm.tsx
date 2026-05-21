import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import type { Cliente } from '../../../../types/domain';
import {
  FormSection,
  Input,
  Select,
  FormField,
  Badge,
  FormError,
  FormActions
} from '../../../shared/ui';
import { useClienteMutations } from '../hooks/useClientesQuery';
import { useRcas } from '../hooks/useRcas';
import { useUnsavedChangesGuard } from '../../../shared/hooks/useUnsavedChangesGuard';

const clienteSchema = z.object({
  nome: z.string().min(1, 'Nome do cliente é obrigatório.'),
  apelido: z.string().optional(),
  doc: z.string().optional(),
  tipo: z.string().default('PJ'),
  status: z.string().default('ativo'),
  is_defaulter: z.boolean().default(false),
  tel: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email('Informe um e-mail válido.').or(z.literal('')).optional(),
  resp: z.string().optional(),
  rca_id: z.string().nullable().optional(),
  rca_nome: z.string().nullable().optional(),
  time: z.string().optional(),
  seg: z.string().optional(),
  tab: z.string().default('padrao'),
  prazo: z.string().default('a_vista'),
  cidade: z.string().optional(),
  estado: z.string().max(2, 'UF deve ter 2 caracteres.').optional(),
  data_aniversario: z.string().optional(),
  optin_marketing: z.boolean().default(false),
  optin_email: z.boolean().default(false),
  optin_sms: z.boolean().default(false),
  obs: z.string().optional(),
}).refine((data) => {
  if (data.optin_email && !data.email) return false;
  return true;
}, {
  message: 'Para liberar opt-in de e-mail, informe o e-mail do cliente.',
  path: ['email']
}).refine((data) => {
  if (data.optin_sms && !data.tel && !data.whatsapp) return false;
  return true;
}, {
  message: 'Para liberar opt-in de SMS, informe telefone ou WhatsApp.',
  path: ['tel']
});

type ClienteFormValues = z.infer<typeof clienteSchema>;

type Props = {
  initialCliente?: Cliente | null;
  onSaved?: (cliente: Cliente) => void;
  onCancel?: () => void;
  analyticsOrigin?: string;
};

function toFormValues(cliente?: Cliente | null): Partial<ClienteFormValues> {
  return {
    nome: cliente?.nome ?? '',
    apelido: cliente?.apelido ?? '',
    doc: cliente?.doc ?? '',
    tipo: cliente?.tipo ?? 'PJ',
    status: cliente?.status ?? 'ativo',
    is_defaulter: !!cliente?.is_defaulter,
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

export function ClienteForm({
  initialCliente = null,
  onSaved,
  onCancel
}: Props) {
  const { save: saveMutation } = useClienteMutations();
  const rcas = useRcas();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty }
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: useMemo(() => toFormValues(initialCliente), [initialCliente])
  });

  useUnsavedChangesGuard(isDirty);

  useEffect(() => {
    reset(toFormValues(initialCliente));
  }, [initialCliente, reset]);

  const onSubmit = (values: ClienteFormValues) => {
    saveMutation.mutate({
      ...values,
      id: initialCliente?.id,
      rca_id: values.rca_id || null,
      rca_nome: values.rca_nome || null,
    }, {
      onSuccess: (saved) => {
        if (saved) onSaved?.(saved);
      }
    });
  };

  const handleRcaChange = (rcaId: string) => {
    const rca = rcas.find((r) => r.id === rcaId);
    setValue('rca_id', rcaId);
    setValue('rca_nome', rca?.nome ?? '');
  };

  return (
    <form className="flex flex-col gap-8" onSubmit={handleSubmit(onSubmit)} data-testid="cliente-form">
      <FormSection
        title="Essencial"
        description="Identificação e contato para o time conseguir atender e vender."
        aside={<Badge variant="blue">Obrigatório primeiro</Badge>}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nome / Razão social"
            required
            {...register('nome')}
            error={errors.nome?.message}
            data-testid="form-nome"
          />
          <Input
            label="Apelido / Fantasia"
            helperText="Como a equipe identifica esse cliente no dia a dia."
            {...register('apelido')}
            placeholder="Como a equipe identifica esse cliente no dia a dia"
            data-testid="form-apelido"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="CPF / CNPJ"
            helperText="Aceita CPF ou CNPJ; a formatação entra ao sair do campo."
            inputMode="numeric"
            {...register('doc')}
            onBlur={(e) => setValue('doc', formatCpfCnpj(e.target.value))}
            placeholder="Somente numeros ou documento completo"
            data-testid="form-doc"
          />
          <Select
            label="Tipo"
            {...register('tipo')}
            options={[
              { value: 'PJ', label: 'PJ' },
              { value: 'PF', label: 'PF' }
            ]}
          />
          <Select
            label="Status"
            {...register('status')}
            options={[
              { value: 'ativo', label: 'Ativo' },
              { value: 'prospecto', label: 'Prospecto' },
              { value: 'inativo', label: 'Inativo' }
            ]}
          />
          <FormField label="Financeiro" helperText="Bloqueia vendas a prazo se ativo.">
            <label className="optin-choice text-danger-400 font-bold">
              <input type="checkbox" {...register('is_defaulter')} data-testid="form-is-defaulter" />
              INADIMPLENTE
            </label>
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Telefone"
            type="tel"
            inputMode="tel"
            {...register('tel')}
            onBlur={(e) => setValue('tel', formatPhone(e.target.value))}
            placeholder="(11) 3333-4444"
            autoComplete="tel"
            error={errors.tel?.message}
            data-testid="form-tel"
          />
          <Input
            label="WhatsApp"
            type="tel"
            inputMode="tel"
            {...register('whatsapp')}
            onBlur={(e) => setValue('whatsapp', formatPhone(e.target.value))}
            placeholder="(11) 99999-0000"
            autoComplete="tel"
            data-testid="form-whatsapp"
          />
          <Input
            label="E-mail"
            type="email"
            {...register('email')}
            placeholder="exemplo@cliente.com.br"
            autoComplete="email"
            error={errors.email?.message}
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
            {...register('resp')}
            data-testid="form-resp"
          />
          <Select
            label="Vendedor"
            value={watch('rca_id') || ''}
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
            {...register('seg')}
            placeholder="Ex: Atacado, Farmacia, Revenda"
            data-testid="form-seg"
          />
          <Select
            label="Tabela de preço"
            {...register('tab')}
            options={[
              { value: 'padrao', label: 'Padrao' },
              { value: 'especial', label: 'Especial' },
              { value: 'vip', label: 'VIP' }
            ]}
          />
          <Select
            label="Prazo de pagamento"
            {...register('prazo')}
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
            {...register('time')}
            placeholder="Ex: Flamengo, Paysandu"
            data-testid="form-time"
          />
        </div>
      </FormSection>

      <FormSection title="Localização e observações">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Cidade"
            {...register('cidade')}
            data-testid="form-cidade"
          />
          <Input
            label="Estado"
            {...register('estado')}
            maxLength={2}
            placeholder="UF"
            data-testid="form-estado"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Data de aniversário"
            type="date"
            {...register('data_aniversario')}
            data-testid="form-aniv"
          />
          <FormField label="Opt-ins de marketing">
            <div className="fg2">
              <label className="optin-choice">
                <input type="checkbox" {...register('optin_marketing')} data-testid="form-optin-marketing" />
                Marketing
              </label>
              <label className="optin-choice">
                <input type="checkbox" {...register('optin_email')} data-testid="form-optin-email" />
                E-mail
              </label>
              <label className="optin-choice">
                <input type="checkbox" {...register('optin_sms')} data-testid="form-optin-sms" />
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
            {...register('obs')}
          />
        </FormField>
      </FormSection>

      <FormError message={saveMutation.error instanceof Error ? saveMutation.error.message : null} data-testid="form-error" />

      <div className="form-sticky-actions">
        <FormActions
          onCancel={onCancel}
          loading={saveMutation.isPending}
          submitLabel={initialCliente ? 'Salvar alterações' : 'Salvar cliente'}
        />
      </div>
    </form>
  );
}
