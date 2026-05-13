import { useEffect, useMemo, useState } from 'react';
import {
  ErrorState,
  FormActions,
  FormError,
  FormField,
  FormSection,
  LoadingState,
  StatusBadge,
  Button,
  Input,
  Select,
  Badge
} from '../../../shared/ui';
import type { Pedido, PedidoItem } from '../../../../types/domain';
import { useToastStore } from '../../../app/lib/useToastStore';
import { useAnalytics } from '../../../shared/hooks/useAnalytics';
import { usePedidoStore } from '../store/usePedidoStore';
import { usePedidoMutations } from '../hooks/usePedidoMutations';
import { usePedidoFormData } from '../hooks/usePedidoFormData';
import { findClienteByInput } from '../services/clientesLightApi';
import { PedidoItemsSection } from './PedidoItemsSection';
import { PEDIDO_STATUS_LABEL, normalizePedStatus } from '../types';
import {
  calculatePedidoTotal,
  formatPedidoCurrency,
  getNextPedidoNumber,
  getTodayISODate,
  normalizePedidoPrazo,
  parsePedidoItens,
  resolveRcaNome,
  validatePedidoForm,
  type PedidoFormErrors
} from '../utils/pedidoRules';

type Props = {
  initialPedido: Pedido | null;
  prefillClienteId?: string | null;
  onSaved: (pedido: Pedido) => void;
  onCancel: () => void;
  analyticsOrigin?: string;
};

export function PedidoForm({
  initialPedido,
  prefillClienteId = null,
  onSaved,
  onCancel,
  analyticsOrigin = 'unknown'
}: Props) {
  const allPedidos = usePedidoStore((s) => s.pedidos);
  const { trackEvent } = useAnalytics({ module: 'pedidos' });
  const { submitPedido } = usePedidoMutations();
  const { produtos, clientes, rcas, loading: formLoading, error: formError } = usePedidoFormData();

  const existingItens = initialPedido ? parsePedidoItens(initialPedido.itens) : [];

  const [cli, setCli] = useState(initialPedido?.cli ?? '');
  const [rcaId, setRcaId] = useState(initialPedido?.rca_id ?? '');
  const [data, setData] = useState(initialPedido?.data ?? getTodayISODate());
  const [status, setStatus] = useState(normalizePedStatus(initialPedido?.status) || 'orcamento');
  const [pgto, setPgto] = useState(initialPedido?.pgto ?? 'a_vista');
  const [prazo, setPrazo] = useState(initialPedido?.prazo ?? 'imediato');
  const [tipo, setTipo] = useState(initialPedido?.tipo ?? 'varejo');
  const [obs, setObs] = useState(initialPedido?.obs ?? '');
  const [itens, setItens] = useState<PedidoItem[]>(existingItens);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<PedidoFormErrors>({});
  const [showAdvanced, setShowAdvanced] = useState(Boolean(initialPedido?.obs));

  const selectedCliente = useMemo(() => findClienteByInput(clientes, cli.trim()), [clientes, cli]);
  const totalPedido = useMemo(() => calculatePedidoTotal(itens), [itens]);
  const pedidoNumero = initialPedido?.num ?? getNextPedidoNumber(allPedidos);

  function addItem(item: PedidoItem) {
    setItens((prev) => [...prev, item]);
    setErrors((current) => ({ ...current, itens: undefined, geral: undefined }));
  }

  function removeItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index));
  }

  function handleClienteChange(value: string) {
    setCli(value);
    setErrors((current) => ({ ...current, cli: undefined, geral: undefined }));
    const clienteFound = findClienteByInput(clientes, value.trim());
    if (clienteFound?.rca_id && !rcaId) {
      setRcaId(clienteFound.rca_id);
    }
    if (clienteFound?.prazo && prazo === 'imediato') {
      setPrazo(normalizePedidoPrazo(clienteFound.prazo));
    }
  }

  function handlePagamentoChange(value: string) {
    setPgto(value);
    if (value === 'boleto' && prazo === 'imediato') {
      setPrazo('30d');
    }
  }

  useEffect(() => {
    if (initialPedido || !prefillClienteId || !clientes.length) return;
    const clientePrefill = clientes.find((cliente) => cliente.id === prefillClienteId) ?? null;
    if (!clientePrefill) return;
    setCli((current) => (current.trim() ? current : clientePrefill.id));
    if (clientePrefill.rca_id) {
      setRcaId((current) => current || clientePrefill.rca_id || '');
    }
    if (clientePrefill.prazo) {
      setPrazo((current) =>
        current === 'imediato' ? normalizePedidoPrazo(clientePrefill.prazo) : current
      );
    }
  }, [clientes, initialPedido, prefillClienteId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const validation = validatePedidoForm(cli, clientes, itens, findClienteByInput);
    if (validation.ok === false) {
      setErrors(validation.errors);
      trackEvent('erro_formulario', {
        metadata: {
          origin: analyticsOrigin,
          form: 'pedido',
          fields: validation.fields,
          reason: validation.reason
        },
        result: 'error'
      });
      return;
    }

    const clienteFound = validation.cliente;
    const rcaNome = resolveRcaNome(rcas, rcaId, clienteFound);
    const id = initialPedido?.id ?? globalThis.crypto.randomUUID();
    const num = pedidoNumero;

    const pedidoInput = {
      id,
      num,
      cli: clienteFound.nome,
      cliente_id: clienteFound.id,
      rca_id: rcaId || null,
      rca_nome: rcaNome || null,
      data,
      status,
      pgto,
      prazo,
      tipo,
      obs: obs.trim(),
      itens,
      total: totalPedido
    };

    setSaving(true);
    try {
      const result = await submitPedido(pedidoInput, {
        metadata: {
          origin: analyticsOrigin
        }
      });
      if (result.aviso) {
        setErrors({ geral: result.aviso });
        useToastStore.getState().addToast(result.aviso, 'warning');
      } else {
        useToastStore.getState().addToast(
          isEdit
            ? `Pedido #${result.pedido.num} atualizado com sucesso.`
            : `Pedido #${result.pedido.num} criado com sucesso.`,
          'success'
        );
        onSaved(result.pedido as unknown as Pedido);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar pedido.';
      setErrors({ geral: message });
      useToastStore.getState().addToast(message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const isEdit = !!initialPedido;

  return (
    <div className="rf-ui-stack" data-testid="pedido-form">
      {formLoading && (
        <LoadingState
          title="Carregando dados do formulário..."
          description="Produtos, clientes e vendedores estão sendo preparados."
          compact
        />
      )}
      {formError && <ErrorState title={formError} compact />}

      {!formLoading && !formError && (
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="rf-ui-stack">
            <FormError message={errors.geral} data-testid="pedido-form-error" />

            {normalizePedStatus(status) === 'entregue_aguardando_pagamento' &&
              prazo === 'imediato' && (
                <div className="empty-inline form-warn-inline" data-testid="pedido-form-warn-prazo">
                  Prazo imediato não gera conta a receber automaticamente. Use 7, 15, 30 ou 60 dias
                  se precisar da geração automática.
                </div>
              )}

            <FormSection
              title="Resumo rápido"
              description="Acompanhe o tamanho do pedido enquanto preenche os campos principais."
              aside={
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone="info">
                    {PEDIDO_STATUS_LABEL[normalizePedStatus(status)] ?? status ?? 'orcamento'}
                  </StatusBadge>
                  <StatusBadge tone="neutral">
                    {tipo === 'atacado' ? 'Atacado' : 'Varejo'}
                  </StatusBadge>
                </div>
              }
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-medium">Número</span>
                  <strong className="text-slate-900">{pedidoNumero}</strong>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-medium">Itens</span>
                  <strong className="text-slate-900">{itens.length}</strong>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-medium">Total estimado</span>
                  <strong className="text-slate-900">{formatPedidoCurrency(totalPedido)}</strong>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-medium">Cliente</span>
                  <strong className="text-slate-900 truncate">{selectedCliente?.nome || 'Não selecionado'}</strong>
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Essencial"
              description="Defina cliente, data, vendedor e os itens que entram no pedido."
              aside={<Badge variant="blue">Prioridade</Badge>}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Cliente"
                  required
                  error={errors.cli as string}
                  helperText="Selecione um cliente já cadastrado para manter o vínculo correto do pedido."
                  list="ped-form-cli-dl"
                  placeholder="Nome do cliente"
                  value={cli}
                  onChange={(e) => handleClienteChange(e.target.value)}
                  autoComplete="off"
                  data-testid="pedido-form-cli"
                />
                <datalist id="ped-form-cli-dl">
                  {clientes.map((c) => (
                    <option key={c.id} value={c.nome} />
                  ))}
                </datalist>
                <Input
                  label="Data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  data-testid="pedido-form-data"
                />
                <Select
                  label="Vendedor"
                  id="pedido-form-rca"
                  helperText="Se o cliente já tiver vendedor vinculado, o formulário tenta reaproveitar."
                  value={rcaId}
                  onChange={(e) => setRcaId(e.target.value)}
                  options={[
                    { value: '', label: 'Sem vendedor' },
                    ...rcas.map((r) => ({ value: r.id, label: r.nome }))
                  ]}
                />
              </div>

              <FormField
                label="Itens do pedido"
                error={errors.itens}
                helperText="A composição abaixo continua usando o mesmo cálculo atual de quantidade, preço e total."
              >
                <PedidoItemsSection
                  itens={itens}
                  produtos={produtos}
                  tipo={tipo}
                  onAdd={addItem}
                  onRemove={removeItem}
                />
              </FormField>
            </FormSection>

            <FormSection
              title="Condições do pedido"
              description="Ajuste status, pagamento, prazo e tipo de venda sem disputar espaço com os itens."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Select
                  label="Status"
                  id="pedido-form-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  options={[
                    { value: 'orcamento', label: 'Orçamento' },
                    { value: 'confirmado', label: 'Confirmado' },
                    { value: 'em_separacao', label: 'Em separação' },
                    { value: 'em_andamento', label: 'Em andamento' },
                    { value: 'entregue_aguardando_pagamento', label: 'Entregue · aguardando pagamento' },
                    { value: 'pago_aguardando_entrega', label: 'Pago · aguardando entrega' },
                    { value: 'concluido', label: 'Concluído' },
                    { value: 'cancelado', label: 'Cancelado' }
                  ]}
                />
                <Select
                  label="Pagamento"
                  id="pedido-form-pgto"
                  value={pgto}
                  onChange={(e) => handlePagamentoChange(e.target.value)}
                  options={[
                    { value: 'a_vista', label: 'A vista' },
                    { value: 'pix', label: 'PIX' },
                    { value: 'boleto', label: 'Boleto' },
                    { value: 'cartao', label: 'Cartao' },
                    { value: 'cheque', label: 'Cheque' }
                  ]}
                />
                <Select
                  label="Prazo"
                  id="pedido-form-prazo"
                  helperText="Cliente ou boleto preenchem um prazo seguro quando ainda estiver imediato."
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                  options={[
                    { value: 'imediato', label: 'Imediato' },
                    { value: '7d', label: '7 dias' },
                    { value: '15d', label: '15 dias' },
                    { value: '30d', label: '30 dias' },
                    { value: '60d', label: '60 dias' }
                  ]}
                />
                <Select
                  label="Tipo de venda"
                  id="pedido-form-tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  options={[
                    { value: 'varejo', label: 'Varejo' },
                    { value: 'atacado', label: 'Atacado' }
                  ]}
                />
              </div>
            </FormSection>

            <details
              className="form-advanced-block"
              open={showAdvanced}
              onToggle={(event) => setShowAdvanced(event.currentTarget.open)}
            >
              <summary className="form-advanced-summary">
                <span>Observações e detalhes extras</span>
                <span className="table-cell-caption table-cell-muted">
                  Use este espaço quando precisar orientar separação, entrega ou atendimento
                </span>
              </summary>
              <div className="form-advanced-body">
                <FormField label="Observações" htmlFor="pedido-form-obs">
                  <textarea
                    id="pedido-form-obs"
                    className="rf-input-premium min-h-[100px] resize-none"
                    rows={3}
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                  />
                </FormField>
              </div>
            </details>
          </div>

          <div className="sticky bottom-0 z-10 pt-4 pb-2 mt-6 bg-white border-t border-slate-200">
            <FormActions
              onCancel={onCancel}
              cancelLabel="Voltar"
              loading={saving}
              submitLabel={isEdit ? 'Salvar alterações' : 'Salvar pedido'}
            />
          </div>
        </form>
      )}
    </div>
  );
}
