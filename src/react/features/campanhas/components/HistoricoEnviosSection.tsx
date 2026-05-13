import { EmptyState, StatusBadge } from '../../../shared/ui';
import { useCampanhasStore } from '../store/useCampanhasStore';

function fmtDate(v: string | null | undefined): string {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return v;
  }
}

export function HistoricoEnviosSection() {
  const envios = useCampanhasStore((s) => s.envios);
  const campanhas = useCampanhasStore((s) => s.campanhas);

  const concluidos = envios.filter((e) => e.status === 'enviado' || e.status === 'falhou');

  const byCampanha: Record<string, typeof concluidos> = {};
  concluidos.forEach((e) => {
    const key = e.campanha_id ?? '__sem__';
    if (!byCampanha[key]) byCampanha[key] = [];
    byCampanha[key].push(e);
  });

  const grupos = Object.entries(byCampanha).sort(([, a], [, b]) => {
    const dateA = a[0]?.enviado_em ?? a[0]?.criado_em ?? '';
    const dateB = b[0]?.enviado_em ?? b[0]?.criado_em ?? '';
    return dateB.localeCompare(dateA);
  });

  if (concluidos.length === 0) {
    return (
      <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-sm overflow-hidden">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-500 rounded-full" />
          Histórico de envios
        </h3>
        <EmptyState title="Nenhum envio registrado ainda." compact />
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
        <div className="w-1 h-4 bg-blue-500 rounded-full" />
        Histórico de envios
      </h3>
      {grupos.map(([campId, items]) => {
        const campNome = campanhas.find((c) => c.id === campId)?.nome ?? 'Campanha removida';
        const qtdEnviados = items.filter((e) => e.status === 'enviado').length;
        const qtdFalhos = items.filter((e) => e.status === 'falhou').length;
        return (
          <div key={campId} className="mb-8 last:mb-0">
            <div className="flex items-center justify-between gap-4 mb-4 bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="font-bold text-white">{campNome}</span>
              <div className="flex gap-2">
                <StatusBadge tone="success">{qtdEnviados} enviados</StatusBadge>
                {qtdFalhos > 0 && <StatusBadge tone="danger">{qtdFalhos} falhos</StatusBadge>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((envio) => (
                <div key={envio.id} className="bg-slate-950 border border-white/5 rounded-lg p-3 flex flex-col gap-2 shadow-sm hover:border-white/10 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-300 truncate">{envio.destino ?? '—'}</span>
                    <StatusBadge tone={envio.status === 'enviado' ? 'success' : 'danger'}>
                      {envio.status}
                    </StatusBadge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 font-medium">{fmtDate(envio.enviado_em ?? envio.criado_em)}</span>
                    {envio.erro && (
                      <span className="max-w-[120px]">
                        <StatusBadge tone="danger">{envio.erro}</StatusBadge>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
