import { useEffect, useMemo, useState, ViewTransition } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { Cliente, ContaReceber, Pedido } from '../../../../types/domain';
import {
  buildClienteRoute,
  buildPedidosRoute,
  buildReceberRoute,
  type ClienteProfileTab
} from '../../../app/router/wave1Navigation';
import {
  ActionMenu,
  EmptyState,
  ErrorState,
  FormError,
  LoadingState,
  Button,
  Badge
} from '../../../shared/ui';
import { SystemBarChart } from '../../../app/components/charts';
import { ClienteForm } from './ClienteForm';
import { useClientePedidos } from '../hooks/useClientePedidos';
import { useClienteReceber } from '../hooks/useClienteReceber';
import { useClienteNotes } from '../hooks/useClienteNotes';
import { 
  User, 
  MessageSquare, 
  PlusCircle, 
  MoreHorizontal, 
  Clock, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  ArrowLeft,
  ChevronLeft,
  Share2,
  Database,
  History,
  Zap,
  Package,
  ArrowUpRight,
  ShieldCheck,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Tooltip from '@radix-ui/react-tooltip';
import ReactCountUp from 'react-countup';
const CountUp = (ReactCountUp as any).default || ReactCountUp;

type Props = {
  cliente: Cliente;
  loadingCliente?: boolean;
  onClienteSaved?: (cliente: Cliente) => void;
  onReload?: () => void;
};

import { ClienteAbaResumo } from './tabs/ClienteAbaResumo';
import { ClienteAbaMarketing } from './tabs/ClienteAbaMarketing';
import { ClienteAbaPedidos } from './tabs/ClienteAbaPedidos';
import { ClienteAbaFinanceiro } from './tabs/ClienteAbaFinanceiro';
import { ClienteAbaNotas } from './tabs/ClienteAbaNotas';
import { ClienteAbaCadastro } from './tabs/ClienteAbaCadastro';
import {
  PROFILE_TABS,
  normalizeTab,
  buildKpis,
  getInitials,
  getWhatsappLink,
  renderMetadataLine,
  sortPedidosByDateDesc,
  getContaValorEmAberto
} from './ClienteProfileHelpers';

export function ClienteProfilePage({
  cliente,
  loadingCliente = false,
  onClienteSaved,
  onReload
}: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingCadastro, setEditingCadastro] = useState(false);
  const [notaDraft, setNotaDraft] = useState('');
  const [notaError, setNotaError] = useState<string | null>(null);

  const activeTab = normalizeTab(searchParams.get('tab'));
  const { pedidosAbertos, pedidosFechados, loading: pedidosLoading, error: pedidosError } =
    useClientePedidos({ cliente, skip: !cliente.id });
  const {
    contas,
    loading: contasLoading,
    error: contasError
  } = useClienteReceber({ cliente, skip: !cliente.id });
  const {
    notas,
    loading: notasLoading,
    saving: notaSaving,
    error: notasError,
    submitNota
  } = useClienteNotes({ clienteId: cliente.id, skip: !cliente.id });

  const allPedidos = useMemo(
    () => sortPedidosByDateDesc([...pedidosAbertos, ...pedidosFechados]),
    [pedidosAbertos, pedidosFechados]
  );
  const contasPendentes = useMemo(
    () => contas.filter((conta) => getContaValorEmAberto(conta) > 0),
    [contas]
  );
  const notasOrdenadas = useMemo(
    () =>
      [...notas].sort((a, b) => {
        const aDate = new Date(a.data || '').getTime() || 0;
        const bDate = new Date(b.data || '').getTime() || 0;
        return bDate - aDate;
      }),
    [notas]
  );
  const ultimaNota = notasOrdenadas[0] ?? null;
  const kpis = useMemo(() => buildKpis(pedidosAbertos, pedidosFechados, contas), [contas, pedidosAbertos, pedidosFechados]);
  const whatsappLink = getWhatsappLink(cliente);

  useEffect(() => {
    setEditingCadastro(false);
  }, [cliente.id]);

  function setTab(tab: ClienteProfileTab) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (tab === 'resumo') next.delete('tab');
      else next.set('tab', tab);
      return next;
    });
  }

  async function handleSubmitNota() {
    const texto = notaDraft.trim();
    if (!texto) {
      setNotaError('Digite uma nota antes de salvar.');
      return;
    }
    try {
      setNotaError(null);
      await submitNota(texto);
      setNotaDraft('');
    } catch (err) {
      setNotaError(err instanceof Error ? err.message : 'Erro ao salvar nota.');
    }
  }

  if (loadingCliente) {
    return (
      <main className="max-w-7xl mx-auto flex flex-col gap-6 w-full px-4 sm:px-6 lg:px-8 py-8">
        <LoadingState
          title="Carregando cliente…"
          description="Estamos reunindo cadastro, pedidos, financeiro e notas para abrir a visão completa."
        />
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto flex flex-col gap-6 w-full px-4 sm:px-6 lg:px-8 py-8" data-testid="cliente-profile-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <button 
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors" 
            type="button" 
            onClick={() => navigate('/app/clientes')}
          >
            <ChevronLeft className="w-4 h-4" />
            Clientes
          </button>
          <span className="text-slate-600">/</span>
          <span className="text-white font-semibold">{cliente.nome}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="secondary"
            className="gap-2"
            onClick={() => {}}
            leftIcon={<Share2 className="w-4 h-4" />}
          >
            Exportar
          </Button>
          <Button 
            variant="secondary"
            size="sm"
            className="!p-2 rounded-xl"
            onClick={() => {}}
            leftIcon={<MoreHorizontal className="w-4 h-4" />}
          />
        </div>
      </div>

      <section className="bg-slate-900 border border-white/5 rounded-2xl shadow-sm p-6 sm:p-8 flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <ViewTransition name={`cliente-hero-${cliente.id}`} share="morph">
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-2xl font-bold text-white shadow-inner">
              {getInitials(cliente.nome)}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-white tracking-tight">{cliente.nome}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${cliente.status === 'ativo' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                  {cliente.status === 'inativo' ? 'Inativo' : 'Ativo'}
                </span>
                {cliente.optin_marketing ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400">MKT</span>
                ) : null}
              </div>
              <p className="text-sm font-medium text-slate-400">{renderMetadataLine(cliente, allPedidos)}</p>
            </div>
          </div>
        </ViewTransition>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            className="gap-2"
            disabled={!whatsappLink}
            onClick={() => {
              if (whatsappLink) window.open(whatsappLink, '_blank', 'noopener,noreferrer');
            }}
            leftIcon={<MessageSquare className="w-4 h-4 text-emerald-500" />}
          >
            Mensagem
          </Button>
          <Button 
            variant="primary" 
            className="gap-2"
            onClick={() => navigate(buildPedidosRoute({ view: 'new', clienteId: cliente.id }))}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Novo pedido
          </Button>
          <ActionMenu
            label="Mais ações"
            items={[
              {
                key: 'editar-cadastro',
                label: 'Editar cadastro',
                onClick: () => {
                  setTab('cadastro');
                  setEditingCadastro(true);
                }
              },
              {
                key: 'abrir-financeiro',
                label: 'Abrir financeiro',
                onClick: () => navigate(buildClienteRoute(cliente.id, { tab: 'financeiro' }))
              }
            ]}
          />
        </div>
      </section>

      <section className="rf-kpi-grid">
        {kpis.map((card, idx) => {
          let Icon = TrendingUp;
          if (card.label.includes('Saldo')) Icon = DollarSign;
          if (card.label.includes('Pedidos')) Icon = Package;
          if (card.label.includes('Ticket')) Icon = Zap;
          if (card.label.includes('LTV')) Icon = Database;

          const toneClass = 
            card.tone === 'positive' ? 'is-success' : 
            card.tone === 'negative' ? 'is-danger' : 
            '';

          return (
            <motion.article 
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`rf-dash-card ${toneClass}`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="rf-stat-label !mb-0">{card.label}</span>
                <div className={`p-2 rounded-lg bg-white/5 border border-white/10 shadow-sm ${card.tone === 'positive' ? 'text-emerald-400' : card.tone === 'negative' ? 'text-rose-400' : 'text-slate-500'}`}>
                  <Icon size={14} strokeWidth={2.5} />
                </div>
              </div>

              <div className="rf-stat-value">
                {card.value.includes('R$') ? (
                  <CountUp 
                    end={parseFloat(card.value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0} 
                    decimals={2} 
                    decimal="," 
                    prefix="R$ " 
                    duration={2} 
                    separator="."
                  />
                ) : (
                  <CountUp 
                    end={parseFloat(card.value) || 0} 
                    duration={2} 
                    separator="."
                  />
                )}
              </div>

              <span className={`rf-stat-sub ${card.tone === 'positive' ? 'success' : card.tone === 'negative' ? 'danger' : 'muted'} font-bold`}>
                {card.subtitle}
              </span>
            </motion.article>
          );
        })}
      </section>

      <nav className="rf-tabs-premium">
        {PROFILE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`rf-tab-item ${activeTab === tab.id ? 'is-active' : ''}`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"
              />
            )}
          </button>
        ))}
      </nav>

      {activeTab === 'resumo' && (
        <ClienteAbaResumo 
          setTab={setTab}
          pedidosLoading={pedidosLoading}
          pedidosError={pedidosError}
          pedidosAbertos={pedidosAbertos}
          navigate={navigate}
          contasLoading={contasLoading}
          contasError={contasError}
          contasPendentes={contasPendentes}
          allPedidos={allPedidos}
          cliente={cliente}
          notasLoading={notasLoading}
          notasError={notasError}
          ultimaNota={ultimaNota}
        />
      )}

      {activeTab === 'marketing' && (
        <ClienteAbaMarketing cliente={cliente} />
      )}

      {activeTab === 'pedidos' && (
        <ClienteAbaPedidos 
          pedidosLoading={pedidosLoading}
          pedidosError={pedidosError}
          pedidosAbertos={pedidosAbertos}
          pedidosFechados={pedidosFechados}
          navigate={navigate}
        />
      )}

      {activeTab === 'financeiro' && (
        <ClienteAbaFinanceiro 
          contasLoading={contasLoading}
          contasError={contasError}
          contas={contas}
          navigate={navigate}
        />
      )}

      {activeTab === 'notas' && (
        <ClienteAbaNotas 
          notaDraft={notaDraft}
          setNotaDraft={setNotaDraft}
          notaError={notaError}
          notasError={notasError}
          notaSaving={notaSaving}
          handleSubmitNota={handleSubmitNota}
          notasLoading={notasLoading}
          notasOrdenadas={notasOrdenadas}
        />
      )}

      {activeTab === 'cadastro' && (
        <ClienteAbaCadastro 
          editingCadastro={editingCadastro}
          setEditingCadastro={setEditingCadastro}
          cliente={cliente}
          onClienteSaved={onClienteSaved}
          onReload={onReload}
        />
      )}
    </main>
  );
}
