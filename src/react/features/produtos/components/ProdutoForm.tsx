import { useState, useEffect } from 'react';
import type { Produto } from '../../../../types/domain';
import type { ProdutoFormValues } from '../types';
import { FORM_VAZIO } from '../types';
import {
  syncPriceFields,
  recalcFromCost,
  markupToPrice,
  markupToMargin,
  type SyncedPriceState
} from '../hooks/useProdutoCalculations';
import { FormActions, FormError, FormField, FormSection } from '../../../shared/ui';

type Props = {
  produto: Produto | null;
  pais: Produto[];
  saving: boolean;
  error: string | null;
  onSalvar: (_values: ProdutoFormValues) => void;
  onCancelar: () => void;
};

function toFormValues(p: Produto): ProdutoFormValues {
  const custo = p.custo ?? 0;
  const mkv = p.mkv ?? 0;
  const mka = p.mka ?? 0;

  return {
    id: p.id,
    produto_pai_id: p.produto_pai_id ?? null,
    nome: p.nome,
    sku: p.sku ?? '',
    un: p.un ?? 'un',
    cat: p.cat ?? '',
    custo: custo > 0 ? String(custo) : '',
    precoVarejo: mkv > 0 ? markupToPrice(custo, mkv).toFixed(2) : '',
    markupVarejo: mkv > 0 ? mkv.toFixed(1) : '',
    margemVarejo: mkv > 0 ? markupToMargin(mkv).toFixed(1) : '',
    descontoVarejo: p.dv ? String(p.dv) : '',
    markupAtacado: mka > 0 ? mka.toFixed(1) : '',
    margemAtacado: mka > 0 ? markupToMargin(mka).toFixed(1) : '',
    precoFixoAtacado: p.pfa ? String(p.pfa) : '',
    descontoAtacado: p.da ? String(p.da) : '',
    qtmin: p.qtmin ? String(p.qtmin) : '',
    emin: p.emin ? String(p.emin) : '',
    esal: p.esal ? String(p.esal) : '',
    ecm: p.ecm ? String(p.ecm) : ''
  };
}

type PreviewValues = { pv: number; pvMin: number; pa: number; paMin: number };

function calcPreview(values: ProdutoFormValues): PreviewValues | null {
  const custo = parseFloat(values.custo) || 0;
  const pv = parseFloat(values.precoVarejo) || 0;
  const pa = parseFloat(values.precoFixoAtacado) || 0;
  const mkv = parseFloat(values.markupVarejo) || 0;
  const mka = parseFloat(values.markupAtacado) || 0;
  const dv = parseFloat(values.descontoVarejo) || 0;
  const da = parseFloat(values.descontoAtacado) || 0;

  const precoV = pv > 0 ? pv : custo > 0 && mkv > 0 ? markupToPrice(custo, mkv) : 0;
  const precoA = pa > 0 ? pa : custo > 0 && mka > 0 ? markupToPrice(custo, mka) : 0;

  if (custo <= 0 || (precoV <= 0 && precoA <= 0)) return null;

  return {
    pv: precoV,
    pvMin: precoV > 0 && dv > 0 ? precoV * (1 - dv / 100) : 0,
    pa: precoA,
    paMin: precoA > 0 && da > 0 ? precoA * (1 - da / 100) : 0
  };
}

function fmt(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ProdutoForm({ produto, pais, saving, error, onSalvar, onCancelar }: Props) {
  const [values, setValues] = useState<ProdutoFormValues>(
    produto ? toFormValues(produto) : { ...FORM_VAZIO }
  );
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setValues(produto ? toFormValues(produto) : { ...FORM_VAZIO });
    setLocalError(null);
  }, [produto]);

  function set(patch: Partial<ProdutoFormValues>) {
    setValues((v) => ({ ...v, ...patch }));
  }

  function handleCusto(raw: string) {
    const custo = parseFloat(raw) || 0;
    if (custo > 0) {
      const { varejo, atacado } = recalcFromCost(
        custo,
        { preco: values.precoVarejo, markup: values.markupVarejo, margem: values.margemVarejo },
        {
          preco: values.precoFixoAtacado,
          markup: values.markupAtacado,
          margem: values.margemAtacado
        }
      );
      set({
        custo: raw,
        precoVarejo: varejo.preco,
        markupVarejo: varejo.markup,
        margemVarejo: varejo.margem,
        precoFixoAtacado: atacado.preco,
        markupAtacado: atacado.markup,
        margemAtacado: atacado.margem
      });
    } else {
      set({ custo: raw });
    }
  }

  function handleVariavelVarejo(field: 'markup' | 'margem' | 'preco', raw: string) {
    const custo = parseFloat(values.custo) || 0;
    const current: SyncedPriceState = {
      preco: field === 'preco' ? raw : values.precoVarejo,
      markup: field === 'markup' ? raw : values.markupVarejo,
      margem: field === 'margem' ? raw : values.margemVarejo
    };
    const synced = syncPriceFields(field, current, custo);
    set({ precoVarejo: synced.preco, markupVarejo: synced.markup, margemVarejo: synced.margem });
  }

  function handleVariavelAtacado(field: 'markup' | 'margem' | 'preco', raw: string) {
    const custo = parseFloat(values.custo) || 0;
    const current: SyncedPriceState = {
      preco: field === 'preco' ? raw : values.precoFixoAtacado,
      markup: field === 'markup' ? raw : values.markupAtacado,
      margem: field === 'margem' ? raw : values.margemAtacado
    };
    const synced = syncPriceFields(field, current, custo);
    set({
      precoFixoAtacado: synced.preco,
      markupAtacado: synced.markup,
      margemAtacado: synced.margem
    });
  }

  function handlePaiChange(paiId: string) {
    const pai = pais.find((p) => p.id === paiId);
    if (!pai) {
      set({ produto_pai_id: null });
      return;
    }

    const patch: Partial<ProdutoFormValues> = { produto_pai_id: paiId };
    if (!values.nome.trim()) patch.nome = `${pai.nome} - `;
    if (!values.sku.trim() && pai.sku) patch.sku = `${pai.sku}-`;
    if (pai.un) patch.un = pai.un;
    if (pai.cat) patch.cat = pai.cat;

    const custo = pai.custo ?? 0;
    if (custo > 0) patch.custo = String(custo);
    if (pai.dv) patch.descontoVarejo = String(pai.dv);
    if (pai.qtmin) patch.qtmin = String(pai.qtmin);
    if (pai.da) patch.descontoAtacado = String(pai.da);
    if (pai.emin) patch.emin = String(pai.emin);
    if (pai.esal) patch.esal = String(pai.esal);
    if (pai.ecm) patch.ecm = String(pai.ecm);

    const mkv = pai.mkv ?? 0;
    if (mkv > 0) {
      patch.markupVarejo = mkv.toFixed(1);
      patch.margemVarejo = markupToMargin(mkv).toFixed(1);
      if (custo > 0) patch.precoVarejo = markupToPrice(custo, mkv).toFixed(2);
    }

    const mka = pai.mka ?? 0;
    if (mka > 0) {
      patch.markupAtacado = mka.toFixed(1);
      patch.margemAtacado = markupToMargin(mka).toFixed(1);
      if (custo > 0) patch.precoFixoAtacado = markupToPrice(custo, mka).toFixed(2);
    } else if (pai.pfa) {
      patch.precoFixoAtacado = String(pai.pfa);
    }

    set(patch);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.nome.trim()) {
      setLocalError('Nome do produto é obrigatório.');
      return;
    }
    if ((parseFloat(values.custo) || 0) <= 0) {
      setLocalError('Informe o custo do produto antes de salvar.');
      return;
    }
    setLocalError(null);
    onSalvar(values);
  }

  const preview = calcPreview(values);

  return (
    <form className="flex flex-col gap-10" onSubmit={handleSubmit} data-testid="produto-form">
      <FormSection
        title="Essencial"
        description="Identificação básica para encontrar e vender o produto no dia a dia."
        aside={<span className="px-2 py-1 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-blue-100">Obrigatório</span>}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Nome" required>
            <input
              className="rf-input-premium w-full"
              value={values.nome}
              onChange={(e) => set({ nome: e.target.value })}
              required
              autoFocus={!produto}
              data-testid="produto-form-nome"
              placeholder="Ex: Camisa Polo Premium"
            />
          </FormField>
          <FormField label="SKU" hint="Código interno único">
            <input
              className="rf-input-premium w-full"
              value={values.sku}
              onChange={(e) => set({ sku: e.target.value })}
              data-testid="produto-form-sku"
              placeholder="Opcional"
            />
          </FormField>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <FormField label="Unidade">
            <select className="rf-input-premium w-full" value={values.un} onChange={(e) => set({ un: e.target.value })}>
              <option value="un">un (Unidade)</option>
              <option value="kg">kg (Quilograma)</option>
              <option value="l">l (Litro)</option>
              <option value="m">m (Metro)</option>
              <option value="cx">cx (Caixa)</option>
              <option value="pc">pc (Peça)</option>
              <option value="par">par (Par)</option>
            </select>
          </FormField>
          <FormField label="Categoria">
            <input
              className="rf-input-premium w-full"
              value={values.cat}
              onChange={(e) => set({ cat: e.target.value })}
              placeholder="Ex: Vestuário"
            />
          </FormField>
        </div>
        {pais.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <FormField
              label="Variante de"
              hint="Vincule este produto a uma família existente."
            >
              <select
                className="rf-input-premium w-full"
                value={values.produto_pai_id ?? ''}
                onChange={(e) => handlePaiChange(e.target.value)}
              >
                <option value="">— Produto Independente —</option>
                {pais
                  .filter((p) => p.id !== values.id)
                  .sort((a, b) => a.nome.localeCompare(b.nome))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                      {p.sku ? ` [${p.sku}]` : ''}
                    </option>
                  ))}
              </select>
            </FormField>
          </div>
        )}
      </FormSection>

      <FormSection title="Financeiro" description="Custo base e formação estratégica de preços.">
        <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-100 mb-6">
          <FormField label="Custo de Compra (R$)" required>
            <input
              className="rf-input-premium w-full md:max-w-[200px] text-lg font-bold text-slate-900"
              type="number"
              min="0"
              step="0.01"
              value={values.custo}
              onChange={(e) => handleCusto(e.target.value)}
              required
              data-testid="produto-form-custo"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Venda Varejo</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Preço (R$)">
                <input
                  className="rf-input-premium w-full font-bold"
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.precoVarejo}
                  onChange={(e) => handleVariavelVarejo('preco', e.target.value)}
                />
              </FormField>
              <FormField label="Markup (%)">
                <input
                  className="rf-input-premium w-full"
                  type="number"
                  min="0"
                  step="0.1"
                  value={values.markupVarejo}
                  onChange={(e) => handleVariavelVarejo('markup', e.target.value)}
                />
              </FormField>
              <FormField label="Margem (%)">
                <input
                  className="rf-input-premium w-full"
                  type="number"
                  min="0"
                  step="0.1"
                  value={values.margemVarejo}
                  onChange={(e) => handleVariavelVarejo('margem', e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Desconto Máximo (%)">
              <input
                className="rf-input-premium w-full md:max-w-[150px]"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={values.descontoVarejo}
                onChange={(e) => set({ descontoVarejo: e.target.value })}
              />
            </FormField>
          </div>

          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Venda Atacado</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Preço (R$)">
                <input
                  className="rf-input-premium w-full font-bold"
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.precoFixoAtacado}
                  onChange={(e) => handleVariavelAtacado('preco', e.target.value)}
                />
              </FormField>
              <FormField label="Markup (%)">
                <input
                  className="rf-input-premium w-full"
                  type="number"
                  min="0"
                  step="0.1"
                  value={values.markupAtacado}
                  onChange={(e) => handleVariavelAtacado('markup', e.target.value)}
                />
              </FormField>
              <FormField label="Margem (%)">
                <input
                  className="rf-input-premium w-full"
                  type="number"
                  min="0"
                  step="0.1"
                  value={values.margemAtacado}
                  onChange={(e) => handleVariavelAtacado('margem', e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Desconto Máximo (%)">
              <input
                className="rf-input-premium w-full md:max-w-[150px]"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={values.descontoAtacado}
                onChange={(e) => set({ descontoAtacado: e.target.value })}
              />
            </FormField>
          </div>
        </div>
      </FormSection>

      <FormSection title="Logística" description="Parâmetros para controle de estoque e reposição.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField label="Qtd Mínima (Venda)">
            <input
              className="rf-input-premium w-full"
              type="number"
              min="0"
              step="0.001"
              value={values.qtmin}
              onChange={(e) => set({ qtmin: e.target.value })}
            />
          </FormField>
          <FormField label="Estoque Mínimo">
            <input
              className="rf-input-premium w-full"
              type="number"
              min="0"
              step="0.001"
              value={values.emin}
              onChange={(e) => set({ emin: e.target.value })}
            />
          </FormField>
          <FormField label="Alerta Reposição">
            <input
              className="rf-input-premium w-full"
              type="number"
              min="0"
              step="0.001"
              value={values.esal}
              onChange={(e) => set({ esal: e.target.value })}
            />
          </FormField>
        </div>
        <div className="mt-6 pt-6 border-t border-slate-100 md:max-w-[200px]">
          <FormField label="Custo Médio (CM)">
            <input
              className="rf-input-premium w-full"
              type="number"
              min="0"
              step="0.01"
              value={values.ecm}
              onChange={(e) => set({ ecm: e.target.value })}
            />
          </FormField>
        </div>
      </FormSection>

      {preview && (
        <div className="bg-emerald-900/90 backdrop-blur-xl p-6 rounded-3xl border border-emerald-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <TrendingUp size={120} />
          </div>
          <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-4">Simulação de Preços Reais</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-emerald-300/60 uppercase">Varejo Consolidado</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{preview.pv > 0 ? fmt(preview.pv) : '-'}</span>
                {preview.pvMin > 0 && (
                  <span className="text-xs font-bold text-emerald-400/80 italic">min {fmt(preview.pvMin)}</span>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-emerald-300/60 uppercase">Atacado Consolidado</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{preview.pa > 0 ? fmt(preview.pa) : '-'}</span>
                {preview.paMin > 0 && (
                  <span className="text-xs font-bold text-emerald-400/80 italic">min {fmt(preview.paMin)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pt-6 border-t border-slate-100">
        <FormError message={localError || error} data-testid="produto-form-error" />
        <FormActions
          onCancel={onCancelar}
          loading={saving}
          submitLabel={produto ? 'Confirmar Alterações' : 'Finalizar Cadastro'}
        />
      </div>
    </form>
  );
}
