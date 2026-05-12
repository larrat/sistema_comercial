import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useInterModuleStore } from '../../../app/lib/useInterModuleStore';
import type { Produto } from '../../../../types/domain';
import type { ProdutoFormValues } from '../types';
import { useProdutoStore, selectCategorias } from '../store/useProdutoStore';
import { useProdutoMutations } from '../hooks/useProdutoMutations';
import { useFilialStore } from '../../../app/useFilialStore';
import { ProdutoMetrics } from './ProdutoMetrics';
import { ProdutoListMobile, ProdutoListView } from './ProdutoListView';
import { ProdutoForm } from './ProdutoForm';
import { ProdutoDeleteConfirmModal } from './ProdutoDeleteConfirmModal';
import {
  Drawer,
  ErrorState,
  FilterBar,
  LoadingState,
  PageHeader,
  StatusBadge
} from '../../../shared/ui';
import { Wrench, Loader2, CheckCircle } from 'lucide-react';
import { listProdutos, saveProduto } from '../services/produtosApi';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useAuthStore } from '../../../app/useAuthStore';
import { useToastStore } from '../../../app/lib/useToastStore';

type Modal = { tipo: 'none' } | { tipo: 'form'; produto: Produto | null };

type ProdutosPilotPageProps = {
  onRetryLoad?: () => void;
  onOpenProduto?: (_produtoId: string, _options?: { edit?: boolean }) => void;
};

function formValuesToProduto(
  values: ProdutoFormValues,
  filialId: string,
  existing: Produto | null
): Produto {
  const custo = parseFloat(values.custo) || 0;
  const precoVarejo = parseFloat(values.precoVarejo) || 0;
  const mkv =
    precoVarejo > 0 && custo > 0
      ? (precoVarejo / custo - 1) * 100
      : parseFloat(values.markupVarejo) || 0;

  return {
    id: values.id ?? crypto.randomUUID(),
    filial_id: filialId,
    produto_pai_id: values.produto_pai_id ?? null,
    nome: values.nome.trim(),
    sku: values.sku.trim() || undefined,
    un: values.un || 'un',
    cat: values.cat.trim() || undefined,
    custo,
    mkv,
    mka: parseFloat(values.markupAtacado) || 0,
    pfa: parseFloat(values.precoFixoAtacado) || 0,
    dv: parseFloat(values.descontoVarejo) || 0,
    da: parseFloat(values.descontoAtacado) || 0,
    qtmin: parseFloat(values.qtmin) || 0,
    emin: parseFloat(values.emin) || 0,
    esal: parseFloat(values.esal) || 0,
    ecm: parseFloat(values.ecm) || custo,
    hist_cot: existing?.hist_cot ?? []
  };
}

function useIsMobile() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 1280px)').matches;
}

export function ProdutosPilotPage({ onRetryLoad, onOpenProduto }: ProdutosPilotPageProps) {
  const produtos = useProdutoStore((s) => s.produtos);
  const categorias = useProdutoStore(useShallow(selectCategorias));
  const parentProdutos = useProdutoStore((s) => s.parentProdutos);
  const status = useProdutoStore((s) => s.status);
  const storeError = useProdutoStore((s) => s.error);
  const page = useProdutoStore((s) => s.page);
  const pageSize = useProdutoStore((s) => s.pageSize);
  const total = useProdutoStore((s) => s.total);
  const filtro = useProdutoStore((s) => s.filtro);
  const saldos = useProdutoStore((s) => s.saldos);
  const setFiltro = useProdutoStore((s) => s.setFiltro);
  const setPage = useProdutoStore((s) => s.setPage);
  const setPageSize = useProdutoStore((s) => s.setPageSize);

  const {
    submitProduto,
    submitCascadeRename,
    submitCascadeFilhos,
    deleteProdutoById,
    saving,
    deletingId,
    error: mutError
  } = useProdutoMutations();
  const filialId = useFilialStore((s) => s.filialId) ?? '';

  const [modal, setModal] = useState<Modal>({ tipo: 'none' });
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [sanitizing, setSanitizing] = useState(false);
  const [sanitizingProgress, setSanitizingProgress] = useState(0);

  const session = useAuthStore((s) => s.session);

  const isMobile = useIsMobile();
  const deleteTarget = deleteTargetId
    ? (produtos.find((produto) => produto.id === deleteTargetId) ?? null)
    : null;
  const activeFilterCount = [filtro.q, filtro.cat].filter(Boolean).length;
  const abrirNovoProduto = useInterModuleStore((s) => s.abrirNovoProduto);

  useEffect(() => {
    if (!abrirNovoProduto) return;
    useInterModuleStore.getState().clearNovoProduto();
    setModal({ tipo: 'form', produto: null });
  }, [abrirNovoProduto]);

  const paisSemSelf = useMemo(
    () => {
      const produtoAtual = modal.tipo === 'form' ? modal.produto : null;
      return produtoAtual ? parentProdutos.filter((p) => p.id !== produtoAtual.id) : parentProdutos;
    },
    [modal, parentProdutos]
  );

  async function handleSalvar(values: ProdutoFormValues) {
    const existing = modal.tipo === 'form' ? modal.produto : null;
    const novoNome = values.nome.trim();
    const nomeAlterado = existing && novoNome !== existing.nome;
    const catAlterada = existing && (values.cat || '').trim() !== (existing.cat || '');
    const unAlterada = existing && (values.un || '').trim() !== (existing.un || '');

    const produto = formValuesToProduto(values, filialId, existing);
    try {
      await submitProduto(produto);

      if (existing) {
        if (nomeAlterado) {
          const devePropagar = window.confirm(
            `O nome do produto foi alterado para "${novoNome}". Deseja atualizar o nome em todo o histórico de vendas e registros antigos?`
          );
          if (devePropagar) {
            await submitCascadeRename(existing.id, novoNome);
          }
        }

        if (!existing.produto_pai_id && (catAlterada || unAlterada)) {
          const devePropagarFilhos = window.confirm(
            `A classificação do produto foi alterada. Deseja replicar a Categoria e Unidade para todas as variantes (filhos)?`
          );
          if (devePropagarFilhos) {
            await submitCascadeFilhos(existing.id, {
              cat: values.cat?.trim(),
              un: values.un?.trim()
            });
          }
        }
      }

      setModal({ tipo: 'none' });
      onRetryLoad?.();
    } catch {
      // erro já tratado no hook
    }
  }

  async function handleRemover(id: string) {
    try {
      await deleteProdutoById(id);
      if (modal.tipo === 'form' && modal.produto?.id === id) {
        setModal({ tipo: 'none' });
      }
      setDeleteTargetId(null);
      if (page > 1 && produtos.length === 1) {
        setPage(page - 1);
        return;
      }
      onRetryLoad?.();
    } catch {
      // erro já tratado no hook
    }
  }

  function handleMovimentar(id: string) {
    useInterModuleStore.getState().navegarParaMovProduto(id);
  }

  async function handleSanitize() {
    if (!session?.access_token || !filialId) return;
    if (!window.confirm('Deseja rodar o saneamento em todos os produtos? Isso removerá resquícios de texto e corrigirá campos vazios para padrão do banco.')) return;

    setSanitizing(true);
    setSanitizingProgress(0);
    const { url, key } = getSupabaseConfig();
    const ctx = { url, key, token: session.access_token, filialId };

    try {
      // 1. Buscar TODOS os produtos (sem paginação)
      const all = await listProdutos(ctx);
      const toUpdate: any[] = [];

      all.forEach(p => {
        const fixed: any = {
          ...p,
          nome: p.nome.trim(),
          sku: p.sku?.trim() || null,
          cat: p.cat?.trim() || null,
          un: p.un?.trim() || 'un',
          ecm: (p.ecm || 0) <= 0 ? (p.custo || 0) : p.ecm
        };

        // Verifica se houve mudança real para evitar updates desnecessários
        const hasChange = 
          fixed.nome !== p.nome || 
          fixed.sku !== p.sku || 
          fixed.cat !== p.cat || 
          fixed.un !== p.un || 
          fixed.ecm !== p.ecm;

        if (hasChange) toUpdate.push(fixed);
      });

      if (toUpdate.length === 0) {
        useToastStore.getState().addToast('Nenhum erro encontrado. Cadastro está limpo.', 'info');
        return;
      }

      // 2. Salvar em lotes de 50 para segurança
      const chunkSize = 50;
      for (let i = 0; i < toUpdate.length; i += chunkSize) {
        const chunk = toUpdate.slice(i, i + chunkSize);
        await saveProduto(ctx, chunk);
        setSanitizingProgress(Math.round(((i + chunk.length) / toUpdate.length) * 100));
      }

      useToastStore.getState().addToast(`${toUpdate.length} produtos corrigidos com sucesso.`, 'success');
      onRetryLoad?.();
    } catch (err) {
      console.error(err);
      useToastStore.getState().addToast('Erro ao rodar saneamento.', 'error');
    } finally {
      setSanitizing(false);
      setSanitizingProgress(0);
    }
  }

  const pageHeader = (
    <PageHeader
      kicker="Catálogo"
      title="Produtos"
      description="Gerencie catálogo, estoque visível e ações rápidas da filial sem sair da listagem principal."
      meta={
        <StatusBadge tone="info">
          {total} no total · página {page}
        </StatusBadge>
      }
      actions={
        <div className="flex items-center gap-3">
          {sanitizing ? (
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">Corrigindo {sanitizingProgress}%</span>
            </div>
          ) : (
            <button
              className="btn btn-sm flex items-center gap-2 hover:bg-slate-100 transition-colors"
              type="button"
              onClick={handleSanitize}
              title="Corrigir resquícios e erros de cadastro"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sanear Dados</span>
            </button>
          )}
          <button
            className="btn btn-p btn-sm"
            type="button"
            onClick={() => setModal({ tipo: 'form', produto: null })}
          >
            Novo produto
          </button>
        </div>
      }
    />
  );

  if (status === 'loading') {
    return (
      <main className="max-w-[1600px] mx-auto px-8 py-8 lg:px-12 w-full flex flex-col gap-8">
        {pageHeader}
        <ProdutoMetrics produtos={produtos} />
        <LoadingState
          title="Carregando produtos..."
          description="Estamos preparando a lista e o saldo atual da filial."
        />
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="max-w-[1600px] mx-auto px-8 py-8 lg:px-12 w-full flex flex-col gap-8">
        {pageHeader}
        <ProdutoMetrics produtos={produtos} />
        <ErrorState
          title={storeError ?? 'Erro ao carregar produtos.'}
          description="Revise a sessão, a filial ativa ou tente recarregar os dados."
          onRetry={onRetryLoad}
        />
      </main>
    );
  }

  return (
    <main className="max-w-[1600px] mx-auto px-8 py-8 lg:px-12 w-full flex flex-col gap-8">
      {pageHeader}

      <ProdutoMetrics produtos={produtos} />

      <FilterBar
        className="produtos-filter-bar"
        search={{
          value: filtro.q,
          onChange: (value) => setFiltro({ q: value }),
          placeholder: 'Buscar por nome ou SKU...',
          ariaLabel: 'Buscar produtos'
        }}
        filters={[
          {
            key: 'categoria',
            value: filtro.cat,
            onChange: (value) => setFiltro({ cat: value }),
            ariaLabel: 'Filtrar por categoria',
            options: [
              { value: '', label: 'Todas as categorias' },
              ...categorias.map((categoria) => ({ value: categoria, label: categoria }))
            ]
          }
        ]}
        activeFilterCount={activeFilterCount}
        onClearFilters={activeFilterCount ? () => setFiltro({ q: '', cat: '' }) : undefined}
      />

      {mutError ? <ErrorState title={mutError} compact /> : null}

      {isMobile ? (
        <ProdutoListMobile
          produtos={produtos}
          saldos={saldos}
          totalCount={total}
          hasFilters={activeFilterCount > 0}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onNovo={() => setModal({ tipo: 'form', produto: null })}
          onDetalhe={(id) => onOpenProduto?.(id)}
          onEditar={(id) => onOpenProduto?.(id, { edit: true })}
          onMovimentar={handleMovimentar}
          onRemover={(id) => setDeleteTargetId(id)}
        />
      ) : (
        <ProdutoListView
          produtos={produtos}
          saldos={saldos}
          totalCount={total}
          hasFilters={activeFilterCount > 0}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onNovo={() => setModal({ tipo: 'form', produto: null })}
          onDetalhe={(id) => onOpenProduto?.(id)}
          onEditar={(id) => onOpenProduto?.(id, { edit: true })}
          onMovimentar={handleMovimentar}
          onRemover={(id) => setDeleteTargetId(id)}
        />
      )}

      <Drawer
        open={modal.tipo === 'form'}
        title={modal.tipo === 'form' && modal.produto ? 'Editar produto' : 'Novo produto'}
        onClose={() => !saving && setModal({ tipo: 'none' })}
        closeOnOverlayClick={!saving}
      >
        {modal.tipo === 'form' ? (
          <ProdutoForm
            produto={modal.produto}
            pais={paisSemSelf}
            saving={saving}
            error={mutError}
            onSalvar={handleSalvar}
            onCancelar={() => setModal({ tipo: 'none' })}
          />
        ) : null}
      </Drawer>

      {deletingId ? <LoadingState title="Removendo produto..." compact /> : null}

      <ProdutoDeleteConfirmModal
        open={!!deleteTarget}
        target={deleteTarget}
        submitting={Boolean(deletingId)}
        onClose={() => {
          if (!deletingId) setDeleteTargetId(null);
        }}
        onConfirm={() => {
          if (deleteTarget) void handleRemover(deleteTarget.id);
        }}
      />
    </main>
  );
}
