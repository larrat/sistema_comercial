import { useNavigate } from 'react-router-dom';
import { useContratosData } from '../hooks/useContratosData';
import { LucideFileSignature, LucidePlus, LucideSearch } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ContratosPage() {
  const { data: contratos = [], isLoading } = useContratosData();
  const navigate = useNavigate();

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ativo': return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
      case 'concluido': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'cancelado': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'suspenso': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="flex h-full flex-col p-6 overflow-y-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <LucideFileSignature className="h-6 w-6 text-teal-500" />
            Contratos Ativos
          </h1>
          <p className="text-sm text-slate-400">
            Gerencie os contratos de reforma e obras.
          </p>
        </div>
      </header>

      {/* Stats/Metrics can go here */}

      <div className="rounded-xl border border-white/10 bg-slate-900/50 p-1">
        <div className="p-4 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-4 w-4" />
            <input 
              placeholder="Buscar contrato ou cliente…"
              className="w-full bg-black/20 border border-white/5 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 focus-visible:ring-1 focus-visible:ring-teal-500/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-y border-white/5 bg-white/[0.02] text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Contrato / Obra</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Início</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500">Carregando contratos...</td>
                </tr>
              )}
              {contratos.map(c => (
                <tr 
                  key={c.id} 
                  onClick={() => navigate(`/app/contratos/${c.id}`)}
                  className="group cursor-pointer transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-4 font-medium text-white">{c.titulo}</td>
                  <td className="px-4 py-4">{c.cliente?.nome || 'Desconhecido'}</td>
                  <td className="px-4 py-4">
                    {c.data_inicio ? format(new Date(c.data_inicio), "dd 'de' MMM, yyyy", { locale: ptBR }) : '-'}
                  </td>
                  <td className="px-4 py-4 text-emerald-400 font-medium">
                    {formatCurrency(Number(c.valor_total))}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 rounded-full border text-sm font-medium text-slate-400${getStatusColor(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!isLoading && contratos.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">Nenhum contrato encontrado nesta filial.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
