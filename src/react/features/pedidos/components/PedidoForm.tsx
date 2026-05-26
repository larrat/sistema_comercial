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
import { useAnalytics } from '../../../shared/hooks/useAnalytics';
import { usePedidoStore } from '../store/usePedidoStore';
import { usePedidosQuery, usePedidoMutations, useClientesLightQuery, useRcasQuery } from '../hooks/usePedidosQuery';
import { useFilialStore } from '../../../app/useFilialStore';
import { useProdutosQuery } from '../../produtos/hooks/useProdutosQuery';
import { findClienteByInput } from '../services/clientesLightApi';
import { useUnsavedChangesGuard } from '../../../shared/hooks/useUnsavedChangesGuard';
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
import { toast } from 'sonner';

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
  const { trackEvent } = useAnalytics({ module: 'pedidos' });
  const { save } = usePedidoMutations();
  const filialId = useFilialStore((state) => state.filialId);
  
  // Queries
  const { data: clientesData, isLoading: isLoadingClientes } = useClientesLightQuery();
  const { data: rcasData, isLoading: isLoadingRcas } = useRcasQuery();
  const { data: produtosPage, isLoading: isLoadingProdutos } = useProdutosQuery({ includeVariants: true }, 1, 1000);
  
  const clientes = clientesData || [];
  const rcas = rcasData || [];
  const produtos = produtosPage?.rows || [];
  
  const formLoading = isLoadingClientes || isLoadingRcas || isLoadingProdutos;

  const existingItens = initialPedido ? parsePedidoItens(initialPedido.itens) : [];

  const [cli, setCli] = useState(initialPedido?.cli ?? '');
  const [rcaId, setRcaId] = useState(initialPedido?.rca_id ?? '');
  const [data, setData] = useState(initialPedido?.data ?? getTodayISODate());
  const [status, setStatus] = useState(normalizePedStatus(initialPedido?.status) || 'orcamento');
  const [pgto, setPgto] = useState(initialPedido?.pgto ?? 'a_vista');
  const [prazo, setPrazo] = useState(initialPedido?.prazo ?? 'imediato');
  const [tipo, setTipo] = useState(initialPedido?.tipo ?? 'varejo');
  const [obs, setObs] = useState(initialPedido?.obs ?? '');
  const [custoFrete, setCustoFrete] = useState<string>(initialPedido?.custo_frete?.toString() ?? '');
  const [outrosCustos, setOutrosCustos] = useState<string>(initialPedido?.outros_custos?.toString() ?? '');
  const [itens, setItens] = useState<PedidoItem[]>(existingItens);
  const [errors, setErrors] = useState<PedidoFormErrors>({});
  const [showAdvanced, setShowAdvanced] = useState(Boolean(initialPedido?.obs));

  const selectedCliente = useMemo(() => findClienteByInput(clientes, cli.trim()), [clientes, cli]);
  const totalPedido = useMemo(() => calculatePedidoTotal(itens), [itens]);
  const pedidoNumero = initialPedido?.num ?? 'NOVO';

  const isDirty = useMemo(() => {
    if (!initialPedido) {
      return Boolean(cli.trim() || itens.length > 0 || obs.trim());
    }
    return cli !== (initialPedido.cli ?? '') || 
           rcaId !== (initialPedido.rca_id ?? '') ||
           status !== normalizePedStatus(initialPedido.status) ||
           pgto !== (initialPedido.pgto ?? 'a_vista') ||
           prazo !== (initialPedido.prazo ?? 'imediato') ||
           obs !== (initialPedido.obs ?? '') ||
           itens.length !== existingItens.length ||
           tipo !== (initialPedido.tipo ?? 'varejo') ||
           (parseFloat(custoFrete || '0') !== (initialPedido.custo_frete ?? 0)) ||
           (parseFloat(outrosCustos || '0') !== (initialPedido.outros_custos ?? 0));
  }, [initialPedido, cli, rcaId, status, pgto, prazo, obs, itens.length, existingItens.length, tipo, custoFrete, outrosCustos]);

  useUnsavedChangesGuard(isDirty);

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

    const validation = validatePedidoForm(cli, clientes, itens, pgto, findClienteByInput);
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

    const pedidoInput = {
      id,
      filial_id: initialPedido?.filial_id ?? filialId ?? '',
      num: initialPedido?.num,
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
      total: totalPedido,
      custo_frete: parseFloat(custoFrete || '0'),
      outros_custos: parseFloat(outrosCustos || '0')
    };

    save.mutate(pedidoInput, {
      onSuccess: (saved) => {
        onSaved(saved as unknown as Pedido);
      },
      onError: (err) => {
        setErrors({ geral: err.message });
      }
    });
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

      {!formLoading && (
        <form id="pedido-form-element" onSubmit={(e) => void handleSubmit(e)}>
          <div className="rf-ui-stack">
            <FormError message={errors.geral} data-testid="pedido-form-error" />

            {selectedCliente?.is_defaulter && (
              <div className="empty-inline form-warn-inline !bg-rose-500/10 !text-rose-400 !border-rose-500/20" data-testid="pedido-form-warn-defaulter">
                Atenção: Este cliente possui restrições financeiras (Inadimplente). As condições de venda a prazo estão bloqueadas. Por favor, selecione pagamento À Vista ou PIX.
              </div>
            )}

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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-medium">Número</span>
                  <strong className="text-white">{pedidoNumero}</strong>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-medium">Itens</span>
                  <strong className="text-white">{itens.length}</strong>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-medium">Total estimado</span>
                  <strong className="text-white">{formatPedidoCurrency(totalPedido)}</strong>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-medium">Cliente</span>
                  <div className="flex items-center gap-2 truncate">
                    <strong className="text-white truncate">{selectedCliente?.nome || 'Não selecionado'}</strong>
                    {selectedCliente?.is_defaulter ? (
                      <span className="text-[9px] font-black uppercase bg-rose-500/15 text-rose-400 border border-rose-500/25 px-1.5 py-0.5 rounded animate-pulse">
                        Inadimplente
                      </span>
                    ) : null}
                  </div>
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
                  custoFrete={parseFloat(custoFrete || '0')}
                  outrosCustos={parseFloat(outrosCustos || '0')}
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

            <FormSection
              title="Custos Operacionais"
              description="Registre despesas atreladas a este pedido. Estes valores abatem automaticamente o ganho na transação gerencial."
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Custo de Frete (R$)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={custoFrete}
                  onChange={(e) => setCustoFrete(e.target.value)}
                  placeholder="0.00"
                  helperText="Valor gasto com transporte ou frete."
                />
                <Input
                  label="Outros Custos (R$)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={outrosCustos}
                  onChange={(e) => setOutrosCustos(e.target.value)}
                  placeholder="0.00"
                  helperText="Embalagens extras, taxas ou serviços de terceiros."
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

            <FormActions onCancel={onCancel} loading={save.isPending}>
              {onCancel && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onCancel}
                  disabled={save.isPending}
                >
                  Cancelar
                </Button>
              )}
              <Button 
                type="submit" 
                variant="primary" 
                loading={save.isPending}
                data-testid="pedido-form-submit"
              >
                {isEdit ? 'Salvar alterações' : 'Salvar pedido'}
              </Button>
            </FormActions>
          </div>
        </form>
      )}
    </div>
  );
}
