import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { toast } from 'sonner';
import { useContasReceberStore } from '../store/useContasReceberStore';
import { useContas, useBaixas } from '../hooks/useContasReceberQueries';
import { useFilialStore } from '../../../app/useFilialStore';
import { useIsMobile } from '../../../shared/hooks/useIsMobile';
import type { CrTab } from '../store/useContasReceberStore';
import {
  ActionMenu,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  Modal,
  PageHeader,
  SegmentedControl,
  StatCard,
  StatusBadge,
  Button,
  Input,
  Badge
} from '../../../shared/ui';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  HelpCircle,
  Zap,
  Settings,
  Bell
} from 'lucide-react';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { crmService } from '../../clientes/services/crmService';
import type { ContaReceber, ContaReceberBaixa } from '../../../../types/domain';
import { ContaReceberConfirmModal } from './ContaReceberConfirmModal';
import { useContasReceberMutations, getStatusEfetivo, getValorEmAberto, getValorRecebido, getStatusLabel } from '../hooks/useContasReceberMutations';


type ContasReceberPilotPageProps = {
  routeIntent?: {
    contaId?: string | null;
  };
};

type ConfirmState =
  | { kind: 'receber'; contaId: string }
  | { kind: 'desfazer'; contaId: string }
  | { kind: 'estorno'; contaId: string; baixaId: string }
  | null;

import {
  hoje,
  fmt,
  formatDateTimeLabel,
  toDateTimeLocalValue,
  fromDateTimeLocalValue,
  getStatusTone,
  FinanceStatusBadge,
  getBaixasConta,
  filterContas
} from './ContasReceberUtils';
import { BaixaHistorico } from './BaixaHistorico';
import { ContasReceberMetrics } from './ContasReceberMetrics';
import { CrmAutomationCard } from './CrmAutomationCard';
import { BaixaParcialModal } from './BaixaParcialModal';
import { ContaDetailModal } from './ContaDetailModal';
import { ContasList } from './ContasList';






const TABS: { key: CrTab; label: string; statusEfetivo: 'pendente_ok' | 'vencido' | 'recebido' }[] = [
  { key: 'pendentes', label: 'Pendentes', statusEfetivo: 'pendente_ok' },
  { key: 'vencidos', label: 'Vencidos', statusEfetivo: 'vencido' },
  { key: 'recebidos', label: 'Recebidos', statusEfetivo: 'recebido' }
];

export function ContasReceberPilotPage({ routeIntent }: ContasReceberPilotPageProps) {
  const { data: contas = [], isLoading: isLoadingContas, error: errorContas, refetch: refetchContas } = useContas();
  const { data: baixas = [], isLoading: isLoadingBaixas } = useBaixas();
  
  const status = isLoadingContas || isLoadingBaixas ? 'loading' : errorContas ? 'error' : 'ready';
  const error = errorContas ? (errorContas instanceof Error ? errorContas.message : 'Erro ao carregar contas.') : null;

  const activeTab = useContasReceberStore((s) => s.activeTab);
  const setActiveTab = useContasReceberStore((s) => s.setActiveTab);
  const searchQuery = useContasReceberStore((s) => s.searchQuery);
  const setSearchQuery = useContasReceberStore((s) => s.setSearchQuery);

  const { registrarBaixa, marcarRecebido, marcarPendente, estornarBaixa, inFlight } = useContasReceberMutations(contas, baixas);

  const [baixaParcialContaId, setBaixaParcialContaId] = useState<string | null>(null);
  const [detailContaId, setDetailContaId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const baixaParcialConta = baixaParcialContaId ? contas.find((c) => c.id === baixaParcialContaId) ?? null : null;
  const detailConta = detailContaId ? contas.find((c) => c.id === detailContaId) ?? null : null;
  const detailBaixas = detailConta ? getBaixasConta(baixas, detailConta.id) : [];
  const activeTabConfig = TABS.find((t) => t.key === activeTab) ?? TABS[0];
  const filteredContas = useMemo(
    () => filterContas(contas, activeTabConfig.statusEfetivo, searchQuery),
    [contas, activeTabConfig.statusEfetivo, searchQuery]
  );
  const activeFilterCount = (searchQuery ? 1 : 0) + (activeTab !== 'pendentes' ? 1 : 0);

  useEffect(() => {
    if (!routeIntent?.contaId) return;
    setDetailContaId(routeIntent.contaId);
  }, [routeIntent?.contaId]);

  async function handleReceber(contaId: string) {
    const result = await marcarRecebido(contaId);
    if (!result.ok) {
      toast.error(result.error ?? 'Não foi possível registrar o recebimento agora.');
      return false;
    }
    toast.success('Recebimento concluído. A conta já foi atualizada.');
    return true;
  }

  function handleAbrirBaixaParcial(contaId: string) {
    setModalError(null);
    setBaixaParcialContaId(contaId);
  }

  async function handleConfirmarBaixaParcial(
    valor: number,
    recebidoEmIso: string,
    observacao: string | null
  ) {
    if (!baixaParcialContaId) return;
    setModalSubmitting(true);
    setModalError(null);
    const result = await registrarBaixa(baixaParcialContaId, valor, recebidoEmIso, observacao);
    setModalSubmitting(false);
    if (!result.ok) {
      setModalError(result.error ?? 'Erro ao registrar baixa.');
      return;
    }
    toast.success('Baixa registrada. Os valores da conta já foram atualizados.');
    setBaixaParcialContaId(null);
  }

  async function handleDesfazer(contaId: string) {
    const result = await marcarPendente(contaId);
    if (!result.ok) {
      toast.error(result.error ?? 'Não foi possível reabrir a conta agora.');
      return false;
    }
    toast.success('Conta reaberta com sucesso. Ela voltou para pendente.');
    return true;
  }

  async function handleEstornar(contaId: string, baixaId: string) {
    const result = await estornarBaixa(contaId, baixaId);
    if (!result.ok) {
      toast.error(result.error ?? 'Não foi possível estornar a baixa agora.');
      return false;
    }
    toast.success('Baixa estornada. Os totais da conta já foram recalculados.');
    return true;
  }

  async function handleConfirmAction() {
    if (!confirmState) return;

    if (confirmState.kind === 'receber') {
      const ok = await handleReceber(confirmState.contaId);
      if (ok) setConfirmState(null);
      return;
    }

    if (confirmState.kind === 'desfazer') {
      const ok = await handleDesfazer(confirmState.contaId);
      if (ok) setConfirmState(null);
      return;
    }

    const ok = await handleEstornar(confirmState.contaId, confirmState.baixaId);
    if (ok) setConfirmState(null);
  }

  const confirmConta = confirmState ? contas.find((c) => c.id === confirmState.contaId) ?? null : null;
  const confirmBaixa =
    confirmState?.kind === 'estorno'
      ? baixas.find((b) => b.id === confirmState.baixaId && b.conta_receber_id === confirmState.contaId) ?? null
      : null;
  const confirmSubmitting = confirmState ? inFlight.has(confirmState.contaId) : false;

  const confirmTitle =
    confirmState?.kind === 'receber'
      ? 'Confirmar recebimento total'
      : confirmState?.kind === 'desfazer'
        ? 'Desfazer recebimento'
        : 'Confirmar estorno';

  const confirmDescription =
    confirmState?.kind === 'receber'
      ? 'Esta ação quita o valor em aberto da conta usando a data atual.'
      : confirmState?.kind === 'desfazer'
        ? 'Esta ação remove o estado de quitada e devolve a conta para pendente.'
        : 'Esta ação estorna a baixa selecionada e recalcula os totais da conta.';

  const confirmLabel =
    confirmState?.kind === 'receber'
      ? 'Receber tudo'
      : confirmState?.kind === 'desfazer'
        ? 'Desfazer recebimento'
        : 'Estornar baixa';

  if (status === 'loading') {
    return (
      <div className="w-full flex flex-col gap-8">
        <PageHeader
          kicker="Financeiro"
          title="Contas a Receber"
          description="Acompanhe títulos em aberto, vencimentos e recebimentos da filial ativa."
          actions={
            <Button size="sm" type="button" onClick={() => refetchContas()} className="gap-2">
              <RefreshCw size={14} className="animate-spin" />
              Atualizar
            </Button>
          }
        />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <ContasReceberMetrics contas={contas} baixas={baixas} />
          </div>
          <div className="lg:col-span-4">
            <CrmAutomationCard />
          </div>
        </div>
        <LoadingState
          title="Carregando contas a receber…"
          description="Estamos reunindo títulos, baixas e indicadores financeiros da filial."
        />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="w-full flex flex-col gap-8">
        <PageHeader
          kicker="Financeiro"
          title="Contas a Receber"
          description="Acompanhe títulos em aberto, vencimentos e recebimentos da filial ativa."
          actions={
            <Button size="sm" type="button" onClick={() => refetchContas()} className="gap-2">
              <RefreshCw size={14} />
              Atualizar
            </Button>
          }
        />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <ContasReceberMetrics contas={contas} baixas={baixas} />
          </div>
          <div className="lg:col-span-4">
            <CrmAutomationCard />
          </div>
        </div>
        <ErrorState
          title={error ?? 'Erro ao carregar dados.'}
          description="Atualize a tela ou confirme a filial ativa antes de tentar novamente."
          onRetry={() => refetchContas()}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-8">
      <PageHeader
        kicker="Financeiro"
        title="Contas a Receber"
        description="Acompanhe títulos em aberto, baixas e vencimentos sem sair do fluxo operacional."
        actions={
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={() => refetchContas()} className="gap-2">
              <RefreshCw size={14} />
              Atualizar
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <ContasReceberMetrics contas={contas} baixas={baixas} />
        </div>
        <div className="lg:col-span-4">
          <CrmAutomationCard />
        </div>
      </div>

      <div className="mb-2">
        <SegmentedControl
          options={TABS.map(t => ({ id: t.key, label: t.label }))}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as CrTab)}
        />
      </div>

      <FilterBar
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: 'Buscar por cliente, pedido ou status…',
          ariaLabel: 'Buscar contas a receber'
        }}
        activeFilterCount={searchQuery ? 1 : 0}
        onClearFilters={searchQuery ? () => setSearchQuery('') : undefined}
        actions={
          <StatusBadge tone="vibrant-blue">{filteredContas.length} títulos visíveis</StatusBadge>
        }
      />

      <ContasList
        contas={contas}
        allBaixas={baixas}
        statusEfetivo={activeTabConfig.statusEfetivo}
        inFlight={inFlight}
        searchQuery={searchQuery}
        onReceber={(contaId) => setConfirmState({ kind: 'receber', contaId })}
        onBaixaParcial={handleAbrirBaixaParcial}
        onDesfazer={(contaId) => setConfirmState({ kind: 'desfazer', contaId })}
        onEstornar={(contaId, baixaId) => setConfirmState({ kind: 'estorno', contaId, baixaId })}
        onOpenDetail={setDetailContaId}
      />

      {baixaParcialConta ? (
        <BaixaParcialModal
          conta={baixaParcialConta}
          onConfirmar={handleConfirmarBaixaParcial}
          onCancelar={() => setBaixaParcialContaId(null)}
          error={modalError}
          submitting={modalSubmitting}
        />
      ) : null}

      <ContaDetailModal
        open={!!detailConta}
        conta={detailConta}
        baixas={detailBaixas}
        inFlight={detailConta ? inFlight.has(detailConta.id) : false}
        onClose={() => setDetailContaId(null)}
        onReceber={() => {
          if (detailConta) setConfirmState({ kind: 'receber', contaId: detailConta.id });
        }}
        onBaixaParcial={() => {
          if (detailConta) handleAbrirBaixaParcial(detailConta.id);
        }}
        onDesfazer={() => {
          if (detailConta) setConfirmState({ kind: 'desfazer', contaId: detailConta.id });
        }}
        onEstornar={(contaId, baixaId) => setConfirmState({ kind: 'estorno', contaId, baixaId })}
      />

      <ContaReceberConfirmModal
        open={!!confirmState && !!confirmConta}
        title={confirmTitle}
        description={confirmDescription}
        contaLabel={
          confirmConta
            ? `${confirmConta.cliente}${confirmConta.pedido_num ? ` — Pedido #${confirmConta.pedido_num}` : ''}`
            : ''
        }
        valorLabel={
          confirmState?.kind === 'receber'
            ? confirmConta
              ? fmt(getValorEmAberto(confirmConta))
              : undefined
            : confirmState?.kind === 'estorno'
              ? confirmBaixa
                ? fmt(confirmBaixa.valor)
                : undefined
              : undefined
        }
        submitting={confirmSubmitting}
        confirmLabel={confirmLabel}
        onClose={() => {
          if (!confirmSubmitting) setConfirmState(null);
        }}
        onConfirm={() => {
          void handleConfirmAction();
        }}
      />
    </div>
  );
}
