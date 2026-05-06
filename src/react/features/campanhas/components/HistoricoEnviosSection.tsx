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
      <div className="card card-shell camp-section">
        <div className="ct">Histórico de envios</div>
        <EmptyState title="Nenhum envio registrado ainda." compact />
      </div>
    );
  }

  return (
    <div className="card card-shell camp-section">
      <div className="ct">Histórico de envios</div>
      {grupos.map(([campId, items]) => {
        const campNome = campanhas.find((c) => c.id === campId)?.nome ?? 'Campanha removida';
        const qtdEnviados = items.filter((e) => e.status === 'enviado').length;
        const qtdFalhos = items.filter((e) => e.status === 'falhou').length;
        return (
          <div key={campId} className="camp-hist-grupo">
            <div className="camp-hist-grupo-hdr">
              <span className="camp-hist-nome">{campNome}</span>
              <StatusBadge tone="success">{qtdEnviados} enviados</StatusBadge>
              {qtdFalhos > 0 && <StatusBadge tone="danger">{qtdFalhos} falhos</StatusBadge>}
            </div>
            <div className="camp-hist-rows">
              {items.map((envio) => (
                <div key={envio.id} className="camp-hist-row">
                  <span className="camp-hist-destino">{envio.destino ?? '—'}</span>
                  <StatusBadge tone={envio.status === 'enviado' ? 'success' : 'danger'}>
                    {envio.status}
                  </StatusBadge>
                  <span className="camp-hist-data">{fmtDate(envio.enviado_em ?? envio.criado_em)}</span>
                  {envio.erro && (
                    <span className="camp-hist-erro">
                      <StatusBadge tone="danger">{envio.erro}</StatusBadge>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
