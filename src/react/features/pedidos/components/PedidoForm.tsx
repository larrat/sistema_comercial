import { useEffect, useMemo, useState } from 'react';
import {
  ErrorState,
  FormActions,
  FormError,
  FormField,
  FormSection,
  LoadingState,
  StatusBadge
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
              <div className="form-summary-grid">
                <div className="form-summary-item">
                  <span className="table-cell-caption table-cell-muted">Número</span>
                  <strong>{pedidoNumero}</strong>
                </div>
                <div className="form-summary-item">
                  <span className="table-cell-caption table-cell-muted">Itens</span>
                  <strong>{itens.length}</strong>
                </div>
                <div className="form-summary-item">
                  <span className="table-cell-caption table-cell-muted">Total estimado</span>
                  <strong>{formatPedidoCurrency(totalPedido)}</strong>
                </div>
                <div className="form-summary-item">
                  <span className="table-cell-caption table-cell-muted">Cliente</span>
                  <strong>{selectedCliente?.nome || 'Não selecionado'}</strong>
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Essencial"
              description="Defina cliente, data, vendedor e os itens que entram no pedido."
              aside={<span className="bdg bb">Prioridade</span>}
            >
              <div className="grid grid-3">
                <FormField
                  label="Cliente"
                  htmlFor="pedido-form-cliente"
                  required
                  error={errors.cli}
                  hint="Selecione um cliente já cadastrado para manter o vínculo correto do pedido."
                >
                  <input
                    id="pedido-form-cliente"
                    className="inp"
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
                </FormField>
                <FormField label="Data" htmlFor="pedido-form-data-input">
                  <input
                    id="pedido-form-data-input"
                    className="inp"
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    data-testid="pedido-form-data"
                  />
                </FormField>
                <FormField
                  label="Vendedor"
                  htmlFor="pedido-form-rca-input"
                  hint="Se o cliente já tiver vendedor vinculado, o formulário tenta reaproveitar."
                >
                  <select
                    id="pedido-form-rca-input"
                    className="inp sel"
                    value={rcaId}
                    onChange={(e) => setRcaId(e.target.value)}
                    data-testid="pedido-form-rca"
                  >
                    <option value="">Sem vendedor</option>
                    {rcas.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nome}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField
                label="Itens do pedido"
                error={errors.itens}
                hint="A composição abaixo continua usando o mesmo cálculo atual de quantidade, preço e total."
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
              <div className="grid grid-4">
                <FormField label="Status" htmlFor="pedido-form-status-input">
                  <select
                    id="pedido-form-status-input"
                    className="inp sel"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    data-testid="pedido-form-status"
                  >
                    <option value="orcamento">Orçamento</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="em_separacao">Em separação</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="entregue_aguardando_pagamento">
                      Entregue · aguardando pagamento
                    </option>
                    <option value="pago_aguardando_entrega">Pago · aguardando entrega</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </FormField>
                <FormField label="Pagamento" htmlFor="pedido-form-pgto-input">
                  <select
                    id="pedido-form-pgto-input"
                    className="inp sel"
                    value={pgto}
                    onChange={(e) => handlePagamentoChange(e.target.value)}
                    data-testid="pedido-form-pgto"
                  >
                    <option value="a_vista">A vista</option>
                    <option value="pix">PIX</option>
                    <option value="boleto">Boleto</option>
                    <option value="cartao">Cartao</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </FormField>
                <FormField
                  label="Prazo"
                  htmlFor="pedido-form-prazo-input"
                  hint="Cliente ou boleto preenchem um prazo seguro quando ainda estiver imediato."
                >
                  <select
                    id="pedido-form-prazo-input"
                    className="inp sel"
                    value={prazo}
                    onChange={(e) => setPrazo(e.target.value)}
                    data-testid="pedido-form-prazo"
                  >
                    <option value="imediato">Imediato</option>
                    <option value="7d">7 dias</option>
                    <option value="15d">15 dias</option>
                    <option value="30d">30 dias</option>
                    <option value="60d">60 dias</option>
                  </select>
                </FormField>
                <FormField label="Tipo de venda" htmlFor="pedido-form-tipo-input">
                  <select
                    id="pedido-form-tipo-input"
                    className="inp sel"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    data-testid="pedido-form-tipo"
                  >
                    <option value="varejo">Varejo</option>
                    <option value="atacado">Atacado</option>
                  </select>
                </FormField>
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
                <FormField label="Observações" htmlFor="pedido-form-obs-input">
                  <textarea
                    id="pedido-form-obs-input"
                    className="inp"
                    rows={3}
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                    data-testid="pedido-form-obs"
                  />
                </FormField>
              </div>
            </details>
          </div>

          <div className="form-sticky-actions">
            <FormActions
              onCancel={onCancel}
              cancelLabel="Voltar"
              loading={saving}
              submitLabel={isEdit ? 'Salvar alterações' : 'Salvar pedido'}
            >
              <>
                <button className="btn btn-sm" type="button" onClick={onCancel} disabled={saving}>
                  Voltar
                </button>
                <button
                  className="btn btn-p btn-sm"
                  type="submit"
                  disabled={saving}
                  data-testid="pedido-form-submit"
                >
                  {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Salvar pedido'}
                </button>
              </>
            </FormActions>
          </div>
        </form>
      )}
    </div>
  );
}
