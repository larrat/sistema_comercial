import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useInterModuleStore } from '../../../app/lib/useInterModuleStore';
import type { Produto } from '../../../../types/domain';
import type { ProdutoFormValues } from '../types';
import { useProdutoStore } from '../store/useProdutoStore';
import { useProdutosQuery, useCategoriasQuery, usePaisQuery, useProdutoMutations } from '../hooks/useProdutosQuery';
import { useFilialStore } from '../../../app/useFilialStore';
import { ProdutoMetrics } from './ProdutoMetrics';
import { ProdutoListMobile, ProdutoListView } from './ProdutoListView';
import { ProdutoForm } from './ProdutoForm';
import { ProdutoDeleteConfirmModal } from './ProdutoDeleteConfirmModal';
import {
  Drawer,
  ErrorState,
  FilterBar,
  PageHeader,
  StatusBadge,
  Button,
  PillGroup,
  Shimmer
} from '../../../shared/ui';
import { SkeletonList } from '../../../shared/ui/Shimmer';
import { Wrench, Loader2, Zap, RefreshCw } from 'lucide-react';
import { listProdutos, saveProduto } from '../services/produtosApi';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useAuthStore } from '../../../app/useAuthStore';
import { toast } from 'sonner';
import { motion, type Variants } from 'framer-motion';

const pageContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const pageItem: Variants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 260, damping: 25 }
  }
};

type Modal = { tipo: 'none' } | { tipo: 'form'; produto: Produto | null };

type ProdutosPilotPageProps = {
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
    hist_cot: existing?.hist_cot || []
  };
}

function useIsMobile() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 1280px)').matches;
}

export function ProdutosPilotPage({ onOpenProduto }: ProdutosPilotPageProps) {
  const filtro = useProdutoStore((s) => s.filtro);
  const setFiltro = useProdutoStore((s) => s.setFiltro);
  const page = useProdutoStore((s) => s.page);
  const setPage = useProdutoStore((s) => s.setPage);
  const pageSize = useProdutoStore((s) => s.pageSize);
  const setPageSize = useProdutoStore((s) => s.setPageSize);
  // TanStack Queries
  const { 
    data: produtosData, 
    isLoading: isLoadingProdutos, 
    isError: isErrorProdutos, 
    error: errorProdutos,
    refetch: refetchProdutos 
  } = useProdutosQuery(filtro, page, pageSize);

  const { data: categorias = [] } = useCategoriasQuery();
  const { data: parentProdutos = [] } = usePaisQuery();
  const { save: saveMutation, remove: deleteMutation } = useProdutoMutations();

  const [visao, setVisao] = useState<'lista' | 'galeria'>('lista');
  const [filtroEstoque, setFiltroEstoque] = useState<'todos' | 'estoque' | 'zerados'>('todos');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filialId = useFilialStore((s) => s.filialId) ?? '';
  const [modal, setModal] = useState<Modal>({ tipo: 'none' });
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [sanitizing, setSanitizing] = useState(false);
  const [sanitizingProgress, setSanitizingProgress] = useState(0);

  const session = useAuthStore((s) => s.session);
  const isMobile = useIsMobile();
  
  const produtos = useMemo(() => produtosData?.rows ?? [], [produtosData]);
  const total = produtosData?.total ?? 0;

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

  const filteredProdutos = useMemo(() => {
    let list = produtos;
    if (filtroEstoque === 'estoque') {
      list = list.filter(p => (p.esal ?? 0) > 0);
    } else if (filtroEstoque === 'zerados') {
      list = list.filter(p => (p.esal ?? 0) <= 0);
    }
    return list;
  }, [produtos, filtroEstoque]);

  const paisSemSelf = useMemo(() => {
    const produtoAtual = modal.tipo === 'form' ? modal.produto : null;
    return produtoAtual ? parentProdutos.filter((p) => p.id !== produtoAtual.id) : parentProdutos;
  }, [modal, parentProdutos]);

  async function handleSalvar(values: ProdutoFormValues) {
    const existing = modal.tipo === 'form' ? modal.produto : null;
    const produto = formValuesToProduto(values, filialId, existing);
    
    saveMutation.mutate(produto, {
      onSuccess: () => {
        setModal({ tipo: 'none' });
      }
    });
  }

  async function handleRemover(id: string) {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        if (modal.tipo === 'form' && modal.produto?.id === id) {
          setModal({ tipo: 'none' });
        }
        setDeleteTargetId(null);
        if (page > 1 && produtos.length === 1) {
          setPage(page - 1);
        }
      }
    });
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

        const hasChange = 
          fixed.nome !== p.nome || 
          fixed.sku !== p.sku || 
          fixed.cat !== p.cat || 
          fixed.un !== p.un || 
          fixed.ecm !== p.ecm;

        if (hasChange) toUpdate.push(fixed);
      });

      if (toUpdate.length === 0) {
        toast.info('Nenhum erro encontrado. Cadastro está limpo.');
        return;
      }

      const chunkSize = 50;
      for (let i = 0; i < toUpdate.length; i += chunkSize) {
        const chunk = toUpdate.slice(i, i + chunkSize);
        await saveProduto(ctx, chunk);
        setSanitizingProgress(Math.round(((i + chunk.length) / toUpdate.length) * 100));
      }

      toast.success(`${toUpdate.length} produtos corrigidos com sucesso.`);
      refetchProdutos();
    } catch (err) {
      toast.error('Erro ao rodar saneamento.');
    } finally {
      setSanitizing(false);
      setSanitizingProgress(0);
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchProdutos();
    setIsRefreshing(false);
  };

  const pageHeader = (
    <PageHeader
      kicker="Catálogo"
      title={<span className="text-white font-black tracking-tight">Produtos</span>}
      description="Gerencie catálogo, estoque visível e ações rápidas da filial."
      actions={
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white/[0.03] p-1 rounded-xl border border-white/5">
            <PillGroup
              options={[
                { id: 'todos', label: 'Todos' },
                { id: 'estoque', label: 'Estoque' },
                { id: 'zerados', label: 'Zerados' }
              ]}
              activeId={filtroEstoque}
              onChange={(id) => setFiltroEstoque(id as any)}
            />
          </div>

          <div className="flex items-center bg-white/[0.03] p-1 rounded-xl border border-white/5">
            <PillGroup
              options={[
                { id: 'lista', label: 'Lista' },
                { id: 'galeria', label: 'Galeria' }
              ]}
              activeId={visao}
              onChange={(id) => setVisao(id as any)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
              onClick={handleRefresh}
              loading={isRefreshing}
              className="!rounded-xl"
            >
              <span className="hidden xl:inline">Atualizar</span>
            </Button>

            {sanitizing ? (
              <div className="flex items-center gap-2 bg-slate-50/5 px-3 py-1.5 rounded-xl border border-white/5 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-tight">{sanitizingProgress}%</span>
              </div>
            ) : (
              <Button
                variant="secondary"
                leftIcon={<Wrench className="w-4 h-4 text-amber-400" />}
                onClick={handleSanitize}
                title="Corrigir resquícios e erros de cadastro"
                className="!rounded-xl"
              >
                <span className="hidden xl:inline">Sanear</span>
              </Button>
            )}
            
            <button
              className="rf-btn-premium rf-btn-premium--primary rf-glow-cyan !py-2 !px-4 !text-xs !rounded-xl"
              onClick={() => setModal({ tipo: 'form', produto: null })}
            >
              <Zap size={14} />
              <span className="hidden sm:inline">Novo produto</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>
      }
    />
  );

  if (isLoadingProdutos) {
    return (
      <div className="flex-1 w-full flex flex-col gap-8">
        {pageHeader}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Shimmer height={120} rounded="2xl" />
          <Shimmer height={120} rounded="2xl" />
          <Shimmer height={120} rounded="2xl" />
        </div>
        <SkeletonList rows={6} />
      </div>
    );
  }

  if (isErrorProdutos) {
    return (
      <div className="flex-1 w-full flex flex-col gap-8">
        {pageHeader}
        <ProdutoMetrics produtos={filteredProdutos} />
        <ErrorState
          title={errorProdutos instanceof Error ? errorProdutos.message : 'Erro ao carregar produtos.'}
          onRetry={refetchProdutos}
        />
      </div>
    );
  }

  return (
    <motion.div 
      className="flex-1 w-full flex flex-col gap-8"
      variants={pageContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={pageItem}>
        {pageHeader}
      </motion.div>

      <motion.div variants={pageItem}>
        <ProdutoMetrics produtos={filteredProdutos} />
      </motion.div>

      <motion.div variants={pageItem} className="px-1">
        <FilterBar
          className="produtos-filter-bar !bg-white/[0.02] !border-white/5 !backdrop-blur-md !py-3 !rounded-2xl shadow-inner"
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
      </motion.div>

      <motion.div variants={pageItem}>
        {isMobile ? (
          <ProdutoListMobile
            produtos={filteredProdutos}
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
            produtos={filteredProdutos}
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
      </motion.div>

      <Drawer
        open={modal.tipo === 'form'}
        title={modal.tipo === 'form' && modal.produto ? 'Editar produto' : 'Novo produto'}
        onClose={() => !saveMutation.isPending && setModal({ tipo: 'none' })}
        closeOnOverlayClick={!saveMutation.isPending}
      >
        {modal.tipo === 'form' ? (
          <ProdutoForm
            produto={modal.produto}
            pais={paisSemSelf}
            saving={saveMutation.isPending}
            error={saveMutation.error instanceof Error ? saveMutation.error.message : null}
            onSalvar={handleSalvar}
            onCancelar={() => setModal({ tipo: 'none' })}
          />
        ) : null}
      </Drawer>

      <ProdutoDeleteConfirmModal
        open={!!deleteTarget}
        target={deleteTarget}
        submitting={deleteMutation.isPending}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteTargetId(null);
        }}
        onConfirm={() => {
          if (deleteTarget) handleRemover(deleteTarget.id);
        }}
      />
    </motion.div>
  );
}
