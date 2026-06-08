import * as Tooltip from '@radix-ui/react-tooltip';
import { TrendingUp, DollarSign, Zap, History, Info, Layers, Database } from 'lucide-react';
import type { Produto } from '../../../../types/domain';
import type { ProdutoSaldo } from '../types';
import { formatCurrency, formatPercent, formatQuantity, toNumber, getPrecos, ProdutoInfoTable } from './ProdutoUtils';

type ProdutoResumoTabProps = {
  produto: Produto;
  saldo: ProdutoSaldo;
  sortedHist: any[];
  calculatedSaldo: { saldo: number; cm: number };
};

export function ProdutoResumoTab({ produto, saldo, sortedHist, calculatedSaldo }: ProdutoResumoTabProps) {
  const precos = getPrecos(produto);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <div className="flex flex-col gap-8">
        <article className="rf-dash-card h-fit">
          <div className="rf-dash-card__header flex-row items-center !mb-6">
            <div className="flex-1">
              <h2 className="rf-dash-card__title text-base">Resumo Comercial</h2>
            </div>
            <div className="p-2 bg-white/5 rounded-lg text-slate-400 border border-white/5">
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="mt-2">
            <ProdutoInfoTable
              rows={[
                { label: 'Custo Base', value: formatCurrency(precos.custo) },
                {
                  label: 'Venda Varejo',
                  value: precos.varejo > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{formatCurrency(precos.varejo)}</span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-black tracking-tighter border border-emerald-500/10">
                        +{formatPercent(precos.margemVarejo)}
                      </span>
                    </div>
                  ) : null
                },
                {
                  label: 'Venda Atacado',
                  value: precos.atacado > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{formatCurrency(precos.atacado)}</span>
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded font-black tracking-tighter border border-indigo-500/10">
                        +{formatPercent(precos.margemAtacado)}
                      </span>
                    </div>
                  ) : null
                },
                {
                  label: 'Qtde mínima',
                  value: toNumber(produto.qtmin) > 0 ? `${formatQuantity(toNumber(produto.qtmin))} ${produto.un}` : null
                }
              ]}
            />
          </div>
        </article>

        <article className="rf-dash-card h-fit">
          <div className="rf-dash-card__header flex-row items-center !mb-6">
            <div className="flex-1">
              <h2 className="rf-dash-card__title text-base">Formação de Preço</h2>
            </div>
            <div className="p-2 bg-white/5 rounded-lg text-slate-400 border border-white/5">
              <DollarSign size={14} />
            </div>
          </div>
          <div className="mt-2">
            <ProdutoInfoTable
              rows={[
                { 
                  label: (
                    <Tooltip.Provider>
                      <Tooltip.Root>
                        <Tooltip.Trigger className="flex items-center gap-1 cursor-help">
                          Custo de Compra <Info size={10} className="text-slate-600" />
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content className="bg-slate-900 text-white text-[10px] px-3 py-2 rounded-lg shadow-xl z-[200] max-w-[200px]" sideOffset={5}>
                            Preço líquido pago ao fornecedor, base para cálculos de impostos e margem.
                            <Tooltip.Arrow className="fill-slate-900" />
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  ), 
                  value: formatCurrency(precos.custo) 
                },
                { 
                  label: (
                    <Tooltip.Provider>
                      <Tooltip.Root>
                        <Tooltip.Trigger className="flex items-center gap-1 cursor-help">
                          Markup Varejo <Info size={10} className="text-slate-600" />
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content className="bg-slate-900 text-white text-[10px] px-3 py-2 rounded-lg shadow-xl z-[200]" sideOffset={5}>
                            Percentual adicionado sobre o custo para atingir o preço de venda.
                            <Tooltip.Arrow className="fill-slate-900" />
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  ), 
                  value: formatPercent(toNumber(produto.mkv)) 
                },
                { label: 'Markup Atacado', value: formatPercent(toNumber(produto.mka)) },
                { label: 'Desconto Máx Varejo', value: formatPercent(toNumber(produto.dv)) },
                { label: 'Desconto Máx Atacado', value: formatPercent(toNumber(produto.da)) }
              ]}
            />
          </div>
        </article>
      </div>

      <div className="flex flex-col gap-8">
        <article className="rf-dash-card h-fit">
          <div className="rf-dash-card__header flex-row items-center !mb-6">
            <div className="flex-1">
              <h2 className="rf-dash-card__title text-base">Gestão de Estoque</h2>
            </div>
            <div className="p-2 bg-white/5 rounded-lg text-slate-400 border border-white/5">
              <Layers size={14} />
            </div>
          </div>
          <div className="mt-2">
            <ProdutoInfoTable
              rows={[
                {
                  label: 'Saldo em Mão',
                  value: (
                    <span className={`font-bold ${calculatedSaldo.saldo <= 0 ? 'text-rose-400' : 'text-white'}`}>
                      {formatQuantity(calculatedSaldo.saldo)} {produto.un}
                    </span>
                  )
                },
                { label: 'Ponto de Pedido (Mín)', value: `${formatQuantity(toNumber(produto.emin))} ${produto.un}` },
                { label: 'Custo Médio (CM)', value: formatCurrency(calculatedSaldo.cm) }
              ]}
            />
          </div>
        </article>

        <article className="rf-dash-card h-fit">
          <div className="rf-dash-card__header flex-row items-center !mb-6">
            <div className="flex-1">
              <h2 className="rf-dash-card__title text-base">Cadastro Base</h2>
            </div>
            <div className="p-2 bg-white/5 rounded-lg text-slate-400 border border-white/5">
              <Database size={14} />
            </div>
          </div>
          <div className="mt-2">
            <ProdutoInfoTable
              rows={[
                { label: 'SKU', value: produto.sku },
                { label: 'Categoria', value: produto.cat },
                { label: 'Código Barras', value: produto.codigo_barras },
                { label: 'Ref. Fornecedor', value: produto.codigo_fornecedor }
              ]}
            />
          </div>
        </article>
      </div>

      <aside className="flex flex-col gap-8">
        <article className="rf-dash-card h-fit">
          <div className="rf-dash-card__header flex-row items-center !mb-6">
            <div className="flex-1">
              <h2 className="rf-dash-card__title text-base">Giro e Saúde</h2>
            </div>
            <div className="p-2 bg-white/5 rounded-lg text-slate-400 border border-white/5">
              <Zap size={14} />
            </div>
          </div>
          
          <div className="flex flex-col gap-5 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Última Venda</span>
              <span className="text-sm font-medium text-slate-400">{saldo.ult ? new Date(saldo.ult).toLocaleDateString() : 'Sem registros'}</span>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                Este produto mantém um giro constante. Recomendamos manter o estoque acima de <span className="text-white font-bold">{produto.emin} {produto.un}</span> para evitar ruptura.
              </p>
            </div>
          </div>
        </article>

        <article className="rf-dash-card h-fit">
          <div className="rf-dash-card__header flex-row items-center !mb-6">
            <div className="flex-1">
              <h2 className="rf-dash-card__title text-base">Histórico de Custo</h2>
            </div>
            <div className="p-2 bg-white/5 rounded-lg text-slate-400 border border-white/5">
              <History size={14} />
            </div>
          </div>
          <div className="p-0">
            {sortedHist.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Mês</th>
                      <th className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Preço</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHist.slice(0, 5).map((item, index) => (
                      <tr key={`${item.mes}-${index}`} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-slate-400 font-medium">
                          {String(item.mes ?? '').split('-').reverse().join('/')}
                        </td>
                        <td className="px-4 py-3 text-white font-bold">
                          {formatCurrency(toNumber(item.preco))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 italic text-xs font-medium">Sem histórico registrado</div>
            )}
          </div>
        </article>
      </aside>
    </div>
  );
}
