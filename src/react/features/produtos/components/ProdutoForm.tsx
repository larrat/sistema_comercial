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

  useEffect(() => {
    setValues(produto ? toFormValues(produto) : { ...FORM_VAZIO });
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
        { preco: values.precoFixoAtacado, markup: values.markupAtacado, margem: values.margemAtacado }
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
    onSalvar(values);
  }

  const preview = calcPreview(values);
  const titulo = produto ? 'Editar produto' : 'Novo produto';

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="modal-titulo">{titulo}</div>

      {/* Identificação */}
      <div className="panel">
        <div className="pt">Identificação</div>
        <div className="fg2">
          <div className="fg1">
            <label className="lbl">Nome *</label>
            <input
              className="inp"
              value={values.nome}
              onChange={(e) => set({ nome: e.target.value })}
              required
              autoFocus={!produto}
            />
          </div>
          <div className="fg1">
            <label className="lbl">SKU</label>
            <input className="inp" value={values.sku} onChange={(e) => set({ sku: e.target.value })} />
          </div>
        </div>
        <div className="fg2" style={{ marginTop: 8 }}>
          <div className="fg1">
            <label className="lbl">Unidade</label>
            <select className="sel" value={values.un} onChange={(e) => set({ un: e.target.value })}>
              <option value="un">un</option>
              <option value="kg">kg</option>
              <option value="l">l</option>
              <option value="m">m</option>
              <option value="cx">cx</option>
              <option value="pc">pc</option>
              <option value="par">par</option>
            </select>
          </div>
          <div className="fg1">
            <label className="lbl">Categoria</label>
            <input className="inp" value={values.cat} onChange={(e) => set({ cat: e.target.value })} />
          </div>
        </div>
        {pais.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <label className="lbl">Variante de</label>
            <select
              className="sel"
              value={values.produto_pai_id ?? ''}
              onChange={(e) => handlePaiChange(e.target.value)}
            >
              <option value="">— produto independente —</option>
              {pais
                .filter((p) => p.id !== values.id)
                .sort((a, b) => a.nome.localeCompare(b.nome))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}{p.sku ? ` [${p.sku}]` : ''}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* Custo */}
      <div className="panel">
        <div className="pt">Custo *</div>
        <input
          className="inp"
          type="number"
          min="0"
          step="0.01"
          value={values.custo}
          onChange={(e) => handleCusto(e.target.value)}
          required
          style={{ maxWidth: 180 }}
        />
      </div>

      {/* Precificação varejo */}
      <div className="panel">
        <div className="pt">Varejo</div>
        <div className="fg2">
          <div className="fg1">
            <label className="lbl">Preço varejo (R$)</label>
            <input
              className="inp"
              type="number"
              min="0"
              step="0.01"
              value={values.precoVarejo}
              onChange={(e) => handleVariavelVarejo('preco', e.target.value)}
            />
          </div>
          <div className="fg1">
            <label className="lbl">Markup (%)</label>
            <input
              className="inp"
              type="number"
              min="0"
              step="0.1"
              value={values.markupVarejo}
              onChange={(e) => handleVariavelVarejo('markup', e.target.value)}
            />
          </div>
          <div className="fg1">
            <label className="lbl">Margem (%)</label>
            <input
              className="inp"
              type="number"
              min="0"
              step="0.1"
              value={values.margemVarejo}
              onChange={(e) => handleVariavelVarejo('margem', e.target.value)}
            />
          </div>
        </div>
        <div className="fg2" style={{ marginTop: 8 }}>
          <div className="fg1">
            <label className="lbl">Qtde mínima comercial</label>
            <input
              className="inp"
              type="number"
              min="0"
              step="0.001"
              value={values.qtmin}
              onChange={(e) => set({ qtmin: e.target.value })}
            />
          </div>
          <div className="fg1">
            <label className="lbl">Desconto varejo (%)</label>
            <input
              className="inp"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={values.descontoVarejo}
              onChange={(e) => set({ descontoVarejo: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Precificação atacado */}
      <div className="panel">
        <div className="pt">Atacado</div>
        <div className="fg2">
          <div className="fg1">
            <label className="lbl">Preço fixo (R$)</label>
            <input
              className="inp"
              type="number"
              min="0"
              step="0.01"
              value={values.precoFixoAtacado}
              onChange={(e) => handleVariavelAtacado('preco', e.target.value)}
            />
          </div>
          <div className="fg1">
            <label className="lbl">Markup (%)</label>
            <input
              className="inp"
              type="number"
              min="0"
              step="0.1"
              value={values.markupAtacado}
              onChange={(e) => handleVariavelAtacado('markup', e.target.value)}
            />
          </div>
          <div className="fg1">
            <label className="lbl">Margem (%)</label>
            <input
              className="inp"
              type="number"
              min="0"
              step="0.1"
              value={values.margemAtacado}
              onChange={(e) => handleVariavelAtacado('margem', e.target.value)}
            />
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <label className="lbl">Desconto atacado (%)</label>
          <input
            className="inp"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={values.descontoAtacado}
            onChange={(e) => set({ descontoAtacado: e.target.value })}
            style={{ maxWidth: 180 }}
          />
        </div>
      </div>

      {/* Estoque */}
      <div className="panel">
        <div className="pt">Estoque</div>
        <div className="fg2">
          <div className="fg1">
            <label className="lbl">Mínimo de estoque</label>
            <input
              className="inp"
              type="number"
              min="0"
              step="0.001"
              value={values.emin}
              onChange={(e) => set({ emin: e.target.value })}
            />
          </div>
          <div className="fg1">
            <label className="lbl">Alerta de estoque</label>
            <input
              className="inp"
              type="number"
              min="0"
              step="0.001"
              value={values.esal}
              onChange={(e) => set({ esal: e.target.value })}
            />
          </div>
          <div className="fg1">
            <label className="lbl">Custo médio (R$)</label>
            <input
              className="inp"
              type="number"
              min="0"
              step="0.01"
              value={values.ecm}
              onChange={(e) => set({ ecm: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="panel" style={{ background: 'var(--bg2, rgba(0,0,0,0.03))' }}>
          <div className="pt">Preview de preços</div>
          <div className="fg2" style={{ gap: 12 }}>
            <div>
              <div className="lbl">Varejo</div>
              <strong>{preview.pv > 0 ? fmt(preview.pv) : '-'}</strong>
              {preview.pvMin > 0 && (
                <span style={{ color: 'var(--tx2)', fontSize: 12 }}> · com desc. {fmt(preview.pvMin)}</span>
              )}
            </div>
            <div>
              <div className="lbl">Atacado</div>
              <strong>{preview.pa > 0 ? fmt(preview.pa) : '-'}</strong>
              {preview.paMin > 0 && (
                <span style={{ color: 'var(--tx2)', fontSize: 12 }}> · com desc. {fmt(preview.paMin)}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <div className="fg2" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={onCancelar} disabled={saving}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-p" disabled={saving}>
          {saving ? 'Salvando...' : produto ? 'Atualizar produto' : 'Salvar produto'}
        </button>
      </div>
    </form>
  );
}
