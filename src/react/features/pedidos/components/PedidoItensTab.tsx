import { useMemo, useState } from 'react';

import type { Pedido, PedidoItem } from '../../../../types/domain';
import { Modal } from '../../../shared/ui';
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
          className="inp pedido-inline-input"
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
    <section className="rf-cliente-profile__card" data-testid="pedido-itens-tab">
      <div className="rf-cliente-profile__card-head">
        <div>
          <h3 className="rf-cliente-profile__card-title">Itens do pedido</h3>
          <p className="rf-cliente-profile__card-subtitle">
            {canEdit
              ? 'Admin pode ajustar quantidade, preço, remover ou adicionar itens.'
              : 'Tabela somente leitura para este usuário ou status.'}
          </p>
        </div>
      </div>

      {error ? <div className="empty-inline form-warn-inline">{error}</div> : null}

      {itens.length === 0 ? (
        <div className="empty-inline">Nenhum item.</div>
      ) : (
        <>
          <div className="rf-cliente-profile__table-wrap">
            <table className="rf-cliente-profile__table ped-items-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Origem</th>
                  <th>Qtd</th>
                  <th>Custo</th>
                  <th>Preço</th>
                  <th>Subtotal</th>
                  <th>Lucro</th>
                  <th>Margem</th>
                  {canEdit ? <th /> : null}
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
                    <tr key={itemId} data-testid={`pedido-profile-item-${index}`}>
                      <td className="table-cell-strong">{item.nome}</td>
                      <td>
                        <span className={`bdg ${item.orig === 'estoque' ? 'bg' : 'bb'}`}>
                          {item.orig === 'estoque' ? 'Estoque' : 'Fornecedor'}
                        </span>
                      </td>
                      <td>{renderEditableCell(item, index, 'qty')}</td>
                      <td className="table-cell-muted">{formatPedidoCurrency(item.custo)}</td>
                      <td>{renderEditableCell(item, index, 'preco')}</td>
                      <td className="table-cell-strong">{formatPedidoCurrency(subtotal)}</td>
                      <td
                        className={`table-cell-strong ${
                          lucro >= 0 ? 'table-cell-success' : 'table-cell-danger'
                        }`}
                      >
                        {formatPedidoCurrency(lucro)}
                      </td>
                      <td className="table-cell-strong">{margem.toFixed(1)}%</td>
                      {canEdit ? (
                        <td>
                          {canRemove ? (
                            <button
                              className="btn btn-sm"
                              type="button"
                              title="Remover item"
                              onClick={() => setRemoveTarget({ item, index })}
                              disabled={savingKey === `${itemId}:remove`}
                            >
                              Remover
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

          <div className="panel ped-total-panel">
            <div className="fb">
              <span className="ped-total-label">Total do pedido</span>
              <span className="ped-total-value">
                {formatPedidoCurrency(total)} | Lucro {formatPedidoCurrency(lucroTotal)}
              </span>
            </div>
          </div>
        </>
      )}

      {canEdit ? (
        <div className="modal-actions modal-actions-inline pedido-items-actions">
          <button
            className="btn btn-sm btn-p"
            type="button"
            onClick={() => setShowAddModal(true)}
            disabled={loadingProdutos || savingKey === 'add'}
          >
            {savingKey === 'add' ? 'Adicionando...' : 'Adicionar item'}
          </button>
          {produtosError ? <span className="table-cell-muted">{produtosError}</span> : null}
        </div>
      ) : null}

      <Modal
        open={!!removeTarget}
        title="Remover item"
        onClose={() => setRemoveTarget(null)}
        closeOnOverlay={savingKey === null}
        footer={
          <div className="modal-actions">
            <button className="btn" type="button" onClick={() => setRemoveTarget(null)}>
              Cancelar
            </button>
            <button
              className="btn btn-r"
              type="button"
              onClick={() => void handleRemove()}
              disabled={!!savingKey}
            >
              {savingKey?.endsWith(':remove') ? 'Removendo...' : 'Remover'}
            </button>
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
