import { useMemo, useState } from 'react';

import type { Pedido, PedidoItem } from '../../../../types/domain';
import { Modal, Button } from '../../../shared/ui';
import { usePedidoMutations } from '../hooks/usePedidosQuery';
import { useProdutosQuery } from '../../produtos/hooks/useProdutosQuery';
import {
  calculatePedidoItemLucro,
  calculatePedidoItemMargem,
  calculatePedidoItemSubtotal,
  calculatePedidoLucroTotal,
  calculatePedidoTotal,
  formatPedidoCurrency
} from '../utils/pedidoRules';
import { PedidoItemAdd } from './PedidoItemAdd';
import { toast } from 'sonner';

type EditableField = 'qty' | 'preco';

type Props = {
  pedido: Pedido;
  itens: PedidoItem[];
  canEdit: boolean;
  onPedidoChanged?: (pedido: Pedido) => void;
};

type EditingCell = {
  itemId: string;
  field: EditableField;
  value: string;
} | null;

function getItemId(pedido: Pedido, item: PedidoItem, index: number): string {
  return item.item_id || `${pedido.id}:${item.linha || index + 1}`;
}

function normalizeNumber(value: string): number {
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function PedidoItensTab({ pedido, itens, canEdit, onPedidoChanged }: Props) {
  // Usamos a query de produtos que já criamos no usePedidosQuery ou importamos de produtos
  const { data: produtosPage, isLoading: isLoadingProdutos } = useProdutosQuery({}, 1, 1000);
  const { updateItem, removeItem, addItem } = usePedidoMutations();
  const [editing, setEditing] = useState<EditingCell>(null);
  const [removeTarget, setRemoveTarget] = useState<{ item: PedidoItem; index: number } | null>(
    null
  );
  const [showAddModal, setShowAddModal] = useState(false);

  const produtos = produtosPage?.rows || [];
  const total = useMemo(() => calculatePedidoTotal(itens), [itens]);
  const lucroTotal = useMemo(() => calculatePedidoLucroTotal(itens), [itens]);

  function startEdit(item: PedidoItem, index: number, field: EditableField) {
    if (!canEdit) return;
    setEditing({
      itemId: getItemId(pedido, item, index),
      field,
      value: String(field === 'qty' ? item.qty : item.preco)
    });
  }

  async function commitEdit(item: PedidoItem, index: number) {
    if (!editing) return;
    const itemId = getItemId(pedido, item, index);
    if (editing.itemId !== itemId) return;

    const previous = editing.field === 'qty' ? item.qty : item.preco;
    const next = normalizeNumber(editing.value);
    setEditing(null);

    if (next === previous) return;
    if (editing.field === 'qty' && next <= 0) {
      toast.error('Quantidade deve ser maior que zero.');
      return;
    }
    if (editing.field === 'preco' && next < 0) {
      toast.error('Preço deve ser maior ou igual a zero.');
      return;
    }

    updateItem.mutate({
      pedidoId: pedido.id,
      itemId,
      patch: {
        quantidade: editing.field === 'qty' ? next : undefined,
        precoUnitario: editing.field === 'preco' ? next : undefined
      }
    }, {
      onSuccess: (updated) => {
        onPedidoChanged?.(updated as unknown as Pedido);
      }
    });
  }

  async function handleRemove() {
    if (!removeTarget) return;
    const itemId = getItemId(pedido, removeTarget.item, removeTarget.index);
    removeItem.mutate({
      pedidoId: pedido.id,
      itemId
    }, {
      onSuccess: (updated) => {
        onPedidoChanged?.(updated as unknown as Pedido);
        setRemoveTarget(null);
      }
    });
  }

  async function handleAdd(item: PedidoItem) {
    addItem.mutate({
      pedidoId: pedido.id,
      item: {
        prodId: item.prodId,
        qty: item.qty,
        preco: item.preco
      }
    }, {
      onSuccess: (updated) => {
        onPedidoChanged?.(updated as unknown as Pedido);
        setShowAddModal(false);
      }
    });
  }

  function renderEditableCell(item: PedidoItem, index: number, field: EditableField) {
    const itemId = getItemId(pedido, item, index);
    const isEditing = editing?.itemId === itemId && editing.field === field;
    const isSaving = updateItem.isPending && updateItem.variables?.itemId === itemId;

    if (!canEdit) {
      return field === 'qty' ? `${item.qty} ${item.un}` : formatPedidoCurrency(item.preco);
    }

    if (isEditing) {
      return (
        <input
          className="rf-input-premium !py-1 !px-2 !text-xs !h-7 !min-w-[80px]"
          autoFocus
          type="number"
          min={field === 'qty' ? 0.01 : 0}
          step={field === 'qty' ? 1 : 0.01}
          value={editing.value}
          onChange={(event) => setEditing({ ...editing, value: event.target.value })}
          onBlur={() => void commitEdit(item, index)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setEditing(null);
              return;
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        />
      );
    }

    return (
      <button
        className="pedido-inline-value"
        type="button"
        onClick={() => startEdit(item, index, field)}
      >
        {field === 'qty' ? `${item.qty} ${item.un}` : formatPedidoCurrency(item.preco)}
        {isSaving ? <span className="pedido-inline-saving">Salvando...</span> : null}
      </button>
    );
  }

  return (
    <section className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden shadow-sm" data-testid="pedido-itens-tab">
      <div className="flex items-center justify-between p-6">
        <h3 className="text-base font-bold text-white m-0">Itens do pedido</h3>
        {!canEdit && (
          <span className="bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-white/10">
            Somente leitura
          </span>
        )}
      </div>

      {itens.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">Nenhum item adicionado a este pedido.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-y border-white/5 bg-white/5">
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Produto</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Origem</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Qtd</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Custo</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Preço</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subtotal</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lucro</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Margem</th>
                  {canEdit ? <th className="px-3 py-3" /> : null}
                </tr>
              </thead>
              <tbody>
                {itens.map((item, index) => {
                  const subtotal = calculatePedidoItemSubtotal(item);
                  const lucro = calculatePedidoItemLucro(item);
                  const margem = calculatePedidoItemMargem(item);
                  const itemId = getItemId(pedido, item, index);
                  const canRemove = canEdit && itens.length > 1;

                  return (
                    <tr key={itemId} className="border-b border-white/5 hover:bg-white/5 transition-colors" data-testid={`pedido-profile-item-${index}`}>
                      <td className="px-6 py-4 text-sm font-semibold text-white">{item.nome}</td>
                      <td className="px-3 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.orig === 'estoque' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                          {item.orig === 'estoque' ? 'Estoque' : 'Fornecedor'}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm text-slate-300">{renderEditableCell(item, index, 'qty')}</td>
                      <td className="px-3 py-4 text-sm text-slate-500">{formatPedidoCurrency(item.custo)}</td>
                      <td className="px-3 py-4 text-sm text-slate-300 font-medium">{renderEditableCell(item, index, 'preco')}</td>
                      <td className="px-3 py-4 text-sm font-semibold text-white">{formatPedidoCurrency(subtotal)}</td>
                      <td className={`px-3 py-4 text-sm font-semibold ${lucro >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatPedidoCurrency(lucro)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-400">{margem.toFixed(1)}%</td>
                      {canEdit ? (
                        <td className="px-3 py-4">
                          {canRemove ? (
                            <button
                              className="text-slate-300 hover:text-rose-500 transition-colors"
                              type="button"
                              title="Remover item"
                              onClick={() => setRemoveTarget({ item, index })}
                              disabled={removeItem.isPending && removeItem.variables?.itemId === itemId}
                            >
                              ✕
                            </button>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between p-6 bg-white/5 border-t border-white/5">
            <span className="text-xs text-slate-500 font-medium">
              {itens.length} produto{itens.length !== 1 ? 's' : ''} · {itens.reduce((acc, i) => acc + Number(i.qty), 0)} unidades
            </span>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Lucro total</span>
                <span className="text-sm font-bold text-emerald-400">{formatPedidoCurrency(lucroTotal)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Total</span>
                <span className="text-sm font-bold text-white">{formatPedidoCurrency(total)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {canEdit ? (
        <div className="flex items-center gap-4 p-6 bg-slate-900 border-t border-white/5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            disabled={isLoadingProdutos || addItem.isPending}
            loading={addItem.isPending}
          >
            Adicionar item
          </Button>
        </div>
      ) : null}

      <Modal
        open={!!removeTarget}
        title="Remover item"
        onClose={() => setRemoveTarget(null)}
        closeOnOverlay={!removeItem.isPending}
        footer={
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setRemoveTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleRemove()}
              loading={removeItem.isPending}
            >
              Remover
            </Button>
          </div>
        }
      >
        {removeTarget ? (
          <div className="rf-ui-stack">
            <p>
              Remover <strong>{removeTarget.item.nome}</strong> do pedido?
            </p>
            <p className="table-cell-muted">
              Quantidade atual: {removeTarget.item.qty} {removeTarget.item.un}. Subtotal removido:{' '}
              {formatPedidoCurrency(calculatePedidoItemSubtotal(removeTarget.item))}.
            </p>
            <p className="table-cell-muted">O total do pedido será atualizado.</p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={showAddModal}
        title="Adicionar item"
        onClose={() => setShowAddModal(false)}
        closeOnOverlay={!addItem.isPending}
      >
        <div className="rf-ui-stack">
          <p className="table-cell-muted">
            Selecione um produto e confirme. O total será atualizado pelo servidor.
          </p>
          <PedidoItemAdd produtos={produtos} tipo={pedido.tipo ?? 'varejo'} onAdd={handleAdd} />
        </div>
      </Modal>
    </section>
  );
}
