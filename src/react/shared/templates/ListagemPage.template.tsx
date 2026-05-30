/**
 * TEMPLATE — Tela de Listagem
 * ─────────────────────────────────────────────────────────────────────
 * Como usar:
 *   1. Copie este arquivo para: features/[modulo]/components/[Modulo]Page.tsx
 *   2. Substitua todos os [MODULO] / [Item] / [Tipo] pelo nome do seu módulo
 *   3. Implemente o hook use[Modulo] com a lógica de dados
 *   4. Defina as colunas da tabela em `columns`
 * ─────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import {
  PageHeader,
  FilterBar,
  DataTable,
  type DataTableColumn,
  EmptyState,
  LoadingState,
  ErrorState,
  Button,
  ActionMenu,
  StatusBadge,
  ConfirmModal,
} from '@/react/shared/ui';

// Substitua pelo seu tipo real
type [Item] = {
  id: string;
  nome: string;
  status: string;
};

// Substitua pelo seu hook real
// import { use[Modulo] } from '../hooks/use[Modulo]';

export function [Modulo]Page() {
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<[Item] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // const { data, isLoading, error, remove } = use[Modulo]({ search });
  // — substituir pelas suas variáveis reais —
  const data: [Item][] = [];
  const isLoading = false;
  const error: Error | null = null;

  const columns: DataTableColumn<[Item]>[] = [
    {
      key: 'nome',
      header: 'Nome',
      render: (row) => (
        <span className="font-semibold text-white">{row.nome}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'acoes',
      header: '',
      align: 'right',
      render: (row) => (
        <ActionMenu
          items={[
            { label: 'Editar', onClick: () => { setEditingItem(row); setIsFormOpen(true); } },
            { label: 'Excluir', onClick: () => setDeletingId(row.id), variant: 'destructive' },
          ]}
        />
      ),
    },
  ];

  function handleSaved() {
    setIsFormOpen(false);
    setEditingItem(null);
  }

  function handleCancel() {
    setIsFormOpen(false);
    setEditingItem(null);
  }

  async function handleDelete() {
    if (!deletingId) return;
    // await remove(deletingId);
    setDeletingId(null);
  }

  return (
    <>
      {/* ── CABEÇALHO ── */}
      <PageHeader
        kicker="[MODULO]"
        title="[Título da Tela]"
        description="[Descrição breve do que é gerenciado aqui.]"
        actions={
          <Button onClick={() => { setEditingItem(null); setIsFormOpen(true); }}>
            Novo [Item]
          </Button>
        }
      />

      {/* ── FILTROS ── */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar [itens]..."
      />

      {/* ── CONTEÚDO ── */}
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error.message} />
      ) : data.length === 0 ? (
        <EmptyState
          title="Nenhum [item] encontrado"
          description={search ? 'Tente outro termo de busca.' : 'Comece criando o primeiro [item].'}
          action={
            <Button onClick={() => setIsFormOpen(true)}>
              Novo [Item]
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} data={data} />
      )}

      {/* ── FORMULÁRIO MODAL ── */}
      {isFormOpen && (
        // Substitua pelo seu Form real: <[Modulo]Form ... />
        <div>Form aqui</div>
      )}

      {/* ── CONFIRMAÇÃO DE EXCLUSÃO ── */}
      <ConfirmModal
        open={!!deletingId}
        title="Excluir [item]"
        description="Esta ação não pode ser desfeita. Deseja continuar?"
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </>
  );
}
