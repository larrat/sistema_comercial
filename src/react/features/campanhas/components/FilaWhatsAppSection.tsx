import { useState } from 'react';
import { StatusBadge, FilterBar } from '../../../shared/ui';
import { useCampanhasStore } from '../store/useCampanhasStore';
import { useCampanhasMutations } from '../hooks/useCampanhasMutations';
import type { CampanhaEnvio } from '../../../../types/domain';

function statusTone(status: string | undefined): 'success' | 'danger' | 'neutral' {
  if (status === 'enviado') return 'success';
  if (status === 'falhou') return 'danger';
  return 'neutral';
}

export function FilaWhatsAppSection() {
  const envios = useCampanhasStore((s) => s.envios);
  const campanhas = useCampanhasStore((s) => s.campanhas);
  const openWaModal = useCampanhasStore((s) => s.openWaModal);
  const startLote = useCampanhasStore((s) => s.startLote);
  const { marcarEnviado, marcarFalhou, desfazer, marcarSelecionadosEnviados, marcarSelecionadosFalhou } =
    useCampanhasMutations();

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [filtroStatus, setFiltroStatus] = useState('pendente');

  const pendentes = envios.filter((e) => (e.status ?? 'pendente') === 'pendente');
  const exibidos =
    filtroStatus === 'todos'
      ? envios
      : envios.filter((e) => (e.status ?? 'pendente') === filtroStatus);

  function toggleItem(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    setSelecionados(
      selecionados.size === exibidos.length ? new Set() : new Set(exibidos.map((e) => e.id))
    );
  }

  function campanhaNome(envio: CampanhaEnvio) {
    return campanhas.find((c) => c.id === envio.campanha_id)?.nome ?? '—';
  }

  function handlePreview(envio: CampanhaEnvio) {
    const camp = campanhas.find((c) => c.id === envio.campanha_id) ?? null;
    openWaModal(envio, camp);
  }

  function handleLoteWa() {
    startLote(pendentes.map((e) => e.id));
  }

  return (
    <div className="card card-shell camp-section">
      <div className="camp-section-hdr">
        <div className="ct">Fila WhatsApp</div>
        <div className="camp-section-actions">
          <FilterBar
            filters={[
              {
                key: 'status',
                value: filtroStatus,
                onChange: setFiltroStatus,
                options: [
                  { value: 'pendente', label: `Pendentes (${pendentes.length})` },
                  { value: 'enviado', label: 'Enviados' },
                  { value: 'falhou', label: 'Falhou' },
                  { value: 'todos', label: 'Todos' }
                ]
              }
            ]}
          />
          {selecionados.size > 0 && (
            <>
              <button
                className="btn btn-sm"
                type="button"
                onClick={() =>
                  void marcarSelecionadosEnviados([...selecionados]).then(() =>
                    setSelecionados(new Set())
                  )
                }
              >
                Enviados ({selecionados.size})
              </button>
              <button
                className="btn btn-sm"
                type="button"
                style={{ color: 'var(--color-danger, #dc2626)' }}
                onClick={() =>
                  void marcarSelecionadosFalhou([...selecionados]).then(() =>
                    setSelecionados(new Set())
                  )
                }
              >
                Falhou ({selecionados.size})
              </button>
            </>
          )}
          {pendentes.length > 0 && (
            <button className="btn btn-p btn-sm" type="button" onClick={handleLoteWa}>
              Enviar lote ({pendentes.length})
            </button>
          )}
        </div>
      </div>

      {exibidos.length === 0 ? (
        <div className="empty">
          <p>Nenhum envio{filtroStatus !== 'todos' ? ` com status "${filtroStatus}"` : ''}.</p>
        </div>
      ) : (
        <div className="camp-fila-table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: '36px' }}>
                  <input
                    type="checkbox"
                    onChange={toggleTodos}
                    checked={selecionados.size === exibidos.length && exibidos.length > 0}
                  />
                </th>
                <th>Destino</th>
                <th>Campanha</th>
                <th>Status</th>
                <th>Data ref.</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
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
                  <td>{envio.destino ?? '—'}</td>
                  <td>{campanhaNome(envio)}</td>
                  <td>
                    <StatusBadge tone={statusTone(envio.status)}>
                      {envio.status ?? 'pendente'}
                    </StatusBadge>
                  </td>
                  <td>{envio.data_ref ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-sm"
                        type="button"
                        onClick={() => handlePreview(envio)}
                      >
                        Preview
                      </button>
                      {(envio.status ?? 'pendente') === 'pendente' && (
                        <>
                          <button
                            className="btn btn-sm"
                            type="button"
                            onClick={() => void marcarEnviado(envio)}
                          >
                            Enviado
                          </button>
                          <button
                            className="btn btn-sm"
                            type="button"
                            style={{ color: 'var(--color-danger, #dc2626)' }}
                            onClick={() => void marcarFalhou(envio)}
                          >
                            Falhou
                          </button>
                        </>
                      )}
                      {envio.status && envio.status !== 'pendente' && (
                        <button
                          className="btn btn-sm"
                          type="button"
                          onClick={() => void desfazer(envio)}
                        >
                          Desfazer
                        </button>
                      )}
                    </div>
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
