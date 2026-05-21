import { useMemo } from 'react';
import { Card, Badge, Typography } from '../../../shared/ui';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Zap
} from 'lucide-react';
import { DataTable, FilterBar, Button } from '../../../shared/ui';
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
  return fmtBRL(v);
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

  const pendentesLista = oportunidadesAtuais
    .map((item) => histCompleto.find((h) => h.id === item.id) || item)
    .filter((item) => !item.validada);

  const validadasLista = histFiltrado
    .filter((item) => item.validada)
    .sort((a, b) => String(b.validada_em || '').localeCompare(String(a.validada_em || '')))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* KPIs de Oportunidades */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="flex flex-col gap-2">
          <Typography variant="label" color="muted" className="font-bold uppercase tracking-tighter">Oportunidades</Typography>
          <Typography variant="h2" className="!font-black text-indigo-400">{total}</Typography>
        </Card>
        <Card className="flex flex-col gap-2">
          <Typography variant="label" color="muted" className="font-bold uppercase tracking-tighter">Validadas</Typography>
          <Typography variant="h2" className="!font-black text-emerald-400">{validadasCount}</Typography>
        </Card>
        <Card className="flex flex-col gap-2">
          <Typography variant="label" color="muted" className="font-bold uppercase tracking-tighter">Pendentes</Typography>
          <Typography variant="h2" className="!font-black text-amber-400">{pendentes}</Typography>
        </Card>
        <Card className="flex flex-col gap-2">
          <Typography variant="label" color="muted" className="font-bold uppercase tracking-tighter">Conversão</Typography>
          <div className="flex items-center gap-2">
            <Typography variant="h2" className="!font-black text-teal-400">{pct(taxa)}</Typography>
            <TrendingUp size={20} className="text-emerald-500" />
          </div>
        </Card>
      </div>

      {/* Callouts Contextuais */}
      {jogosHoje.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex gap-4">
          <Zap size={24} className="text-rose-500 shrink-0 mt-1" />
          <div className="flex flex-col gap-1">
            <Typography variant="body" className="font-bold text-rose-500">
              {jogosHoje.length} jogo(s) hoje — valide antes do apito
            </Typography>
            <Typography variant="caption" className="text-rose-400">
              Existem {pendentes} pendências no total — conversão atual {pct(taxa)}. Priorize as ações de hoje para não perder o timing comercial.
            </Typography>
          </div>
        </div>
      )}

      {/* Tabela de Resumo Mensal */}
      <Card>
        <div className="flex justify-between items-center mb-6">
          <Typography variant="h4" className="font-bold">Resumo por Mês</Typography>
          <div className="flex gap-4">
            <FilterBar
              filters={[
                {
                  key: 'ano',
                  value: filtroAno,
                  onChange: setFiltroAno,
                  options: [{ value: '', label: 'Ano' }, ...anos.map((ano) => ({ value: ano, label: ano }))]
                },
                {
                  key: 'mes',
                  value: filtroMes,
                  onChange: setFiltroMes,
                  options: [{ value: '', label: 'Mês' }, ...MESES.map((mes, idx) => ({ value: String(idx + 1).padStart(2, '0'), label: mes }))]
                }
              ]}
              compact
              onClearFilters={() => { setFiltroAno(''); setFiltroMes(''); }}
            />
          </div>
        </div>

        <DataTable
          columns={[
            {
              key: 'periodo',
              header: 'Período',
              render: (row: GrupoRow) => <strong className="text-slate-200">{fmtPeriodo(row.mesRef)}</strong>
            },
            { key: 'total', header: 'Oportunidades', align: 'center', render: (row: GrupoRow) => row.total },
            { key: 'validadas', header: 'Validadas', align: 'center', render: (row: GrupoRow) => <span className="text-emerald-400">{row.validadas}</span> },
            { key: 'pendentes', header: 'Pendentes', align: 'center', render: (row: GrupoRow) => row.total - row.validadas },
            {
              key: 'conversao',
              header: 'Conversão',
              align: 'right',
              render: (row: GrupoRow) => (
                <Badge tone={ (row.validadas / row.total) > 0.5 ? 'success' : 'warning' }>
                  {pct(row.total > 0 ? (row.validadas / row.total) * 100 : 0)}
                </Badge>
              )
            }
          ]}
          rows={Object.entries(
            histFiltrado.reduce<Record<string, { total: number; validadas: number }>>((acc, item) => {
              const key = String(item.mes_ref || 'sem-mes');
              if (!acc[key]) acc[key] = { total: 0, validadas: 0 };
              acc[key].total += 1;
              if (item.validada) acc[key].validadas += 1;
              return acc;
            }, {})
          ).map(([mesRef, dados]) => ({ mesRef, ...dados })).sort((a, b) => a.mesRef.localeCompare(b.mesRef))}
          rowKey={(row) => row.mesRef}
        />
      </Card>

      {/* Grid: Abertas vs Realizadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <Typography variant="h4" className="font-bold flex items-center gap-2">
              <Clock size={18} className="text-amber-500" />
              Oportunidades Abertas
            </Typography>
            <Badge tone="warning">{pendentesLista.length}</Badge>
          </div>
          
          <div className="space-y-4">
            {pendentesLista.slice(0, 6).map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-surface-hover border border-border-subtle flex items-center gap-4 group hover:border-border-bold transition-all">
                <div className="flex-1 min-w-0">
                  <Typography variant="body" className="font-bold truncate">{item.cliente} • {item.time}</Typography>
                  <Typography variant="caption" color="muted" className="!text-[10px]">{item.jogo_titulo || item.jogo?.titulo || '-'} • {fmtDataHora(item.jogo_data_hora || item.jogo?.data_hora)}</Typography>
                </div>
                <Button size="sm" onClick={() => openValidacao(item)}>Validar</Button>
              </div>
            ))}
            {pendentesLista.length === 0 && <Typography variant="body" color="muted" className="text-center py-8 italic">Tudo em dia!</Typography>}
          </div>
        </Card>

        <Card className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <Typography variant="h4" className="font-bold flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-500" />
              Validações Recentes
            </Typography>
            <Badge tone="success">{validadasLista.length}</Badge>
          </div>

          <div className="space-y-4">
            {validadasLista.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-surface-hover border border-border-subtle flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Typography variant="body" className="font-bold truncate">{item.cliente} • {item.time}</Typography>
                  <Typography variant="caption" color="muted" className="!text-[10px]">
                    {fmtPeriodo(item.mes_ref)} • {item.pedido_num ? `Pedido #${item.pedido_num}` : 'Venda validada'}
                    {item.pedido_total ? ` • ${fmt(item.pedido_total)}` : ''}
                  </Typography>
                </div>
                <Badge tone="success">OK</Badge>
              </div>
            ))}
            {validadasLista.length === 0 && <Typography variant="body" color="muted" className="text-center py-8 italic">Nenhuma validação.</Typography>}
          </div>
        </Card>
      </div>
    </div>
  );
}
