import { useState } from 'react';
import type { Produto, PedidoItem } from '../../../../types/domain';
import { calcPrecoSugerido } from '../utils/pedidoRules';
import { Button, Input } from '../../../shared/ui';

type Props = {
  produtos: Produto[];
  tipo: string;
  onAdd: (item: PedidoItem) => void;
};

export function PedidoItemAdd({ produtos, tipo, onAdd }: Props) {
  const [prodId, setProdId] = useState('');
  const [qty, setQty] = useState('1');
  const [preco, setPreco] = useState('');
  const [custo, setCusto] = useState('');
  const [orig, setOrig] = useState('estoque');
  const [error, setError] = useState<string | null>(null);

  function handleProdChange(id: string) {
    const parentIds = new Set(produtos.map(p => p.produto_pai_id).filter(Boolean));
    const isParent = parentIds.has(id);
    
    setProdId(id);
    setError(null);
    if (!id) {
      setPreco('');
      setCusto('');
      return;
    }
    const prod = produtos.find((p) => p.id === id);
    if (!prod) return;
    const sugerido = calcPrecoSugerido(prod, tipo);
    if (!preco) setPreco(String(sugerido > 0 ? sugerido.toFixed(2) : ''));
    if (!custo) setCusto(String(prod.custo > 0 ? prod.custo.toFixed(2) : ''));
  }

  function handleAdd() {
    if (!prodId) {
      setError('Selecione um produto.');
      return;
    }
    const prod = produtos.find((p) => p.id === prodId);
    if (!prod) return;

    const qtyNum = parseFloat(qty) || 1;
    const precoNum = parseFloat(preco) || calcPrecoSugerido(prod, tipo);
    const custoNum = parseFloat(custo) || prod.custo || 0;

    onAdd({
      prodId,
      nome: prod.nome,
      un: prod.un,
      qty: qtyNum,
      preco: precoNum,
      custo: custoNum,
      custo_base: prod.custo,
      preco_base: calcPrecoSugerido(prod, tipo),
      orig,
      sku: prod.sku
    });

    // reset
    setProdId('');
    setQty('1');
    setPreco('');
    setCusto('');
    setOrig('estoque');
    setError(null);
  }

  return (
    <div data-testid="pedido-item-add" className="rf-glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
      {error && (
        <div className="text-xs font-bold text-rose-500 uppercase tracking-widest bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        <div className="md:col-span-4 rf-ui-form-field">
          <label className="rf-ui-form-field__label">Produto</label>
          <div className="rf-ui-form-field__control">
            <select
              className="rf-input-premium w-full"
              value={prodId}
              onChange={(e) => handleProdChange(e.target.value)}
              data-testid="pedido-item-prod"
            >
              <option value="">- selecione -</option>
              {(() => {
                const parentIds = new Set(produtos.map(p => p.produto_pai_id).filter(Boolean));
                return produtos
                  .filter(p => !parentIds.has(p.id))
                  .sort((a, b) => a.nome.localeCompare(b.nome))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} {p.sku ? `[${p.sku}]` : ''}
                    </option>
                  ));
              })()}
            </select>
          </div>
        </div>

        <div className="md:col-span-2">
          <Input
            label="Qtd"
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            data-testid="pedido-item-qty"
          />
        </div>

        <div className="md:col-span-2">
          <Input
            label="Preço Unit."
            type="number"
            step="0.01"
            placeholder="auto"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            data-testid="pedido-item-preco"
          />
        </div>

        <div className="md:col-span-2">
          <Input
            label="Custo Aplicado"
            type="number"
            step="0.01"
            placeholder="cus"
            value={custo}
            onChange={(e) => setCusto(e.target.value)}
            data-testid="pedido-item-custo"
          />
        </div>

        <div className="md:col-span-2 rf-ui-form-field">
          <label className="rf-ui-form-field__label">Origem</label>
          <div className="rf-ui-form-field__control">
            <select
              className="rf-input-premium w-full"
              value={orig}
              onChange={(e) => setOrig(e.target.value)}
              data-testid="pedido-item-orig"
            >
              <option value="estoque">Estoque</option>
              <option value="fornecedor">Fornecedor</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-2">
        <Button
          variant="primary"
          onClick={handleAdd}
          data-testid="pedido-item-add-btn"
          className="w-full md:w-auto"
        >
          Adicionar item ao pedido
        </Button>
      </div>
    </div>
  );
}
