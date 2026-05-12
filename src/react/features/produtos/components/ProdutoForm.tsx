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
    <form className="rf-ui-stack" onSubmit={handleSubmit} data-testid="produto-form">
      <FormSection
        title="Essencial"
        description="Identificação básica para encontrar e vender o produto no dia a dia."
        aside={<span className="bdg bb">Obrigatório primeiro</span>}
      >
        <div className="fg2">
          <FormField label="Nome" required>
            <input
              className="rf-input-premium"
              value={values.nome}
              onChange={(e) => set({ nome: e.target.value })}
              required
              autoFocus={!produto}
              data-testid="produto-form-nome"
            />
          </FormField>
          <FormField label="SKU" hint="Código usado para localizar o produto rapidamente.">
            <input
              className="rf-input-premium"
              value={values.sku}
              onChange={(e) => set({ sku: e.target.value })}
              data-testid="produto-form-sku"
            />
          </FormField>
        </div>
        <div className="fg2" style={{ marginTop: 8 }}>
          <FormField label="Unidade">
            <select className="sel" value={values.un} onChange={(e) => set({ un: e.target.value })}>
              <option value="un">un</option>
              <option value="kg">kg</option>
              <option value="l">l</option>
              <option value="m">m</option>
              <option value="cx">cx</option>
              <option value="pc">pc</option>
              <option value="par">par</option>
            </select>
          </FormField>
          <FormField label="Categoria">
            <input
              className="rf-input-premium"
              value={values.cat}
              onChange={(e) => set({ cat: e.target.value })}
            />
          </FormField>
        </div>
        {pais.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <FormField
              label="Variante de"
              hint="Use quando este produto herda dados de uma família."
            >
              <select
                className="rf-input-premium"
                value={values.produto_pai_id ?? ''}
                onChange={(e) => handlePaiChange(e.target.value)}
              >
                <option value="">— produto independente —</option>
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

      <FormSection title="Custo" description="Base para cálculo de varejo, atacado e margem.">
        <FormField label="Custo" required>
          <input
            className="inp"
            type="number"
            min="0"
            step="0.01"
            value={values.custo}
            onChange={(e) => handleCusto(e.target.value)}
            required
            style={{ maxWidth: 180 }}
            data-testid="produto-form-custo"
          />
        </FormField>
      </FormSection>

      <FormSection title="Varejo" description="Preço e margem usados na venda direta.">
        <div className="fg2">
          <FormField label="Preço varejo (R$)">
            <input
              className="rf-input-premium"
              type="number"
              min="0"
              step="0.01"
              value={values.precoVarejo}
              onChange={(e) => handleVariavelVarejo('preco', e.target.value)}
            />
          </FormField>
          <FormField label="Markup (%)">
            <input
              className="rf-input-premium"
              type="number"
              min="0"
              step="0.1"
              value={values.markupVarejo}
              onChange={(e) => handleVariavelVarejo('markup', e.target.value)}
            />
          </FormField>
          <FormField label="Margem (%)">
            <input
              className="rf-input-premium"
              type="number"
              min="0"
              step="0.1"
              value={values.margemVarejo}
              onChange={(e) => handleVariavelVarejo('margem', e.target.value)}
            />
          </FormField>
        </div>
        <div className="fg2" style={{ marginTop: 8 }}>
          <FormField label="Qtde mínima comercial">
            <input
              className="rf-input-premium"
              type="number"
              min="0"
              step="0.001"
              value={values.qtmin}
              onChange={(e) => set({ qtmin: e.target.value })}
            />
          </FormField>
          <FormField label="Desconto varejo (%)">
            <input
              className="rf-input-premium"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={values.descontoVarejo}
              onChange={(e) => set({ descontoVarejo: e.target.value })}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Atacado" description="Preço e margem usados para venda em volume.">
        <div className="fg2">
          <FormField label="Preço fixo (R$)">
            <input
              className="rf-input-premium"
              type="number"
              min="0"
              step="0.01"
              value={values.precoFixoAtacado}
              onChange={(e) => handleVariavelAtacado('preco', e.target.value)}
            />
          </FormField>
          <FormField label="Markup (%)">
            <input
              className="rf-input-premium"
              type="number"
              min="0"
              step="0.1"
              value={values.markupAtacado}
              onChange={(e) => handleVariavelAtacado('markup', e.target.value)}
            />
          </FormField>
          <FormField label="Margem (%)">
            <input
              className="rf-input-premium"
              type="number"
              min="0"
              step="0.1"
              value={values.margemAtacado}
              onChange={(e) => handleVariavelAtacado('margem', e.target.value)}
            />
          </FormField>
        </div>
        <div style={{ marginTop: 8 }}>
          <FormField label="Desconto atacado (%)">
            <input
              className="rf-input-premium"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={values.descontoAtacado}
              onChange={(e) => set({ descontoAtacado: e.target.value })}
              style={{ maxWidth: 180 }}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Estoque" description="Parâmetros básicos para alerta e custo médio.">
        <div className="fg2">
          <FormField label="Mínimo de estoque">
            <input
              className="rf-input-premium"
              type="number"
              min="0"
              step="0.001"
              value={values.emin}
              onChange={(e) => set({ emin: e.target.value })}
            />
          </FormField>
          <FormField label="Alerta de estoque">
            <input
              className="rf-input-premium"
              type="number"
              min="0"
              step="0.001"
              value={values.esal}
              onChange={(e) => set({ esal: e.target.value })}
            />
          </FormField>
          <FormField label="Custo médio (R$)">
            <input
              className="rf-input-premium"
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
        <FormSection title="Preview de preços">
          <div className="fg2" style={{ gap: 12 }}>
            <div>
              <div className="lbl">Varejo</div>
              <strong>{preview.pv > 0 ? fmt(preview.pv) : '-'}</strong>
              {preview.pvMin > 0 && (
                <span style={{ color: 'var(--tx2)', fontSize: 12 }}>
                  {' '}
                  · com desc. {fmt(preview.pvMin)}
                </span>
              )}
            </div>
            <div>
              <div className="lbl">Atacado</div>
              <strong>{preview.pa > 0 ? fmt(preview.pa) : '-'}</strong>
              {preview.paMin > 0 && (
                <span style={{ color: 'var(--tx2)', fontSize: 12 }}>
                  {' '}
                  · com desc. {fmt(preview.paMin)}
                </span>
              )}
            </div>
          </div>
        </FormSection>
      )}

      <FormError message={localError || error} data-testid="produto-form-error" />

      <FormActions
        onCancel={onCancelar}
        loading={saving}
        submitLabel={produto ? 'Salvar alterações' : 'Salvar produto'}
      />
    </form>
  );
}
