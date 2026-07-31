import { motion } from 'framer-motion';
import { DollarSign, CheckCircle2, Clock, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';

type Props = {
  contratoValorTotal: number;
  cronograma: Array<{
    id: string;
    titulo: string;
    valor_faturamento: number;
    percentual_conclusao: number;
    data_fim?: string;
  }>;
  contasReceber?: Array<{
    id: string;
    valor: number;
    valor_recebido?: number;
    valor_em_aberto?: number;
    vencimento: string;
    status: string;
  }>;
};

function fmtCurrency(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PortalFinanceiroTab({ contratoValorTotal, cronograma, contasReceber = [] }: Props) {
  // Se houver contas_receber no banco, usamos elas. Senão, simulamos com base no cronograma orçado
  const temContasReais = contasReceber.length > 0;

  const totalPago = temContasReais
    ? contasReceber.reduce((acc, c) => acc + (Number(c.valor_recebido) || (c.status === 'recebido' ? Number(c.valor) : 0)), 0)
    : cronograma.filter((item) => item.percentual_conclusao === 100).reduce((acc, item) => acc + (item.valor_faturamento || 0), 0);

  const percentualPago = contratoValorTotal > 0 ? Math.min(100, Math.round((totalPago / contratoValorTotal) * 100)) : 0;
  const saldoEmAberto = Math.max(0, contratoValorTotal - totalPago);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-5 backdrop-blur-md">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Valor Contratado</span>
          <span className="text-2xl font-black text-white font-mono">{fmtCurrency(contratoValorTotal)}</span>
          <span className="text-[11px] text-slate-500 block mt-1">Total do Orçamento da Obra</span>
        </div>

        <div className="bg-slate-900/60 border border-emerald-500/20 rounded-3xl p-5 backdrop-blur-md">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">Total Medido / Quitado</span>
          <span className="text-2xl font-black text-emerald-400 font-mono">{fmtCurrency(totalPago)}</span>
          <span className="text-[11px] text-emerald-500/80 block mt-1">{percentualPago}% do contrato liquidado</span>
        </div>

        <div className="bg-slate-900/60 border border-amber-500/20 rounded-3xl p-5 backdrop-blur-md">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">Saldo a Faturar</span>
          <span className="text-2xl font-black text-amber-400 font-mono">{fmtCurrency(saldoEmAberto)}</span>
          <span className="text-[11px] text-amber-500/80 block mt-1">Conforme avanço do cronograma</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-bold text-white flex items-center gap-2">
            <DollarSign size={16} className="text-teal-400" />
            Evolução Financeira das Medições
          </span>
          <span className="text-xs font-mono font-bold text-teal-400">{percentualPago}% concluído</span>
        </div>
        <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentualPago}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
          />
        </div>
      </div>

      {/* Breakdown List */}
      <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <FileText size={16} className="text-slate-400" />
          {temContasReais ? 'Parcelas & Medições de Cobrança' : 'Medições por Etapas do Cronograma'}
        </h3>

        {temContasReais ? (
          <div className="space-y-3">
            {contasReceber.map((conta, i) => {
              const isPago = conta.status === 'recebido' || (conta.valor_em_aberto ?? 0) <= 0;
              return (
                <div
                  key={conta.id}
                  className="bg-black/30 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        isPago
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                          : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                      }`}
                    >
                      {isPago ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-white">Parcela #{i + 1}</span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar size={12} /> Vencimento:{' '}
                        {format(new Date(conta.vencimento), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="block text-base font-bold font-mono text-white">
                      {fmtCurrency(conta.valor)}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md inline-block ${
                        isPago
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {isPago ? 'Pago' : 'A Vencer'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : cronograma.length > 0 ? (
          <div className="space-y-3">
            {cronograma.map((item) => {
              const isConcluido = item.percentual_conclusao === 100;
              return (
                <div
                  key={item.id}
                  className="bg-black/30 border border-white/5 rounded-2xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        isConcluido
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isConcluido ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-white">{item.titulo}</span>
                      <span className="text-xs text-slate-400">
                        Avanço: {item.percentual_conclusao}%
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="block text-base font-bold font-mono text-white">
                      {fmtCurrency(item.valor_faturamento || 0)}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md inline-block ${
                        isConcluido
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-white/5 text-slate-400 border border-white/10'
                      }`}
                    >
                      {isConcluido ? 'Medição Liberada' : 'A Medir'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic text-center py-4">
            Detalhes das parcelas indisponíveis no momento.
          </p>
        )}
      </div>
    </motion.div>
  );
}
