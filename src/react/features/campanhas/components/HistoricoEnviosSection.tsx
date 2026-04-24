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

  const enviados = envios.filter((e) => e.status === 'enviado' || e.status === 'falhou');

  const byCampanha: Record<string, typeof enviados> = {};
  enviados.forEach((e) => {
    const key = e.campanha_id ?? '__sem__';
    if (!byCampanha[key]) byCampanha[key] = [];
    byCampanha[key].push(e);
  });

  const grupos = Object.entries(byCampanha).sort(([, a], [, b]) => {
    const dateA = a[0]?.enviado_em ?? a[0]?.criado_em ?? '';
    const dateB = b[0]?.enviado_em ?? b[0]?.criado_em ?? '';
    return dateB.localeCompare(dateA);
  });

  if (enviados.length === 0) {
    return (
      <div className="card card-shell camp-section">
        <div className="ct">Histórico de envios</div>
        <div className="empty">
          <div className="ico">HI</div>
          <p>Nenhum envio registrado ainda.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card card-shell camp-section">
      <div className="ct">Histórico de envios</div>
      {grupos.map(([campId, items]) => {
        const campNome = campanhas.find((c) => c.id === campId)?.nome ?? 'Campanha removida';
        const enviados = items.filter((e) => e.status === 'enviado').length;
        const falhos = items.filter((e) => e.status === 'falhou').length;
        return (
          <div key={campId} className="camp-hist-grupo">
            <div className="camp-hist-grupo-hdr">
              <span className="camp-hist-nome">{campNome}</span>
              <span className="camp-hist-resumo tone-success">{enviados} enviados</span>
              {falhos > 0 && <span className="camp-hist-resumo tone-danger">{falhos} falhos</span>}
            </div>
            <div className="camp-hist-rows">
              {items.map((envio) => (
                <div key={envio.id} className="camp-hist-row">
                  <span className="camp-hist-destino">{envio.destino ?? '—'}</span>
                  <span className={`camp-status-badge ${envio.status === 'enviado' ? 'tone-success' : 'tone-danger'}`}>
                    {envio.status}
                  </span>
                  <span className="camp-hist-data">{fmtDate(envio.enviado_em ?? envio.criado_em)}</span>
                  {envio.erro && <span className="camp-hist-erro tone-danger">{envio.erro}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
