import { useMemo } from 'react';
import { DataTable, EmptyState, FilterBar, StatCard, Button, Badge } from '../../../shared/ui';
import { useFilialStore } from '../../../app/useFilialStore';
import { useRelatoriosStore } from '../store/useRelatoriosStore';
import { computeOportunidades, syncHistorico } from '../utils/oportunidadesJogos';
import type { OportunidadeJogo } from '../../../../types/domain';

type GrupoRow = { mesRef: string; total: number; validadas: number };

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function pct(v: number): string {
  return `${Math.round(v)}%`;
}

function fmt(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtDataHora(v: string | null | undefined): string {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function fmtPeriodo(mesRef: string | null | undefined): string {
  if (!mesRef || !/^\d{4}-\d{2}$/.test(String(mesRef))) return String(mesRef || '-');
  const [ano, mes] = String(mesRef).split('-');
  return `${MESES[Math.max(0, Number(mes) - 1)]}/${ano}`;
}

function getOportunidadeData(item: OportunidadeJogo): string {
  return item.jogo_data_hora || item.jogo?.data_hora || '';
}

export function OportunidadesTab() {
  const filialId = useFilialStore((s) => s.filialId) ?? '';
  const jogos = useRelatoriosStore((s) => s.jogos);
  const clientes = useRelatoriosStore((s) => s.clientes);
  const filtroAno = useRelatoriosStore((s) => s.filtroAno);
  const filtroMes = useRelatoriosStore((s) => s.filtroMes);
  const setFiltroAno = useRelatoriosStore((s) => s.setFiltroAno);
  const setFiltroMes = useRelatoriosStore((s) => s.setFiltroMes);
  const openValidacao = useRelatoriosStore((s) => s.openValidacao);

  const { oportunidadesAtuais, histCompleto, histFiltrado, anos } = useMemo(() => {
    const atuais = computeOportunidades(filialId, clientes, jogos);
    const hist = syncHistorico(filialId, atuais);

    const anosSet = new Set(hist.map((item) => String(item.ano_ref || '')).filter(Boolean));
    const anoAtual = String(new Date().getFullYear());
    if (!anosSet.has(anoAtual)) anosSet.add(anoAtual);
    const anosOrdenados = [...anosSet].sort((a, b) => Number(b) - Number(a));

    const filtrado = hist.filter((item) => {
      if (filtroAno && String(item.ano_ref || '') !== filtroAno) return false;
      if (filtroMes && String(item.mes_ref || '').split('-')[1] !== filtroMes) return false;
      return true;
    });

    return { oportunidadesAtuais: atuais, histCompleto: hist, histFiltrado: filtrado, anos: anosOrdenados };
  }, [filialId, clientes, jogos, filtroAno, filtroMes]);

  const total = histFiltrado.length;
  const validadasCount = histFiltrado.filter((i) => i.validada).length;
  const pendentes = total - validadasCount;
  const taxa = total > 0 ? (validadasCount / total) * 100 : 0;

  // Context card logic
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  const seteDias = new Date(hoje);
  seteDias.setDate(seteDias.getDate() + 7);

  const jogosHoje = oportunidadesAtuais.filter((j) => {
    const data = getOportunidadeData(j);
    if (!data) return false;
    const d = new Date(data);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === hoje.getTime();
  });

  const jogosSemana = oportunidadesAtuais.filter((j) => {
    const data = getOportunidadeData(j);
    if (!data) return false;
    const d = new Date(data);
    d.setHours(0, 0, 0, 0);
    return d >= amanha && d <= seteDias;
  });

  // Resumo por mês
  const grupos: Record<string, { total: number; validadas: number }> = {};
  histFiltrado.forEach((item) => {
    const key = String(item.mes_ref || 'sem-mes');
    if (!grupos[key]) grupos[key] = { total: 0, validadas: 0 };
    grupos[key].total += 1;
    if (item.validada) grupos[key].validadas += 1;
  });

  const gruposData: GrupoRow[] = Object.entries(grupos)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mesRef, dados]) => ({ mesRef, ...dados }));

  const pendentesLista = oportunidadesAtuais
    .map((item) => histCompleto.find((h) => h.id === item.id) || item)
    .filter((item) => !item.validada);

  const validadasLista = histFiltrado
    .filter((item) => item.validada)
    .sort((a, b) => String(b.validada_em || '').localeCompare(String(a.validada_em || '')))
    .slice(0, 12);

  return (
    <div className="rf-ui-stack">
      <div className="rf-ui-stat-grid">
        <StatCard label="Oportunidades" value={total} />
        <StatCard label="Validadas" value={validadasCount} tone="success" />
        <StatCard label="Pendentes" value={pendentes} tone="warning" />
        <StatCard label="Conversão" value={pct(taxa)} />
      </div>

      {/* Context card */}
      {jogosHoje.length > 0 && (
        <article className="p-6 rounded-2xl bg-rose-50 border border-rose-100 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Badge variant="red">Hoje</Badge>
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Oportunidades</span>
          </div>
          <div className="text-lg font-bold text-rose-900 leading-snug">
            {jogosHoje.length} jogo{jogosHoje.length > 1 ? 's' : ''} hoje — valide antes do apito
          </div>
          <div className="text-sm text-rose-600 font-medium">{pendentes} pendente{pendentes !== 1 ? 's' : ''} no total — conversão atual {pct(taxa)}</div>
        </article>
      )}
      {!jogosHoje.length && jogosSemana.length > 0 && (
        <article className="p-6 rounded-2xl bg-amber-50 border border-amber-100 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Badge variant="yellow">Esta semana</Badge>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Oportunidades</span>
          </div>
          <div className="text-lg font-bold text-amber-900 leading-snug">
            {jogosSemana.length} jogo{jogosSemana.length > 1 ? 's' : ''} nos próximos 7 dias
          </div>
          <div className="text-sm text-amber-600 font-medium">{pendentes} pendente{pendentes !== 1 ? 's' : ''} — conversão atual {pct(taxa)}</div>
        </article>
      )}
      {!jogosHoje.length && !jogosSemana.length && total === 0 && (
        <article className="context-card context-card--info">
          <div className="context-card__head">
            <Badge variant="blue">Info</Badge>
            <span className="context-card__kicker">Oportunidades</span>
          </div>
          <div className="context-card__title">Nenhuma oportunidade registrada</div>
          <div className="context-card__copy">Sincronize os jogos para começar a rastrear oportunidades comerciais.</div>
        </article>
      )}

      {/* Resumo por mês */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
          <div className="w-1 h-4 bg-emerald-500 rounded-full" />
          Resumo por mês
        </h3>
        <FilterBar
          filters={[
            {
              key: 'ano',
              value: filtroAno,
              onChange: setFiltroAno,
              options: [
                { value: '', label: 'Todos os anos' },
                ...anos.map((ano) => ({ value: ano, label: ano }))
              ]
            },
            {
              key: 'mes',
              value: filtroMes,
              onChange: setFiltroMes,
              options: [
                { value: '', label: 'Todos os meses' },
                ...MESES.map((mes, idx) => ({
                  value: String(idx + 1).padStart(2, '0'),
                  label: mes
                }))
              ]
            }
          ]}
          activeFilterCount={(filtroAno ? 1 : 0) + (filtroMes ? 1 : 0)}
          onClearFilters={() => {
            setFiltroAno('');
            setFiltroMes('');
          }}
        />
        <DataTable
          columns={[
            {
              key: 'periodo',
              header: 'Período',
              render: (row: GrupoRow) => (
                <strong>{fmtPeriodo(row.mesRef)}</strong>
              )
            },
            {
              key: 'total',
              header: 'Oportunidades',
              align: 'center',
              render: (row: GrupoRow) => row.total
            },
            {
              key: 'validadas',
              header: 'Validadas',
              align: 'center',
              className: 'table-cell-success table-cell-strong',
              render: (row: GrupoRow) => row.validadas
            },
            {
              key: 'pendentes',
              header: 'Pendentes',
              align: 'center',
              render: (row: GrupoRow) => row.total - row.validadas
            },
            {
              key: 'conversao',
              header: 'Conversão',
              align: 'right',
              className: 'table-cell-strong',
              render: (row: GrupoRow) =>
                pct(row.total > 0 ? (row.validadas / row.total) * 100 : 0)
            }
          ]}
          rows={gruposData}
          rowKey={(row) => row.mesRef}
          emptyTitle="Sem oportunidades registradas no filtro."
        />
      </div>

      {/* Grid: pendentes + validadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
            <div className="w-1 h-4 bg-amber-500 rounded-full" />
            Oportunidades abertas
          </h3>
          {pendentesLista.length > 0 ? (
            <div className="flex flex-col gap-3">
              {pendentesLista.map((item) => (
                <div key={item.id} className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/30 transition-all flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <div className="flex-grow min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{item.cliente} • {item.time}</div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {item.jogo_titulo || item.jogo?.titulo || '-'} • {fmtDataHora(item.jogo_data_hora || item.jogo?.data_hora)}
                    </div>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => openValidacao(item)}
                  >
                    Validar
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Sem oportunidades abertas para validar." compact />
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
            <div className="w-1 h-4 bg-emerald-500 rounded-full" />
            Validações realizadas
          </h3>
          {validadasLista.length > 0 ? (
            <div className="flex flex-col gap-3">
              {validadasLista.map((item) => (
                <div key={item.id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <div className="flex-grow min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{item.cliente} • {item.time}</div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {fmtPeriodo(item.mes_ref)} • {item.pedido_num ? `Pedido #${item.pedido_num}` : 'Venda validada'}
                      {item.pedido_total ? ` • ${fmt(item.pedido_total)}` : ''}
                    </div>
                  </div>
                  <Badge variant="green">Validada</Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Nenhuma oportunidade validada no filtro." compact />
          )}
        </div>
      </div>
    </div>
  );
}
