import type { Produto } from '../../../../types/domain';

type Props = {
  produtos: Produto[];
  categorias: string[];
  catSelecionada: string;
  onCatChange: (_cat: string) => void;
};

export function ProdutoMetrics({ produtos, categorias, catSelecionada, onCatChange }: Props) {
  const comPrecificacao = produtos.filter((p) => (p.mkv ?? 0) > 0).length;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <div className="met">
        <div className="ml">Produtos</div>
        <div className="mv">{produtos.length}</div>
      </div>
      <div className="met">
        <div className="ml">Categorias</div>
        <div className="mv">{categorias.length}</div>
      </div>
      <div className="met">
        <div className="ml">Com precificação</div>
        <div className="mv">{comPrecificacao}</div>
      </div>

      <select
        className="sel"
        value={catSelecionada}
        onChange={(e) => onCatChange(e.target.value)}
        style={{ marginLeft: 'auto' }}
      >
        <option value="">Todas as categorias</option>
        {categorias.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
