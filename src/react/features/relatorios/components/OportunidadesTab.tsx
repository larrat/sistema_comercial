import { useMemo } from 'react';
import { DataTable, EmptyState, FilterBar, StatCard } from '../../../shared/ui';
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
        <article className="context-card context-card--danger">
          <div className="context-card__head">
            <span className="bdg br">Hoje</span>
            <span className="context-card__kicker">Oportunidades</span>
          </div>
          <div className="context-card__title">
            {jogosHoje.length} jogo{jogosHoje.length > 1 ? 's' : ''} hoje — valide antes do apito
          </div>
          <div className="context-card__meta">{pendentes} pendente{pendentes !== 1 ? 's' : ''} no total — conversão atual {pct(taxa)}</div>
        </article>
      )}
      {!jogosHoje.length && jogosSemana.length > 0 && (
        <article className="context-card context-card--warning">
          <div className="context-card__head">
            <span className="bdg ba">Esta semana</span>
            <span className="context-card__kicker">Oportunidades</span>
          </div>
          <div className="context-card__title">
            {jogosSemana.length} jogo{jogosSemana.length > 1 ? 's' : ''} nos próximos 7 dias
          </div>
          <div className="context-card__meta">{pendentes} pendente{pendentes !== 1 ? 's' : ''} — conversão atual {pct(taxa)}</div>
        </article>
      )}
      {!jogosHoje.length && !jogosSemana.length && total === 0 && (
        <article className="context-card context-card--info">
          <div className="context-card__head">
            <span className="bdg">Info</span>
            <span className="context-card__kicker">Oportunidades</span>
          </div>
          <div className="context-card__title">Nenhuma oportunidade registrada</div>
          <div className="context-card__copy">Sincronize os jogos para começar a rastrear oportunidades comerciais.</div>
        </article>
      )}

      {/* Resumo por mês */}
      <div className="card card-shell">
        <div className="ct">Resumo por mês</div>
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
      <div className="rel-bento-grid">
        <div className="card card-shell">
          <div className="ct">Oportunidades abertas</div>
          {pendentesLista.length > 0 ? (
            pendentesLista.map((item) => (
              <div key={item.id} className="rrow rel-op-row">
                <span className="rel-op-dot" />
                <div className="rel-grow">
                  <div className="rel-op-title">{item.cliente} • {item.time}</div>
                  <div className="rel-op-sub">
                    {item.jogo_titulo || item.jogo?.titulo || '-'} • {fmtDataHora(item.jogo_data_hora || item.jogo?.data_hora)}
                  </div>
                </div>
                <button className="btn btn-sm" type="button" onClick={() => openValidacao(item)}>
                  Validar venda
                </button>
              </div>
            ))
          ) : (
            <EmptyState title="Sem oportunidades abertas para validar." compact />
          )}
        </div>

        <div className="card card-shell">
          <div className="ct">Validações realizadas</div>
          {validadasLista.length > 0 ? (
            validadasLista.map((item) => (
              <div key={item.id} className="rrow rel-op-row">
                <span className="rel-op-dot rel-op-dot--success" />
                <div className="rel-grow">
                  <div className="rel-op-title">{item.cliente} • {item.time}</div>
                  <div className="rel-op-sub">
                    {fmtPeriodo(item.mes_ref)} • {item.pedido_num ? `Pedido #${item.pedido_num}` : 'Venda validada'}
                    {item.pedido_total ? ` • ${fmt(item.pedido_total)}` : ''}
                  </div>
                </div>
                <span className="bdg bb">Validada</span>
              </div>
            ))
          ) : (
            <EmptyState title="Nenhuma oportunidade validada no filtro." compact />
          )}
        </div>
      </div>
    </div>
  );
}
