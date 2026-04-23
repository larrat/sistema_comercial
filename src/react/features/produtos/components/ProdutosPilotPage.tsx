import { useState } from 'react';
import type { Produto } from '../../../../types/domain';
import type { ProdutoFormValues } from '../types';
import { useProdutoStore, selectFilteredProdutos, selectCategorias } from '../store/useProdutoStore';
import { useProdutoMutations } from '../hooks/useProdutoMutations';
import { useFilialStore } from '../../../app/useFilialStore';
import { ProdutoMetrics } from './ProdutoMetrics';
import { ProdutoListView, ProdutoListMobile } from './ProdutoListView';
import { ProdutoDetailPanel } from './ProdutoDetailPanel';
import { ProdutoForm } from './ProdutoForm';

type Modal =
  | { tipo: 'none' }
  | { tipo: 'form'; produto: Produto | null }
  | { tipo: 'detalhe'; produto: Produto };

function formValuesToProduto(values: ProdutoFormValues, filialId: string, existing: Produto | null): Produto {
  const custo = parseFloat(values.custo) || 0;
  const precoVarejo = parseFloat(values.precoVarejo) || 0;
  const mkv = precoVarejo > 0 && custo > 0
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

export function ProdutosPilotPage() {
  const todos = useProdutoStore((s) => s.produtos);
  const filtrados = useProdutoStore(selectFilteredProdutos);
  const categorias = useProdutoStore(selectCategorias);
  const status = useProdutoStore((s) => s.status);
  const storeError = useProdutoStore((s) => s.error);
  const filtro = useProdutoStore((s) => s.filtro);
  const saldos = useProdutoStore((s) => s.saldos);
  const setFiltro = useProdutoStore((s) => s.setFiltro);

  const { submitProduto, deleteProdutoById, saving, error: mutError } = useProdutoMutations();
  const filialId = useFilialStore((s) => s.filialId) ?? '';

  const [modal, setModal] = useState<Modal>({ tipo: 'none' });

  const isMobile = useIsMobile();
  const paisSemSelf = (modal.tipo === 'form' && modal.produto)
    ? todos.filter((p) => !p.produto_pai_id && p.id !== modal.produto!.id)
    : todos.filter((p) => !p.produto_pai_id);

  async function handleSalvar(values: ProdutoFormValues) {
    const existing = modal.tipo === 'form' ? modal.produto : null;
    const produto = formValuesToProduto(values, filialId, existing);
    try {
      await submitProduto(produto);
      setModal({ tipo: 'none' });
    } catch {
      // erro já está em mutError
    }
  }

  async function handleRemover(id: string) {
    if (!window.confirm('Remover produto?')) return;
    try {
      await deleteProdutoById(id);
    } catch {
      // erro já está em mutError
    }
  }

  function handleMovimentar(id: string) {
    // Notifica o legado para abrir o modal de movimentação de estoque
    window.dispatchEvent(new CustomEvent('sc:abrir-mov-produto', { detail: { id } }));
  }

  if (status === 'loading') {
    return (
      <div style={{ padding: 24 }}>
        <div className="sk-card">
          <div className="sk-line" />
          <div className="sk-line" />
          <div className="sk-line" />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ padding: 24 }}>
        <div className="alert alert-error">{storeError ?? 'Erro ao carregar produtos.'}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ProdutoMetrics
          produtos={todos}
          categorias={categorias}
          catSelecionada={filtro.cat}
          onCatChange={(cat) => setFiltro({ cat })}
        />
        <button
          className="btn btn-p"
          style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}
          onClick={() => setModal({ tipo: 'form', produto: null })}
        >
          + Produto
        </button>
      </div>

      <input
        className="inp"
        placeholder="Buscar por nome ou SKU..."
        value={filtro.q}
        onChange={(e) => setFiltro({ q: e.target.value })}
      />

      {mutError && <div className="alert alert-error">{mutError}</div>}

      {isMobile ? (
        <ProdutoListMobile
          filtrados={filtrados}
          todos={todos}
          saldos={saldos}
          totalCount={todos.length}
          onDetalhe={(id) => {
            const p = todos.find((x) => x.id === id);
            if (p) setModal({ tipo: 'detalhe', produto: p });
          }}
          onEditar={(id) => {
            const p = todos.find((x) => x.id === id);
            if (p) setModal({ tipo: 'form', produto: p });
          }}
          onMovimentar={handleMovimentar}
          onRemover={handleRemover}
        />
      ) : (
        <ProdutoListView
          filtrados={filtrados}
          todos={todos}
          saldos={saldos}
          totalCount={todos.length}
          onDetalhe={(id) => {
            const p = todos.find((x) => x.id === id);
            if (p) setModal({ tipo: 'detalhe', produto: p });
          }}
          onEditar={(id) => {
            const p = todos.find((x) => x.id === id);
            if (p) setModal({ tipo: 'form', produto: p });
          }}
          onMovimentar={handleMovimentar}
          onRemover={handleRemover}
        />
      )}

      {/* Modal de detalhe */}
      {modal.tipo === 'detalhe' && (
        <div className="modal-overlay" onClick={() => setModal({ tipo: 'none' })}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <ProdutoDetailPanel
              produto={modal.produto}
              saldo={saldos[modal.produto.id] ?? { saldo: 0, cm: 0 }}
              onFechar={() => setModal({ tipo: 'none' })}
              onEditar={() => setModal({ tipo: 'form', produto: modal.produto })}
              onMovimentar={() => {
                setModal({ tipo: 'none' });
                handleMovimentar(modal.produto.id);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal de form */}
      {modal.tipo === 'form' && (
        <div className="modal-overlay" onClick={() => !saving && setModal({ tipo: 'none' })}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <ProdutoForm
              produto={modal.produto}
              pais={paisSemSelf}
              saving={saving}
              error={mutError}
              onSalvar={handleSalvar}
              onCancelar={() => setModal({ tipo: 'none' })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
