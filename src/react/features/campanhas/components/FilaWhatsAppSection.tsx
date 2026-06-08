import { useState } from 'react';
import { EmptyState, StatusBadge, FilterBar, Button } from '../../../shared/ui';
import { useCampanhasStore } from '../store/useCampanhasStore';
import { useCampanhas, useCampanhaEnvios } from '../hooks/useCampanhasQueries';
import { useCampanhasMutations } from '../hooks/useCampanhasMutations';
import type { CampanhaEnvio } from '../../../../types/domain';

function statusTone(status: string | undefined): 'success' | 'danger' | 'neutral' {
  if (status === 'enviado') return 'success';
  if (status === 'falhou') return 'danger';
  return 'neutral';
}

export function FilaWhatsAppSection() {
  const { data: envios = [] } = useCampanhaEnvios();
  const { data: campanhas = [] } = useCampanhas();
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
    startLote(pendentes.map((e) => e.id), envios, campanhas);
  }

  return (
    <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <div className="w-1 h-4 bg-emerald-500 rounded-full" />
          Fila WhatsApp
        </h3>
        <div className="flex items-center gap-3 flex-wrap">
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
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  void marcarSelecionadosEnviados(envios, [...selecionados]).then(() =>
                    setSelecionados(new Set())
                  )
                }
              >
                Enviados ({selecionados.size})
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() =>
                  void marcarSelecionadosFalhou(envios, [...selecionados]).then(() =>
                    setSelecionados(new Set())
                  )
                }
              >
                Falhou ({selecionados.size})
              </Button>
            </div>
          )}
          {pendentes.length > 0 && (
            <Button variant="primary" size="sm" onClick={handleLoteWa}>
              Enviar lote ({pendentes.length})
            </Button>
          )}
        </div>
      </div>

      {exibidos.length === 0 ? (
        <EmptyState
          title={`Nenhum envio${filtroStatus !== 'todos' ? ` com status "${filtroStatus}"` : ''}.`}
          compact
        />
      ) : (
        <div className="overflow-x-auto border border-white/5 rounded-xl bg-slate-900 shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-sm font-medium text-slate-400">
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    className="rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500/20"
                    onChange={toggleTodos}
                    checked={selecionados.size === exibidos.length && exibidos.length > 0}
                  />
                </th>
                <th className="px-4 py-3 text-left">Destino</th>
                <th className="px-4 py-3 text-left">Campanha</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Data ref.</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {exibidos.map((envio) => (
                <tr key={envio.id} className={`hover:bg-white/5 transition-colors${selecionados.has(envio.id) ? 'bg-blue-500/10' : ''}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500/20"
                      checked={selecionados.has(envio.id)}
                      onChange={() => toggleItem(envio.id)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-white">{envio.destino ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{campanhaNome(envio)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={statusTone(envio.status)}>
                      {envio.status ?? 'pendente'}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{envio.data_ref ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePreview(envio)}
                      >
                        Preview
                      </Button>
                      {(envio.status ?? 'pendente') === 'pendente' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => void marcarEnviado(envio)}
                          >
                            Enviado
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => void marcarFalhou(envio)}
                          >
                            Falhou
                          </Button>
                        </>
                      )}
                      {envio.status && envio.status !== 'pendente' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void desfazer(envio)}
                        >
                          Desfazer
                        </Button>
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
