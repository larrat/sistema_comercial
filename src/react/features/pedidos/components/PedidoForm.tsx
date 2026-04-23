import { useMemo, useState } from 'react';
import type { Pedido, PedidoItem } from '../../../../types/domain';
import { usePedidoStore } from '../store/usePedidoStore';
import { usePedidoMutations } from '../hooks/usePedidoMutations';
import { usePedidoFormData } from '../hooks/usePedidoFormData';
import { findClienteByInput } from '../services/clientesLightApi';
import { PedidoItemsSection } from './PedidoItemsSection';
import { normalizePedStatus } from '../types';

function today() {
  return new Date().toISOString().split('T')[0];
}

function nextPedNum(pedidos: Pedido[]): number {
  const nums = pedidos.map((p) => p.num).filter((n) => typeof n === 'number' && !isNaN(n));
  return nums.length ? Math.max(...nums) + 1 : 1;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type Props = {
  initialPedido: Pedido | null;
  onSaved: (pedido: Pedido) => void;
  onCancel: () => void;
};

export function PedidoForm({ initialPedido, onSaved, onCancel }: Props) {
  const allPedidos = usePedidoStore((s) => s.pedidos);
  const { submitPedido } = usePedidoMutations();
  const { produtos, clientes, rcas, loading: formLoading, error: formError } = usePedidoFormData();

  const existingItens = initialPedido
    ? Array.isArray(initialPedido.itens)
      ? (initialPedido.itens as PedidoItem[])
      : (() => {
          try {
            return JSON.parse(initialPedido.itens as string) as PedidoItem[];
          } catch {
            return [];
          }
        })()
    : [];

  const [cli, setCli] = useState(initialPedido?.cli ?? '');
  const [rcaId, setRcaId] = useState(initialPedido?.rca_id ?? '');
  const [data, setData] = useState(initialPedido?.data ?? today());
  const [status, setStatus] = useState(normalizePedStatus(initialPedido?.status) || 'orcamento');
  const [pgto, setPgto] = useState(initialPedido?.pgto ?? 'a_vista');
  const [prazo, setPrazo] = useState(initialPedido?.prazo ?? 'imediato');
  const [tipo, setTipo] = useState(initialPedido?.tipo ?? 'varejo');
  const [obs, setObs] = useState(initialPedido?.obs ?? '');
  const [itens, setItens] = useState<PedidoItem[]>(existingItens);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(Boolean(initialPedido?.obs));

  const selectedCliente = useMemo(() => findClienteByInput(clientes, cli.trim()), [clientes, cli]);
  const totalPedido = useMemo(
    () => itens.reduce((acc, item) => acc + item.qty * item.preco, 0),
    [itens]
  );

  function addItem(item: PedidoItem) {
    setItens((prev) => [...prev, item]);
  }

  function removeItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index));
  }

  function handleClienteChange(value: string) {
    setCli(value);
    const clienteFound = findClienteByInput(clientes, value.trim());
    if (clienteFound?.rca_id && !rcaId) {
      setRcaId(clienteFound.rca_id);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cliTrimmed = cli.trim();
    if (!cliTrimmed) {
      setError('Cliente e obrigatorio.');
      return;
    }

    const clienteFound = findClienteByInput(clientes, cliTrimmed);
    if (!clienteFound) {
      setError('Cliente invalido. Escolha um cliente cadastrado na lista.');
      return;
    }

    if (itens.length === 0) {
      setError('Adicione ao menos 1 item ao pedido.');
      return;
    }

    const rca = rcas.find((r) => r.id === rcaId);
    const rcaNome = rca?.nome ?? clienteFound.rca_nome ?? '';
    const id = initialPedido?.id ?? globalThis.crypto.randomUUID();
    const num = initialPedido?.num ?? nextPedNum(allPedidos);

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
      const aviso = await submitPedido(pedidoInput);
      if (aviso) {
        setError(aviso);
      } else {
        onSaved(pedidoInput as unknown as Pedido);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar pedido.');
    } finally {
      setSaving(false);
    }
  }

  const isEdit = !!initialPedido;
  const titulo = isEdit ? `Editar pedido #${initialPedido!.num}` : 'Novo pedido';

  return (
    <div className="card card-shell" data-testid="pedido-form">
      <div className="form-shell-head">
        <div className="form-shell-kicker">Operacao</div>
        <div className="modal-shell-head">
          <div className="mt">{titulo}</div>
          <p className="form-shell-copy">
            Comece pelo cliente e pelos itens. Condicoes e observacoes ficam organizadas logo
            abaixo.
          </p>
        </div>
      </div>

      {formLoading && (
        <div className="empty">
          <p>Carregando dados do formulario...</p>
        </div>
      )}
      {formError && (
        <div className="empty">
          <p>{formError}</p>
        </div>
      )}

      {!formLoading && !formError && (
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="modal-shell-body">
            {error && (
              <div className="empty-inline form-error-inline" data-testid="pedido-form-error">
                {error}
              </div>
            )}

            {status === 'entregue' && prazo === 'imediato' && (
              <div className="empty-inline form-warn-inline" data-testid="pedido-form-warn-prazo">
                Prazo imediato nao gera conta a receber automaticamente. Altere o prazo para 7,
                15, 30 ou 60 dias para geracao automatica.
              </div>
            )}

            <section className="form-section-card">
              <div className="form-section-head">
                <div>
                  <div className="form-section-title">Resumo rapido</div>
                  <p className="form-section-copy">
                    Acompanhe o tamanho do pedido enquanto preenche.
                  </p>
                </div>
              </div>

              <div className="form-summary-grid">
                <div className="form-summary-item">
                  <span className="table-cell-caption table-cell-muted">Numero</span>
                  <strong>{initialPedido?.num ?? nextPedNum(allPedidos)}</strong>
                </div>
                <div className="form-summary-item">
                  <span className="table-cell-caption table-cell-muted">Itens</span>
                  <strong>{itens.length}</strong>
                </div>
                <div className="form-summary-item">
                  <span className="table-cell-caption table-cell-muted">Total estimado</span>
                  <strong>{formatCurrency(totalPedido)}</strong>
                </div>
                <div className="form-summary-item">
                  <span className="table-cell-caption table-cell-muted">Cliente</span>
                  <strong>{selectedCliente?.nome || 'Nao selecionado'}</strong>
                </div>
              </div>
            </section>

            <section className="form-section-card">
              <div className="form-section-head">
                <div>
                  <div className="form-section-title">Essencial</div>
                  <p className="form-section-copy">
                    Defina quem compra, quando o pedido foi criado e quais itens entram.
                  </p>
                </div>
                <span className="bdg bb">Prioridade</span>
              </div>

              <div className="grid grid-3">
                <label className="form-field">
                  <span>Cliente *</span>
                  <input
                    className="inp"
                    list="ped-form-cli-dl"
                    placeholder="Nome do cliente"
                    value={cli}
                    onChange={(e) => handleClienteChange(e.target.value)}
                    data-testid="pedido-form-cli"
                  />
                  <datalist id="ped-form-cli-dl">
                    {clientes.map((c) => (
                      <option key={c.id} value={c.nome} />
                    ))}
                  </datalist>
                </label>
                <label className="form-field">
                  <span>Data</span>
                  <input
                    className="inp"
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    data-testid="pedido-form-data"
                  />
                </label>
                <label className="form-field">
                  <span>Vendedor</span>
                  <select
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
                </label>
              </div>

              <PedidoItemsSection
                itens={itens}
                produtos={produtos}
                tipo={tipo}
                onAdd={addItem}
                onRemove={removeItem}
              />
            </section>

            <section className="form-section-card">
              <div className="form-section-head">
                <div>
                  <div className="form-section-title">Condicoes do pedido</div>
                  <p className="form-section-copy">
                    Ajuste status, pagamento, prazo e tipo de venda sem disputar espaco com os
                    itens.
                  </p>
                </div>
              </div>

              <div className="grid grid-4">
                <label className="form-field">
                  <span>Status</span>
                  <select
                    className="inp sel"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    data-testid="pedido-form-status"
                  >
                    <option value="orcamento">Orcamento</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="em_separacao">Em separacao</option>
                    <option value="entregue">Entregue</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Pagamento</span>
                  <select
                    className="inp sel"
                    value={pgto}
                    onChange={(e) => setPgto(e.target.value)}
                    data-testid="pedido-form-pgto"
                  >
                    <option value="a_vista">A vista</option>
                    <option value="pix">PIX</option>
                    <option value="boleto">Boleto</option>
                    <option value="cartao">Cartao</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Prazo</span>
                  <select
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
                </label>
                <label className="form-field">
                  <span>Tipo de venda</span>
                  <select
                    className="inp sel"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    data-testid="pedido-form-tipo"
                  >
                    <option value="varejo">Varejo</option>
                    <option value="atacado">Atacado</option>
                  </select>
                </label>
              </div>
            </section>

            <details
              className="form-advanced-block"
              open={showAdvanced}
              onToggle={(event) => setShowAdvanced(event.currentTarget.open)}
            >
              <summary className="form-advanced-summary">
                <span>Observacoes e detalhes extras</span>
                <span className="table-cell-caption table-cell-muted">
                  Use quando precisar orientar separacao, entrega ou atendimento
                </span>
              </summary>
              <div className="form-advanced-body">
                <label className="form-field">
                  <span>Observacoes</span>
                  <textarea
                    className="inp"
                    rows={3}
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                    data-testid="pedido-form-obs"
                  />
                </label>
              </div>
            </details>
          </div>

          <div className="form-sticky-actions">
            <div className="modal-actions">
              <button className="btn" type="button" onClick={onCancel} disabled={saving}>
                Cancelar
              </button>
              <button
                className="btn btn-p"
                type="submit"
                disabled={saving}
                data-testid="pedido-form-submit"
              >
                {saving ? 'Salvando...' : 'Salvar pedido'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
