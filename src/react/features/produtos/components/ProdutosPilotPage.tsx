import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { useInterModuleStore } from '../../../app/lib/useInterModuleStore';
import { formValuesToProduto } from '../hooks/useProdutoCalculations';
import type { Produto } from '../../../../types/domain';
import type { ProdutoFormValues } from '../types';
import { useProdutoStore } from '../store/useProdutoStore';
import { useProdutosQuery, useCategoriasQuery, usePaisQuery, useProdutoMutations } from '../hooks/useProdutosQuery';
import { useFilialStore } from '../../../app/useFilialStore';
import { useIsMobile } from '../../../shared/hooks/useIsMobile';
import { ProdutoMetrics } from './ProdutoMetrics';
import { ProdutoListMobile, ProdutoListView } from './ProdutoListView';
import { ProdutoForm } from './ProdutoForm';
import { ProdutoDeleteConfirmModal } from './ProdutoDeleteConfirmModal';
import { ImportacaoXmlModal } from './ImportacaoXmlModal';
import {

  ErrorState,
  FilterBar,
  PageHeader,
  StatusBadge,
  Button,
  PillGroup,
  Shimmer,
  SkeletonList,
  ConfirmModal
} from '../../../shared/ui';
import { Wrench, Loader2, Zap, RefreshCw, FileText } from 'lucide-react';
import { listProdutos, saveProduto } from '../services/produtosApi';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useAuthStore } from '../../../app/useAuthStore';
import { toast } from 'sonner';
import { motion, type Variants } from 'framer-motion';
import { exportToCSV } from '../../../shared/lib/exportUtils';
import { useKeyboardShortcuts } from '../../../shared/hooks/useKeyboardShortcuts';

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
  const { save: saveMutation, saveGrade, remove: deleteMutation } = useProdutoMutations();

  const [visao, setVisao] = useState<'lista' | 'galeria'>('lista');
  const [modal, setModal] = useState<Modal>({ tipo: 'none' });
  const [xmlModalOpen, setXmlModalOpen] = useState(false);
  const [filtroEstoque, setFiltroEstoque] = useState<'todos' | 'estoque' | 'zerados'>('todos');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filialId = useFilialStore((s) => s.filialId) ?? '';
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [sanitizing, setSanitizing] = useState(false);
  const [sanitizingProgress, setSanitizingProgress] = useState(0);
  const [showSanitizeConfirm, setShowSanitizeConfirm] = useState(false);

  const session = useAuthStore((s) => s.session);
  const isMobile = useIsMobile(1280);
  const navigate = useNavigate();
  
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

  const handleExport = () => {
    if (!filteredProdutos.length) {
      toast.warning('Nenhum produto para exportar.');
      return;
    }
    exportToCSV(
      filteredProdutos,
      [
        { key: 'sku', label: 'SKU' },
        { key: 'nome', label: 'Nome' },
        { key: 'cat', label: 'Categoria' },
        { key: 'esal', label: 'Estoque' },
        { key: (row: Produto) => row.pfa ?? 0, label: 'Preço Venda' }
      ],
      'produtos'
    );
    toast.success('Arquivo exportado com sucesso.');
  };

  useKeyboardShortcuts([
    {
      key: 'e',
      metaKey: true,
      preventDefault: true,
      handler: handleExport
    },
    {
      key: 'n',
      metaKey: true,
      preventDefault: true,
      handler: () => navigate('/app/produtos/novo')
    }
  ]);

  const filteredProdutos = useMemo(() => {
    let list = produtos;
    if (filtroEstoque === 'estoque') {
      list = list.filter(p => {
        const stock = (!p.produto_pai_id && p.variantes && p.variantes.length > 0)
          ? p.variantes.reduce((acc: number, v: any) => acc + Number(v.esal || 0), 0)
          : Number(p.esal || 0);
        return stock > 0;
      });
    } else if (filtroEstoque === 'zerados') {
      list = list.filter(p => {
        const stock = (!p.produto_pai_id && p.variantes && p.variantes.length > 0)
          ? p.variantes.reduce((acc: number, v: any) => acc + Number(v.esal || 0), 0)
          : Number(p.esal || 0);
        return stock <= 0;
      });
    }
    return list;
  }, [produtos, filtroEstoque]);

  const paisSemSelf = useMemo(() => {
    const produtoAtual = modal.tipo === 'form' ? modal.produto : null;
    return produtoAtual ? parentProdutos.filter((p) => p.id !== produtoAtual.id) : parentProdutos;
  }, [modal, parentProdutos]);

  async function handleSalvar(values: ProdutoFormValues, grade?: string[], cores?: string[]) {
    const existing = modal.tipo === 'form' ? modal.produto : null;
    const parent = formValuesToProduto(values, filialId, existing);
    
    const hasGrade = grade && grade.length > 0;
    const hasCores = cores && cores.length > 0;

    if (hasGrade || hasCores) {
      saveGrade.mutate({ parent, cores: cores || [], tamanhos: grade || [] }, {
        onSuccess: () => {
          setModal({ tipo: 'none' });
        }
      });
    } else {
      saveMutation.mutate([parent] as any, {
        onSuccess: () => {
          setModal({ tipo: 'none' });
        }
      });
    }
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

  async function executeSanitize() {
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
      title="Produtos"
      description="Gerencie catálogo, estoque visível e ações rápidas da filial."
      actions={
          <div className="flex flex-wrap items-center justify-end gap-3 lg:gap-6 mt-4 lg:mt-0 w-full lg:w-auto">
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
              className="!px-3 text-slate-400 hover:text-emerald-400"
              onClick={() => setXmlModalOpen(true)}
              title="Importar XML NF-e"
            >
              <FileText size={16} />
            </Button>
            <Button
              variant="secondary"
              leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
              onClick={handleRefresh}
              loading={isRefreshing}
              className="!rounded-xl"
            >
              <span className="hidden xl:inline">Atualizar</span>
            </Button>

            <Button
              variant="secondary"
              onClick={handleExport}
              title="Exportar Produtos (Cmd+E)"
              className="!rounded-xl"
            >
              CSV
            </Button>

            {sanitizing ? (
              <div className="flex items-center gap-2 bg-slate-50/5 px-3 py-1.5 rounded-xl border border-white/5 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
                <span className="text-sm font-medium text-slate-400">{sanitizingProgress}%</span>
              </div>
            ) : (
              <Button
                variant="secondary"
                leftIcon={<Wrench className="w-4 h-4 text-amber-400" />}
                onClick={() => setShowSanitizeConfirm(true)}
                title="Corrigir resquícios e erros de cadastro"
                className="!rounded-xl"
              >
                <span className="hidden xl:inline">Sanear</span>
              </Button>
            )}
            
            <Button
              variant="primary"
              size="sm"
              className="rf-glow-cyan !rounded-xl"
              onClick={() => navigate('/app/produtos/novo')}
              leftIcon={<Zap size={14} />}
            >
              <span className="hidden sm:inline">Novo produto</span>
              <span className="sm:hidden">Novo</span>
            </Button>
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
            placeholder: 'Buscar por nome ou SKU…',
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
            onNovo={() => navigate('/app/produtos/novo')}
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
            onNovo={() => navigate('/app/produtos/novo')}
            onDetalhe={(id) => onOpenProduto?.(id)}
            onEditar={(id) => onOpenProduto?.(id, { edit: true })}
            onMovimentar={handleMovimentar}
            onRemover={(id) => setDeleteTargetId(id)}
          />
        )}
      </motion.div>


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

      <ConfirmModal
        open={showSanitizeConfirm}
        title="Sanear Produtos"
        description="Deseja rodar o saneamento em todos os produtos? Isso removerá resquícios de texto e corrigirá campos vazios para padrão do banco."
        onCancel={() => setShowSanitizeConfirm(false)}
        onConfirm={() => {
          setShowSanitizeConfirm(false);
          void executeSanitize();
        }}
      />
    </motion.div>
  );
}
