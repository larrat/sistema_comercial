import { useState } from 'react';
import type { Produto, PedidoItem } from '../../../../types/domain';

type Props = {
  produtos: Produto[];
  tipo: string;
  onAdd: (item: PedidoItem) => void;
};

function calcPrecoSugerido(prod: Produto, tipo: string): number {
  const mkv = prod.mkv ?? 0;
  const mka = prod.mka ?? 0;
  const pfa = prod.pfa ?? 0;
  const custo = prod.custo ?? 0;

  if (tipo === 'atacado' && (mka > 0 || pfa > 0)) {
    return pfa > 0 ? pfa : custo * (1 + mka / 100);
  }
  return mkv > 0 ? custo * (1 + mkv / 100) : custo;
}

export function PedidoItemAdd({ produtos, tipo, onAdd }: Props) {
  const [prodId, setProdId] = useState('');
  const [qty, setQty] = useState('1');
  const [preco, setPreco] = useState('');
  const [custo, setCusto] = useState('');
  const [orig, setOrig] = useState('estoque');
  const [error, setError] = useState<string | null>(null);

  function handleProdChange(id: string) {
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
      orig
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
    <div data-testid="pedido-item-add">
      {error && <div className="empty-inline" style={{ color: 'var(--color-danger)' }}>{error}</div>}
      <div className="fg c5 form-gap-bottom-xxs">
        <div>
          <div className="fl">Produto</div>
          <select
            className="inp sel"
            value={prodId}
            onChange={(e) => handleProdChange(e.target.value)}
            data-testid="pedido-item-prod"
          >
            <option value="">- selecione -</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="fl">Quantidade</div>
          <input
            className="inp"
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            data-testid="pedido-item-qty"
          />
        </div>
        <div>
          <div className="fl">Preço unit. (R$)</div>
          <input
            className="inp"
            type="number"
            step="0.01"
            placeholder="auto"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            data-testid="pedido-item-preco"
          />
        </div>
        <div>
          <div className="fl">Custo aplicado (R$)</div>
          <input
            className="inp"
            type="number"
            step="0.01"
            placeholder="custo do produto"
            value={custo}
            onChange={(e) => setCusto(e.target.value)}
            data-testid="pedido-item-custo"
          />
        </div>
        <div>
          <div className="fl">Origem</div>
          <select
            className="inp sel"
            value={orig}
            onChange={(e) => setOrig(e.target.value)}
            data-testid="pedido-item-orig"
          >
            <option value="estoque">Estoque</option>
            <option value="fornecedor">Fornecedor</option>
          </select>
        </div>
      </div>
      <div className="modal-actions modal-actions-inline">
        <button className="btn btn-sm" type="button" onClick={handleAdd} data-testid="pedido-item-add-btn">
          + Adicionar item
        </button>
      </div>
    </div>
  );
}
