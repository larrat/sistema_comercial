import { useState } from 'react';
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
  const [status, setStatus] = useState(
    normalizePedStatus(initialPedido?.status) || 'orcamento'
  );
  const [pgto, setPgto] = useState(initialPedido?.pgto ?? 'a_vista');
  const [prazo, setPrazo] = useState(initialPedido?.prazo ?? 'imediato');
  const [tipo, setTipo] = useState(initialPedido?.tipo ?? 'varejo');
  const [obs, setObs] = useState(initialPedido?.obs ?? '');
  const [itens, setItens] = useState<PedidoItem[]>(existingItens);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addItem(item: PedidoItem) {
    setItens((prev) => [...prev, item]);
  }

  function removeItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cliTrimmed = cli.trim();
    if (!cliTrimmed) {
      setError('Cliente é obrigatório.');
      return;
    }
    const clienteFound = findClienteByInput(clientes, cliTrimmed);
    if (!clienteFound) {
      setError('Cliente inválido. Escolha um cliente cadastrado na lista.');
      return;
    }
    if (itens.length === 0) {
      setError('Adicione ao menos 1 item ao pedido.');
      return;
    }

    const rca = rcas.find((r) => r.id === rcaId);
    const rcaNome = rca?.nome ?? clienteFound.rca_nome ?? '';
    const total = itens.reduce((a, i) => a + i.qty * i.preco, 0);
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
      total
    };

    setSaving(true);
    try {
      await submitPedido(pedidoInput);
      onSaved(pedidoInput as unknown as Pedido);
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
      <div className="modal-shell-head">
        <div className="mt">{titulo}</div>
      </div>

      {formLoading && <div className="empty"><p>Carregando dados do formulário...</p></div>}
      {formError && <div className="empty"><p>{formError}</p></div>}

      {!formLoading && !formError && (
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="modal-shell-body">
            {error && (
              <div className="empty-inline" style={{ color: 'var(--color-danger)', marginBottom: '0.5rem' }}>
                {error}
              </div>
            )}

            <div className="fg c3">
              <div>
                <div className="fl">Cliente *</div>
                <input
                  className="inp"
                  list="ped-form-cli-dl"
                  placeholder="Nome do cliente"
                  value={cli}
                  onChange={(e) => setCli(e.target.value)}
                  data-testid="pedido-form-cli"
                />
                <datalist id="ped-form-cli-dl">
                  {clientes.map((c) => (
                    <option key={c.id} value={c.nome} />
                  ))}
                </datalist>
              </div>
              <div>
                <div className="fl">RCA / Vendedor</div>
                <select
                  className="inp sel"
                  value={rcaId}
                  onChange={(e) => setRcaId(e.target.value)}
                  data-testid="pedido-form-rca"
                >
                  <option value="">Sem RCA</option>
                  {rcas.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="fl">Data</div>
                <input
                  className="inp"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  data-testid="pedido-form-data"
                />
              </div>
              <div>
                <div className="fl">Status</div>
                <select
                  className="inp sel"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  data-testid="pedido-form-status"
                >
                  <option value="orcamento">Orçamento</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="em_separacao">Em separação</option>
                  <option value="entregue">Entregue</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>

            <div className="fg c3">
              <div>
                <div className="fl">Pagamento</div>
                <select
                  className="inp sel"
                  value={pgto}
                  onChange={(e) => setPgto(e.target.value)}
                  data-testid="pedido-form-pgto"
                >
                  <option value="a_vista">À vista</option>
                  <option value="pix">PIX</option>
                  <option value="boleto">Boleto</option>
                  <option value="cartao">Cartão</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <div className="fl">Prazo</div>
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
              </div>
              <div>
                <div className="fl">Tipo de venda</div>
                <select
                  className="inp sel"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  data-testid="pedido-form-tipo"
                >
                  <option value="varejo">Varejo</option>
                  <option value="atacado">Atacado</option>
                </select>
              </div>
            </div>

            <PedidoItemsSection
              itens={itens}
              produtos={produtos}
              tipo={tipo}
              onAdd={addItem}
              onRemove={removeItem}
            />

            <div className="fg form-gap-top">
              <div>
                <div className="fl">Observações</div>
                <textarea
                  className="inp"
                  rows={2}
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  data-testid="pedido-form-obs"
                />
              </div>
            </div>
          </div>

          <div className="modal-shell-foot">
            <div className="modal-actions">
              <button
                className="btn"
                type="button"
                onClick={onCancel}
                disabled={saving}
              >
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
