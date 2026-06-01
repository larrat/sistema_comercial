import { useMemo } from 'react';
import { DataTable, EmptyState } from '../../../shared/ui';
import type { Avaria } from '../types';
import { useEstoqueStore } from '../store/useEstoqueStore';
import { AlertCircle, Calendar } from 'lucide-react';

type EstoqueAvariasTableProps = {
  avarias: Avaria[];
};

const MOTIVO_LABELS: Record<string, string> = {
  quebra: 'Quebra física',
  defeito_fabrica: 'Defeito de fábrica',
  vencido: 'Vencido',
  furto: 'Furto/Roubo',
  outro: 'Outro'
};

const DESTINO_LABELS: Record<string, string> = {
  descarte: 'Descarte/Lixo',
  devolucao_fornecedor: 'Devolução fornecedor',
  doacao: 'Doação'
};

export function EstoqueAvariasTable({ avarias }: EstoqueAvariasTableProps) {
  const snapshot = useEstoqueStore((s) => s.snapshot);

  const data = useMemo(() => {
    return [...avarias].map((avaria) => {
      const produto = snapshot?.produtos.find((p) => p.id === avaria.produto_id);
      return {
        ...avaria,
        produtoNome: produto?.nome || 'Produto não encontrado',
        produtoSku: produto?.sku || ''
      };
    });
  }, [avarias, snapshot]);

  function fmtCurrency(val: number) {
    return Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('pt-BR').format(date);
    } catch {
      return dateStr;
    }
  }

  if (!data.length) {
    return (
      <EmptyState
        title="Nenhuma avaria registrada"
        description="Parabéns! Não há nenhum registro de perda por avaria ou quebra registrado nesta filial."
      />
    );
  }

  return (
    <DataTable
      columns={[
        {
          key: 'produto',
          header: 'Produto',
          render: (row) => (
            <div>
              <p className="font-semibold text-primary">{row.produtoNome}</p>
              {row.produtoSku && <p className="text-xs text-muted">SKU: {row.produtoSku}</p>}
            </div>
          )
        },
        {
          key: 'data',
          header: 'Data do Registro',
          render: (row) => (
            <span className="text-muted flex items-center gap-1.5 text-xs">
              <Calendar size={13} className="text-slate-500" />
              {formatDate(row.criado_em)}
            </span>
          )
        },
        {
          key: 'quantidade',
          header: 'Qtd. Perda',
          render: (row) => (
            <span className="font-bold text-rose-400">
              {row.quantidade} un
            </span>
          )
        },
        {
          key: 'custo',
          header: 'Custo Unitário',
          render: (row) => (
            <span className="text-slate-400 text-xs">
              {fmtCurrency(row.custo_unitario)}
            </span>
          )
        },
        {
          key: 'perda',
          header: 'Prejuízo/Perda',
          render: (row) => (
            <span className="font-black text-rose-500">
              {fmtCurrency(row.valor_custo_perda || row.quantidade * row.custo_unitario)}
            </span>
          )
        },
        {
          key: 'motivo',
          header: 'Motivo',
          render: (row) => (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {MOTIVO_LABELS[row.motivo] || row.motivo}
            </span>
          )
        },
        {
          key: 'destino',
          header: 'Destino',
          render: (row) => (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
              {DESTINO_LABELS[row.destino] || row.destino}
            </span>
          )
        },
        {
          key: 'observacoes',
          header: 'Observação',
          render: (row) => (
            <p className="text-xs text-slate-400 max-w-[200px] truncate" title={row.observacoes}>
              {row.observacoes || '—'}
            </p>
          )
        }
      ]}
      data={data}
    />
  );
}
