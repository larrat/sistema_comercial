import { useMemo, useState } from 'react';
import {
  PageHeader,
  StatCard,
  FilterBar,
  DataTable,
  ActionMenu,
  StatusBadge,
  Modal,
  Button,
  Badge
} from '../../../shared/ui';
import { useCampanhasStore } from '../store/useCampanhasStore';
import { useCampanhasMutations } from '../hooks/useCampanhasMutations';
import { useCampanhas, useCampanhaEnvios } from '../hooks/useCampanhasQueries';
import { CampanhaModal } from './CampanhaModal';
import { WhatsAppPreviewModal } from './WhatsAppPreviewModal';
import { FilaWhatsAppSection } from './FilaWhatsAppSection';
import { HistoricoEnviosSection } from './HistoricoEnviosSection';
import type { Campanha } from '../../../../types/domain';

const LABEL_TIPO: Record<string, string> = {
  aniversario: 'Aniversário',
  reativacao: 'Reativação',
  promocao: 'Promoção',
  outro: 'Outro'
};

export function CampanhasPage() {
  const { data: campanhas = [], isLoading: loadingCampanhas, error: errorCampanhas, refetch: refetchCampanhas } = useCampanhas();
  const { data: envios = [], isLoading: loadingEnvios } = useCampanhaEnvios();

  const loading = loadingCampanhas || loadingEnvios;
  const error = errorCampanhas ? (errorCampanhas instanceof Error ? errorCampanhas.message : 'Erro ao carregar campanhas.') : null;

  const openCampModal = useCampanhasStore((s) => s.openCampModal);

  const [query, setQuery] = useState('');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [confirmarRemocao, setConfirmarRemocao] = useState<Campanha | null>(null);

  const { remover, gerarFila } = useCampanhasMutations();

  const ativas = campanhas.filter((c) => c.ativo !== false).length;
  const pendentes = envios.filter((e) => (e.status ?? 'pendente') === 'pendente').length;
  const enviados = envios.filter((e) => e.status === 'enviado').length;
  const falhos = envios.filter((e) => e.status === 'falhou').length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return campanhas.filter((c) => {
      const matchQuery = !q || c.nome.toLowerCase().includes(q);
      const matchTipo = tipoFilter === 'todos' || c.tipo === tipoFilter;
      const matchStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'ativas' && c.ativo !== false) ||
        (statusFilter === 'inativas' && c.ativo === false);
      return matchQuery && matchTipo && matchStatus;
    });
  }, [campanhas, query, tipoFilter, statusFilter]);

  const activeFilterCount =
    (query ? 1 : 0) + (tipoFilter !== 'todos' ? 1 : 0) + (statusFilter !== 'todos' ? 1 : 0);

  const columns = [
    {
      key: 'nome',
      header: 'Campanha',
      render: (c: Campanha) => <span className="fw-medium">{c.nome}</span>
    },
    {
      key: 'tipo',
      header: 'Tipo',
      width: '130px',
      render: (c: Campanha) => LABEL_TIPO[c.tipo ?? ''] ?? c.tipo ?? '—'
    },
    {
      key: 'canal',
      header: 'Canal',
      width: '110px',
      render: (c: Campanha) => c.canal ?? '—'
    },
    {
      key: 'dias',
      header: 'Antecedência',
      width: '130px',
      align: 'right' as const,
      render: (c: Campanha) => (c.dias_antecedencia != null ? `${c.dias_antecedencia}d` : '—')
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (c: Campanha) =>
        c.ativo !== false ? (
          <StatusBadge tone="success">Ativa</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">Inativa</StatusBadge>
        )
    }
  ];

  return (
    <div className="w-full flex flex-col gap-8">
      <PageHeader
        kicker="Marketing"
        title="Campanhas"
        description="Gerencie campanhas de marketing e fila de WhatsApp."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-3 lg:gap-6 mt-4 lg:mt-0 w-full lg:w-auto">
            <Button onClick={() => refetchCampanhas()} loading={loading}>
              {loading ? 'Carregando…' : 'Atualizar'}
            </Button>
            <Button variant="primary" onClick={() => openCampModal()}>
              + Nova campanha
            </Button>
          </div>
        }
      />

      <div className="rf-ui-stat-grid">
        <StatCard label="Campanhas ativas" value={ativas} />
        <StatCard label="Pendentes" value={pendentes} tone="warning" />
        <StatCard label="Enviados" value={enviados} tone="success" />
        <StatCard label="Falhos" value={falhos} tone="danger" />
      </div>

      <FilterBar
        search={{ value: query, onChange: setQuery, placeholder: 'Buscar campanha…' }}
        filters={[
          {
            key: 'tipo',
            value: tipoFilter,
            onChange: setTipoFilter,
            options: [
              { value: 'todos', label: 'Todos os tipos' },
              { value: 'aniversario', label: 'Aniversário' },
              { value: 'reativacao', label: 'Reativação' },
              { value: 'promocao', label: 'Promoção' },
              { value: 'outro', label: 'Outro' }
            ]
          },
          {
            key: 'status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'todos', label: 'Todos' },
              { value: 'ativas', label: 'Ativas' },
              { value: 'inativas', label: 'Inativas' }
            ]
          }
        ]}
        activeFilterCount={activeFilterCount}
        onClearFilters={() => {
          setQuery('');
          setTipoFilter('todos');
          setStatusFilter('todos');
        }}
      />

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(c) => c.id}
        loading={loading}
        error={error ?? undefined}
        emptyTitle="Nenhuma campanha encontrada."
        emptyDescription={
          activeFilterCount > 0
            ? 'Tente ajustar os filtros.'
            : 'Crie a primeira campanha para começar.'
        }
        emptyAction={
          activeFilterCount === 0 ? (
            <Button variant="primary" onClick={() => openCampModal()}>
              Criar primeira campanha
            </Button>
          ) : undefined
        }
        renderActions={(c) => (
          <ActionMenu
            items={[
              { key: 'editar', label: 'Editar', onClick: () => openCampModal(c) },
              { key: 'fila', label: 'Gerar fila', onClick: () => void gerarFila(c.id) },
              {
                key: 'remover',
                label: 'Remover',
                danger: true,
                onClick: () => setConfirmarRemocao(c)
              }
            ]}
          />
        )}
      />

      <FilaWhatsAppSection />
      <HistoricoEnviosSection />

      <CampanhaModal />
      <WhatsAppPreviewModal />

      <Modal
        open={confirmarRemocao !== null}
        title="Remover campanha"
        onClose={() => setConfirmarRemocao(null)}
        footer={
          <>
            <Button onClick={() => setConfirmarRemocao(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmarRemocao) void remover(confirmarRemocao.id);
                setConfirmarRemocao(null);
              }}
            >
              Remover
            </Button>
          </>
        }
      >
        <p>
          Tem certeza que deseja remover a campanha{' '}
          <strong>"{confirmarRemocao?.nome}"</strong>? Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
}
