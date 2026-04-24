import { useState } from 'react';
import { useCampanhasStore } from '../store/useCampanhasStore';
import { useCampanhasMutations } from '../hooks/useCampanhasMutations';
import type { CampanhaEnvio } from '../../../../types/domain';

function statusClass(status: string | undefined) {
  if (status === 'enviado') return 'tone-success';
  if (status === 'falhou') return 'tone-danger';
  return 'tone-muted';
}

export function FilaWhatsAppSection() {
  const envios = useCampanhasStore((s) => s.envios);
  const campanhas = useCampanhasStore((s) => s.campanhas);
  const openWaModal = useCampanhasStore((s) => s.openWaModal);
  const startLote = useCampanhasStore((s) => s.startLote);
  const { marcarEnviado, marcarFalhou, desfazer, marcarSelecionadosEnviados, marcarSelecionadosFalhou } =
    useCampanhasMutations();

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [filtroStatus, setFiltroStatus] = useState<string>('pendente');

  const pendentes = envios.filter((e) => (e.status ?? 'pendente') === 'pendente');
  const exibidos = filtroStatus === 'todos' ? envios : envios.filter((e) => (e.status ?? 'pendente') === filtroStatus);

  function toggleItem(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    if (selecionados.size === exibidos.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(exibidos.map((e) => e.id)));
    }
  }

  function campanhaNome(envio: CampanhaEnvio) {
    return campanhas.find((c) => c.id === envio.campanha_id)?.nome ?? '—';
  }

  function handlePreview(envio: CampanhaEnvio) {
    const camp = campanhas.find((c) => c.id === envio.campanha_id) ?? null;
    openWaModal(envio, camp);
  }

  function handleLoteWa() {
    const ids = pendentes.map((e) => e.id);
    startLote(ids);
  }

  return (
    <div className="card card-shell camp-section">
      <div className="camp-section-hdr">
        <div className="ct">Fila WhatsApp</div>
        <div className="camp-section-actions">
          <select
            className="field-input field-input--sm"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          >
            <option value="pendente">Pendentes ({pendentes.length})</option>
            <option value="enviado">Enviados</option>
            <option value="falhou">Falhou</option>
            <option value="todos">Todos</option>
          </select>
          {selecionados.size > 0 && (
            <>
              <button
                className="btn btn-sm btn-success"
                onClick={() => { void marcarSelecionadosEnviados([...selecionados]).then(() => setSelecionados(new Set())); }}
              >
                Enviados ({selecionados.size})
              </button>
              <button
                className="btn btn-sm btn-ghost tone-danger"
                onClick={() => { void marcarSelecionadosFalhou([...selecionados]).then(() => setSelecionados(new Set())); }}
              >
                Falhou ({selecionados.size})
              </button>
            </>
          )}
          {pendentes.length > 0 && (
            <button className="btn btn-sm btn-primary" onClick={handleLoteWa}>
              Enviar lote ({pendentes.length})
            </button>
          )}
        </div>
      </div>

      {exibidos.length === 0 ? (
        <div className="empty">
          <div className="ico">WA</div>
          <p>Nenhum envio {filtroStatus === 'todos' ? '' : `com status "${filtroStatus}"`}.</p>
        </div>
      ) : (
        <div className="camp-fila-table-wrap">
          <table className="camp-fila-table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" onChange={toggleTodos} checked={selecionados.size === exibidos.length && exibidos.length > 0} />
                </th>
                <th>Destino</th>
                <th>Campanha</th>
                <th>Status</th>
                <th>Data ref.</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {exibidos.map((envio) => (
                <tr key={envio.id} className={selecionados.has(envio.id) ? 'camp-row--sel' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selecionados.has(envio.id)}
                      onChange={() => toggleItem(envio.id)}
                    />
                  </td>
                  <td className="camp-fila-destino">{envio.destino ?? '—'}</td>
                  <td>{campanhaNome(envio)}</td>
                  <td>
                    <span className={`camp-status-badge ${statusClass(envio.status)}`}>
                      {envio.status ?? 'pendente'}
                    </span>
                  </td>
                  <td>{envio.data_ref ?? '—'}</td>
                  <td className="camp-fila-row-actions">
                    <button className="btn btn-xs btn-ghost" onClick={() => handlePreview(envio)}>
                      Preview
                    </button>
                    {(envio.status ?? 'pendente') === 'pendente' && (
                      <>
                        <button
                          className="btn btn-xs btn-success"
                          onClick={() => { void marcarEnviado(envio); }}
                        >
                          Enviado
                        </button>
                        <button
                          className="btn btn-xs btn-ghost tone-danger"
                          onClick={() => { void marcarFalhou(envio); }}
                        >
                          Falhou
                        </button>
                      </>
                    )}
                    {envio.status && envio.status !== 'pendente' && (
                      <button
                        className="btn btn-xs btn-ghost"
                        onClick={() => { void desfazer(envio); }}
                      >
                        Desfazer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
