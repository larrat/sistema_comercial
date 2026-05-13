import { useMemo, useState } from 'react';

import type { Pedido, PedidoItem } from '../../../../types/domain';
import { Modal, Button } from '../../../shared/ui';
import { usePedidoFormData } from '../hooks/usePedidoFormData';
import { usePedidoMutations } from '../hooks/usePedidoMutations';
import {
  calculatePedidoItemLucro,
  calculatePedidoItemMargem,
  calculatePedidoItemSubtotal,
  calculatePedidoLucroTotal,
  calculatePedidoTotal,
  formatPedidoCurrency
} from '../utils/pedidoRules';
import { PedidoItemAdd } from './PedidoItemAdd';

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
  const { produtos, loading: loadingProdutos, error: produtosError } = usePedidoFormData();
  const { atualizarItemPedido, removerItemPedido, adicionarItemPedido } = usePedidoMutations();
  const [editing, setEditing] = useState<EditingCell>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ item: PedidoItem; index: number } | null>(
    null
  );
  const [showAddModal, setShowAddModal] = useState(false);

  const total = useMemo(() => calculatePedidoTotal(itens), [itens]);
  const lucroTotal = useMemo(() => calculatePedidoLucroTotal(itens), [itens]);

  function startEdit(item: PedidoItem, index: number, field: EditableField) {
    if (!canEdit) return;
    setError(null);
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
      setError('Quantidade deve ser maior que zero.');
      return;
    }
    if (editing.field === 'preco' && next < 0) {
      setError('Preço deve ser maior ou igual a zero.');
      return;
    }

    const key = `${itemId}:${editing.field}`;
    setSavingKey(key);
    setError(null);
    try {
      const updated = await atualizarItemPedido(pedido.id, itemId, {
        quantidade: editing.field === 'qty' ? next : undefined,
        precoUnitario: editing.field === 'preco' ? next : undefined
      });
      onPedidoChanged?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar item do pedido.');
    } finally {
      setSavingKey(null);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    const itemId = getItemId(pedido, removeTarget.item, removeTarget.index);
    setSavingKey(`${itemId}:remove`);
    setError(null);
    try {
      const updated = await removerItemPedido(pedido.id, itemId);
      onPedidoChanged?.(updated);
      setRemoveTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover item do pedido.');
    } finally {
      setSavingKey(null);
    }
  }

  async function handleAdd(item: PedidoItem) {
    setSavingKey('add');
    setError(null);
    try {
      const updated = await adicionarItemPedido(pedido.id, {
        prodId: item.prodId,
        qty: item.qty,
        preco: item.preco
      });
      onPedidoChanged?.(updated);
      setShowAddModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar item ao pedido.');
    } finally {
      setSavingKey(null);
    }
  }

  function renderEditableCell(item: PedidoItem, index: number, field: EditableField) {
    const itemId = getItemId(pedido, item, index);
    const key = `${itemId}:${field}`;
    const currentValue = field === 'qty' ? item.qty : item.preco;
    const isEditing = editing?.itemId === itemId && editing.field === field;
    const isSaving = savingKey === key;

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
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm" data-testid="pedido-itens-tab">
      <div className="flex items-center justify-between p-6">
        <h3 className="text-base font-bold text-slate-900 m-0">Itens do pedido</h3>
        {!canEdit && (
          <span className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-slate-100">
            Somente leitura
          </span>
        )}
      </div>

      {error ? <div className="mx-6 mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-100">{error}</div> : null}

      {itens.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">Nenhum item adicionado a este pedido.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Produto</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Origem</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Qtd</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custo</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preço</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subtotal</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lucro</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Margem</th>
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
                    <tr key={itemId} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors" data-testid={`pedido-profile-item-${index}`}>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{item.nome}</td>
                      <td className="px-3 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.orig === 'estoque' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                          {item.orig === 'estoque' ? 'Estoque' : 'Fornecedor'}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm text-slate-600">{renderEditableCell(item, index, 'qty')}</td>
                      <td className="px-3 py-4 text-sm text-slate-400">{formatPedidoCurrency(item.custo)}</td>
                      <td className="px-3 py-4 text-sm text-slate-600 font-medium">{renderEditableCell(item, index, 'preco')}</td>
                      <td className="px-3 py-4 text-sm font-semibold text-slate-900">{formatPedidoCurrency(subtotal)}</td>
                      <td className={`px-3 py-4 text-sm font-semibold ${lucro >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatPedidoCurrency(lucro)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{margem.toFixed(1)}%</td>
                      {canEdit ? (
                        <td className="px-3 py-4">
                          {canRemove ? (
                            <button
                              className="text-slate-300 hover:text-rose-500 transition-colors"
                              type="button"
                              title="Remover item"
                              onClick={() => setRemoveTarget({ item, index })}
                              disabled={savingKey === `${itemId}:remove`}
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

          <div className="flex items-center justify-between p-6 bg-slate-50/30 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium">
              {itens.length} produto{itens.length !== 1 ? 's' : ''} · {itens.reduce((acc, i) => acc + Number(i.qty), 0)} unidades
            </span>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Lucro total</span>
                <span className="text-sm font-bold text-emerald-600">{formatPedidoCurrency(lucroTotal)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Total</span>
                <span className="text-sm font-bold text-slate-900">{formatPedidoCurrency(total)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {canEdit ? (
        <div className="flex items-center gap-4 p-6 bg-white border-t border-slate-100">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            disabled={loadingProdutos || savingKey === 'add'}
            loading={savingKey === 'add'}
          >
            Adicionar item
          </Button>
          {produtosError ? <span className="text-xs text-rose-500 font-medium">{produtosError}</span> : null}
        </div>
      ) : null}

      <Modal
        open={!!removeTarget}
        title="Remover item"
        onClose={() => setRemoveTarget(null)}
        closeOnOverlay={savingKey === null}
        footer={
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setRemoveTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleRemove()}
              loading={savingKey?.endsWith(':remove')}
              disabled={!!savingKey}
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
        closeOnOverlay={savingKey !== 'add'}
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
