import { useState, useMemo } from 'react';
import { useRelatoriosStore } from '../store/useRelatoriosStore';
import { Card, Typography, EmptyState, Input } from '../../../shared/ui';
import { fmtBRL } from '../../../shared/lib/formatters';

export function PivotTable() {
  const pedidos = useRelatoriosStore((s) => s.pedidos);
  
  const [rowField, setRowField] = useState('cliente_nome');
  const [colField, setColField] = useState('mes');
  const [metric, setMetric] = useState('total');

  const data = useMemo(() => {
    if (!pedidos || pedidos.length === 0) return null;

    const rows = new Set<string>();
    const cols = new Set<string>();
    const values: Record<string, Record<string, number>> = {};

    pedidos.forEach(p => {
      let rVal = '';
      let cVal = '';

      // Extratores
      const extract = (field: string) => {
        if (field === 'cliente_nome') return p.cliente_nome || 'Desconhecido';
        if (field === 'filial_nome') return p.filial_nome || 'Desconhecida';
        if (field === 'vendedor_nome') return p.vendedor_nome || 'Desconhecido';
        if (field === 'mes') {
          if (!p.data) return 'S/Data';
          const d = new Date(p.data);
          return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}`;
        }
        if (field === 'status') return p.status || 'aberto';
        return 'Outro';
      };

      rVal = extract(rowField);
      cVal = extract(colField);

      rows.add(rVal);
      cols.add(cVal);

      if (!values[rVal]) values[rVal] = {};
      if (!values[rVal][cVal]) values[rVal][cVal] = 0;

      if (metric === 'total') {
        values[rVal][cVal] += Number(p.total || 0);
      } else if (metric === 'count') {
        values[rVal][cVal] += 1;
      }
    });

    const rowsArr = Array.from(rows).sort();
    const colsArr = Array.from(cols).sort();

    return { rows: rowsArr, cols: colsArr, values };
  }, [pedidos, rowField, colField, metric]);

  if (!data) {
    return <EmptyState title="Sem dados" description="Não há pedidos no período selecionado." />;
  }

  const fmt = (val: number | undefined) => {
    if (!val) return '-';
    if (metric === 'total') return fmtBRL(val);
    return val.toString();
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <Card variant="glass" className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm text-slate-400 block mb-1">Linhas</label>
          <select 
            className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500/50"
            value={rowField} 
            onChange={(e) => setRowField(e.target.value)}
          >
            <option value="cliente_nome">Cliente</option>
            <option value="vendedor_nome">Vendedor</option>
            <option value="filial_nome">Filial</option>
            <option value="mes">Mês</option>
            <option value="status">Status</option>
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-sm text-slate-400 block mb-1">Colunas</label>
          <select 
            className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500/50"
            value={colField} 
            onChange={(e) => setColField(e.target.value)}
          >
            <option value="mes">Mês</option>
            <option value="filial_nome">Filial</option>
            <option value="status">Status</option>
            <option value="vendedor_nome">Vendedor</option>
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-sm text-slate-400 block mb-1">Métrica</label>
          <select 
            className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500/50"
            value={metric} 
            onChange={(e) => setMetric(e.target.value)}
          >
            <option value="total">Soma do Faturamento (R$)</option>
            <option value="count">Contagem de Pedidos</option>
          </select>
        </div>
      </Card>

      <Card variant="glass" className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr>
              <th className="px-4 py-3 border-b border-white/5 text-slate-400 font-medium">{rowField.toUpperCase()}</th>
              {data.cols.map(c => (
                <th key={c} className="px-4 py-3 border-b border-white/5 text-slate-400 font-medium text-right">{c}</th>
              ))}
              <th className="px-4 py-3 border-b border-white/5 text-slate-400 font-bold text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map(r => {
              let rowTotal = 0;
              return (
                <tr key={r} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 border-b border-white/5 text-slate-200">{r}</td>
                  {data.cols.map(c => {
                    const val = data.values[r][c] || 0;
                    rowTotal += val;
                    return (
                      <td key={c} className="px-4 py-3 border-b border-white/5 text-slate-300 text-right">
                        {fmt(val)}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 border-b border-white/5 text-white font-bold text-right bg-white/[0.01]">
                    {fmt(rowTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-white/[0.02]">
              <td className="px-4 py-3 text-slate-200 font-bold">TOTAL GERAL</td>
              {data.cols.map(c => {
                let colTotal = 0;
                data.rows.forEach(r => colTotal += (data.values[r][c] || 0));
                return (
                  <td key={c} className="px-4 py-3 text-white font-bold text-right">
                    {fmt(colTotal)}
                  </td>
                );
              })}
              <td className="px-4 py-3 text-teal-400 font-bold text-right">
                {fmt(data.rows.reduce((acc, r) => {
                  return acc + data.cols.reduce((sum, c) => sum + (data.values[r][c] || 0), 0);
                }, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
}
