import { useMemo } from 'react';
import { useFilialStore } from '../../../app/useFilialStore';
import { useRelatoriosStore } from '../store/useRelatoriosStore';
import { computeOportunidades, syncHistorico } from '../utils/oportunidadesJogos';
import type { OportunidadeJogo } from '../../../../types/domain';

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

  const pendentesLista = oportunidadesAtuais
    .map((item) => histCompleto.find((h) => h.id === item.id) || item)
    .filter((item) => !item.validada);

  const validadasLista = histFiltrado
    .filter((item) => item.validada)
    .sort((a, b) => String(b.validada_em || '').localeCompare(String(a.validada_em || '')))
    .slice(0, 12);

  return (
    <div className="rf-ui-stack">
      {/* Metrics */}
      <div className="mg bento-band">
        <div className="met"><div className="ml">Oportunidades</div><div className="mv">{total}</div></div>
        <div className="met"><div className="ml">Validadas</div><div className="mv tone-success">{validadasCount}</div></div>
        <div className="met"><div className="ml">Pendentes</div><div className="mv tone-warning">{pendentes}</div></div>
        <div className="met"><div className="ml">Conversão</div><div className="mv">{pct(taxa)}</div></div>
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
        <div className="toolbar toolbar-shell toolbar-shell--section">
          <div className="ct ct-inline">Resumo por mês</div>
          <div className="toolbar-main">
            <select
              className="inp sel select-w-sm"
              value={filtroAno}
              onChange={(e) => setFiltroAno(e.target.value)}
            >
              <option value="">Todos os anos</option>
              {anos.map((ano) => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
            <select
              className="inp sel select-w-md"
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
            >
              <option value="">Todos os meses</option>
              {MESES.map((mes, idx) => (
                <option key={mes} value={String(idx + 1).padStart(2, '0')}>{mes}</option>
              ))}
            </select>
          </div>
        </div>
        {Object.keys(grupos).length > 0 ? (
          <div className="tw">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Período</th>
                  <th className="table-align-center">Oportunidades</th>
                  <th className="table-align-center">Validadas</th>
                  <th className="table-align-center">Pendentes</th>
                  <th className="table-align-right">Conversão</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(grupos)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([mesRef, dados]) => {
                    const pend = dados.total - dados.validadas;
                    const t = dados.total > 0 ? (dados.validadas / dados.total) * 100 : 0;
                    return (
                      <tr key={mesRef}>
                        <td className="table-cell-strong">{fmtPeriodo(mesRef)}</td>
                        <td className="table-align-center">{dados.total}</td>
                        <td className="table-align-center table-cell-success table-cell-strong">{dados.validadas}</td>
                        <td className="table-align-center">{pend}</td>
                        <td className="table-align-right table-cell-strong">{pct(t)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty"><p>Sem oportunidades registradas no filtro.</p></div>
        )}
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
            <div className="empty"><div className="ico">OK</div><p>Sem oportunidades abertas para validar.</p></div>
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
            <div className="empty"><div className="ico">VR</div><p>Nenhuma oportunidade validada no filtro.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
