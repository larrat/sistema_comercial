import { Database, TrendingUp } from 'lucide-react';
import { ClienteInfoTable, formatDateLong } from '../ClienteProfileHelpers';

export function ClienteAbaMarketing({ cliente }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
      <section className="rf-card-premium p-6">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-400" />
          Atribuição e Origem
        </h3>
        <ClienteInfoTable
          rows={[
            { label: 'Origem (Source)', value: cliente.utm_source },
            { label: 'Mídia (Medium)', value: cliente.utm_medium },
            { label: 'Campanha', value: cliente.utm_campaign },
            { label: 'Termo/Keyword', value: cliente.utm_term },
            { label: 'Conteúdo Ads', value: cliente.utm_content },
            { label: 'Primeira Compra', value: formatDateLong(cliente.data_primeira_compra) }
          ]}
        />
      </section>

      <section className="rf-card-premium p-6">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          Comportamento (RFM)
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center p-4 bg-white/5 rounded-xl border border-white/5">
            <span className="text-sm font-medium text-slate-400">Recência</span>
            <span className="text-2xl font-black text-white mt-2">{cliente.score_rfm?.r || 0}</span>
            <span className="text-[10px] text-slate-500 mt-1">/ 5</span>
          </div>
          <div className="flex flex-col items-center p-4 bg-white/5 rounded-xl border border-white/5">
            <span className="text-sm font-medium text-slate-400">Frequência</span>
            <span className="text-2xl font-black text-white mt-2">{cliente.score_rfm?.f || 0}</span>
            <span className="text-[10px] text-slate-500 mt-1">/ 5</span>
          </div>
          <div className="flex flex-col items-center p-4 bg-white/5 rounded-xl border border-white/5">
            <span className="text-sm font-medium text-slate-400">Monetário</span>
            <span className="text-2xl font-black text-white mt-2">{cliente.score_rfm?.m || 0}</span>
            <span className="text-[10px] text-slate-500 mt-1">/ 5</span>
          </div>
        </div>
        <div className="mt-6 p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/10">
          <p className="text-xs text-indigo-400 font-medium leading-relaxed">
            Este cliente tem um alto valor monetário e recência média. Recomendamos uma campanha de reativação focada em itens de alto ticket para maximizar o LTV.
          </p>
        </div>
      </section>
    </div>
  );
}
