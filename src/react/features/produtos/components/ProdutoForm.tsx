import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Image, Upload, Trash2, Loader2, TrendingUp } from 'lucide-react';
import type { Produto } from '../../../../types/domain';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { toast } from 'sonner';
import {
  syncPriceFields,
  recalcFromCost,
  markupToPrice,
  markupToMargin,
  type SyncedPriceState
} from '../hooks/useProdutoCalculations';
import { FormActions, FormError, FormSection, Input, Select } from '../../../shared/ui';

const produtoSchema = z.object({
  id: z.string().optional(),
  produto_pai_id: z.string().nullable().optional(),
  nome: z.string().min(1, 'Nome do produto é obrigatório.'),
  sku: z.string().optional(),
  un: z.string().default('un'),
  cat: z.string().optional(),
  custo: z.string().refine(v => parseFloat(v) > 0, 'Informe o custo do produto.'),
  precoVarejo: z.string().optional(),
  markupVarejo: z.string().optional(),
  margemVarejo: z.string().optional(),
  descontoVarejo: z.string().optional(),
  markupAtacado: z.string().optional(),
  margemAtacado: z.string().optional(),
  precoFixoAtacado: z.string().optional(),
  descontoAtacado: z.string().optional(),
  qtmin: z.string().optional(),
  emin: z.string().optional(),
  esal: z.string().optional(),
  ecm: z.string().optional(),
  is_sample: z.boolean().default(false),
  genero: z.enum(['masculino', 'feminino']).nullable().optional(),
  tamanho: z.string().nullable().optional(),
  foto_url: z.string().nullable().optional(),
});

type ProdutoFormValues = z.infer<typeof produtoSchema>;

type Props = {
  produto: Produto | null;
  pais: Produto[];
  saving: boolean;
  error: string | null;
  onSalvar: (_values: ProdutoFormValues) => void;
  onCancelar: () => void;
};

function toFormValues(p: Produto | null): Partial<ProdutoFormValues> {
  if (!p) return {
    nome: '', sku: '', un: 'un', cat: '', custo: '', precoVarejo: '', markupVarejo: '', margemVarejo: '',
    descontoVarejo: '', markupAtacado: '', margemAtacado: '', precoFixoAtacado: '', descontoAtacado: '',
    qtmin: '', emin: '', esal: '', ecm: '', is_sample: false, genero: null, tamanho: null, foto_url: null
  };

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
    ecm: p.ecm ? String(p.ecm) : '',
    is_sample: !!p.is_sample,
    genero: p.genero ?? null,
    tamanho: p.tamanho ?? null,
    foto_url: p.foto_url ?? null
  };
}

function calcPreview(values: ProdutoFormValues) {
  const custo = parseFloat(values.custo) || 0;
  const pv = parseFloat(values.precoVarejo || '0') || 0;
  const pa = parseFloat(values.precoFixoAtacado || '0') || 0;
  const mkv = parseFloat(values.markupVarejo || '0') || 0;
  const mka = parseFloat(values.markupAtacado || '0') || 0;
  const dv = parseFloat(values.descontoVarejo || '0') || 0;
  const da = parseFloat(values.descontoAtacado || '0') || 0;

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
  const { resolve } = useApiContext();
  const { register, handleSubmit, setValue, getValues, watch, reset, formState: { errors } } = useForm<ProdutoFormValues>({
    resolver: zodResolver(produtoSchema),
    defaultValues: useMemo(() => toFormValues(produto), [produto])
  });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    reset(toFormValues(produto));
  }, [produto, reset]);

  const watchedValues = watch();

  function handleCusto(raw: string) {
    const custo = parseFloat(raw) || 0;
    if (custo > 0) {
      const { varejo, atacado } = recalcFromCost(
        custo,
        { preco: watchedValues.precoVarejo || '', markup: watchedValues.markupVarejo || '', margem: watchedValues.margemVarejo || '' },
        { preco: watchedValues.precoFixoAtacado || '', markup: watchedValues.markupAtacado || '', margem: watchedValues.margemAtacado || '' }
      );
      setValue('custo', raw);
      setValue('precoVarejo', varejo.preco);
      setValue('markupVarejo', varejo.markup);
      setValue('margemVarejo', varejo.margem);
      setValue('precoFixoAtacado', atacado.preco);
      setValue('markupAtacado', atacado.markup);
      setValue('margemAtacado', atacado.margem);
    } else {
      setValue('custo', raw);
    }
  }

  function handleVariavelVarejo(field: 'markup' | 'margem' | 'preco', raw: string) {
    const custo = parseFloat(watchedValues.custo) || 0;
    const current: SyncedPriceState = {
      preco: field === 'preco' ? raw : watchedValues.precoVarejo || '',
      markup: field === 'markup' ? raw : watchedValues.markupVarejo || '',
      margem: field === 'margem' ? raw : watchedValues.margemVarejo || ''
    };
    const synced = syncPriceFields(field, current, custo);
    setValue('precoVarejo', synced.preco);
    setValue('markupVarejo', synced.markup);
    setValue('margemVarejo', synced.margem);
  }

  function handleVariavelAtacado(field: 'markup' | 'margem' | 'preco', raw: string) {
    const custo = parseFloat(watchedValues.custo) || 0;
    const current: SyncedPriceState = {
      preco: field === 'preco' ? raw : watchedValues.precoFixoAtacado || '',
      markup: field === 'markup' ? raw : watchedValues.markupAtacado || '',
      margem: field === 'margem' ? raw : watchedValues.margemAtacado || ''
    };
    const synced = syncPriceFields(field, current, custo);
    setValue('precoFixoAtacado', synced.preco);
    setValue('markupAtacado', synced.markup);
    setValue('margemAtacado', synced.margem);
  }

  function handlePaiChange(paiId: string) {
    const pai = pais.find((p) => p.id === paiId);
    if (!pai) {
      setValue('produto_pai_id', null);
      return;
    }
    setValue('produto_pai_id', paiId);
    if (!getValues('nome')?.trim()) setValue('nome', `${pai.nome} - `);
    if (!getValues('sku')?.trim() && pai.sku) setValue('sku', `${pai.sku}-`);
    if (pai.un) setValue('un', pai.un);
    if (pai.cat) setValue('cat', pai.cat);
    const custo = pai.custo ?? 0;
    if (custo > 0) setValue('custo', String(custo));
    if (pai.dv) setValue('descontoVarejo', String(pai.dv));
    if (pai.qtmin) setValue('qtmin', String(pai.qtmin));
    if (pai.da) setValue('descontoAtacado', String(pai.da));
    if (pai.emin) setValue('emin', String(pai.emin));
    if (pai.esal) setValue('esal', String(pai.esal));
    if (pai.ecm) setValue('ecm', String(pai.ecm));
    const mkv = pai.mkv ?? 0;
    if (mkv > 0) {
      setValue('markupVarejo', mkv.toFixed(1));
      setValue('margemVarejo', markupToMargin(mkv).toFixed(1));
      if (custo > 0) setValue('precoVarejo', markupToPrice(custo, mkv).toFixed(2));
    }
    const mka = pai.mka ?? 0;
    if (mka > 0) {
      setValue('markupAtacado', mka.toFixed(1));
      setValue('margemAtacado', markupToMargin(mka).toFixed(1));
      if (custo > 0) setValue('precoFixoAtacado', markupToPrice(custo, mka).toFixed(2));
    } else if (pai.pfa) {
      setValue('precoFixoAtacado', String(pai.pfa));
    }
  }

  const preview = useMemo(() => calcPreview(watchedValues), [watchedValues]);

  async function handleUpload(file: File) {
    const context = resolve();
    if (!context) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${context.filialId}/${crypto.randomUUID()}.${fileExt}`;
      const url = `${context.url}/storage/v1/object/produtos/${fileName}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${context.token}`,
          'apikey': context.key,
          'Content-Type': file.type
        },
        body: file
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Erro ao fazer upload');
      }

      const publicUrl = `${context.url}/storage/v1/object/public/produtos/${fileName}`;
      setValue('foto_url', publicUrl);
      toast.success('Foto carregada com sucesso!');
    } catch (e) {
      console.error(e);
      toast.error('Falha ao subir imagem. Verifique o tamanho ou tente novamente.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <form className="flex flex-col gap-10" onSubmit={handleSubmit(onSalvar)} data-testid="produto-form">
      <FormSection title="Essencial" description="Identificação básica para encontrar e vender o produto no dia a dia." aside={<span className="px-2 py-1 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-blue-100">Obrigatório</span>}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col gap-4">
             <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2">Foto do Produto</label>
             <div className="relative group">
                <div className="aspect-square w-full rounded-3xl bg-slate-100 border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center transition-all group-hover:border-cyan-200">
                   {watchedValues.foto_url ? (
                     <div className="relative w-full h-full">
                        <img src={watchedValues.foto_url} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => setValue('foto_url', null)}
                          className="absolute top-3 right-3 p-2 bg-rose-500 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={16} />
                        </button>
                     </div>
                   ) : (
                     <div className="flex flex-col items-center gap-3 text-slate-400">
                        {uploading ? (
                          <Loader2 size={32} className="animate-spin text-cyan-500" />
                        ) : (
                          <>
                            <Image size={32} strokeWidth={1.5} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Nenhuma foto</span>
                          </>
                        )}
                     </div>
                   )}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  disabled={uploading}
                />
                {!watchedValues.foto_url && !uploading && (
                  <div className="mt-3 flex justify-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 text-cyan-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-cyan-500/20">
                       <Upload size={12} />
                       Clique para subir
                    </div>
                  </div>
                )}
             </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Nome" required {...register('nome')} error={errors.nome?.message} autoFocus={!produto} data-testid="produto-form-nome" placeholder="Ex: Camisa Polo Premium" />
              <Input label="SKU" helperText="Código interno único" {...register('sku')} data-testid="produto-form-sku" placeholder="Opcional" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select label="Unidade" {...register('un')} options={[{ value: 'un', label: 'un (Unidade)' }, { value: 'kg', label: 'kg (Quilograma)' }, { value: 'l', label: 'l (Litro)' }, { value: 'm', label: 'm (Metro)' }, { value: 'cx', label: 'cx (Caixa)' }, { value: 'pc', label: 'pc (Peça)' }, { value: 'par', label: 'par (Par)' }]} />
              <Input label="Categoria" {...register('cat')} placeholder="Ex: Vestuário" />
            </div>
          </div>
        </div>
        {pais.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <Select label="Variante de" helperText="Vincule este produto a uma família existente." value={watchedValues.produto_pai_id ?? ''} onChange={(e) => handlePaiChange(e.target.value)} options={[{ value: '', label: '— Produto Independente —' }, ...pais.filter((p) => p.id !== produto?.id).sort((a, b) => a.nome.localeCompare(b.nome)).map((p) => ({ value: p.id, label: `${p.nome}${p.sku ? ` [${p.sku}]` : ''}` }))]} />
          </div>
        )}


        {watchedValues.produto_pai_id && (
          <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col md:flex-row gap-12">
            <div className="flex-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 block">Gênero do Modelo (Variação)</label>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" value="masculino" {...register('genero')} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300" />
                  <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors uppercase">Masculino</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" value="feminino" {...register('genero')} className="w-4 h-4 text-pink-600 focus:ring-pink-500 border-slate-300" />
                  <span className="text-xs font-bold text-slate-700 group-hover:text-pink-600 transition-colors uppercase">Feminino</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" value="" {...register('genero', { setValueAs: v => v === "" ? null : v })} className="w-4 h-4 text-slate-400 focus:ring-slate-500 border-slate-300" />
                  <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors uppercase">Unissex / N/A</span>
                </label>
              </div>
            </div>

            <div className="flex-[2]">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 block">Tamanho / Grade</label>
              <div className="flex flex-wrap gap-2">
                {['PP', 'P', 'M', 'G', 'GG', 'XG', 'G1', 'G2', 'G3'].map(size => (
                  <label key={size} className={`flex-1 min-w-[50px] relative`}>
                    <input 
                      type="radio" 
                      value={size} 
                      {...register('tamanho')} 
                      className="peer absolute opacity-0 cursor-pointer" 
                    />
                    <div className="px-3 py-2 border-2 border-slate-100 rounded-xl text-center text-xs font-black text-slate-400 peer-checked:border-cyan-500 peer-checked:bg-cyan-50 peer-checked:text-cyan-700 hover:border-slate-200 transition-all cursor-pointer">
                      {size}
                    </div>
                  </label>
                ))}
                <label className="flex-1 min-w-[50px] relative">
                  <input 
                    type="radio" 
                    value="" 
                    {...register('tamanho', { setValueAs: v => v === "" ? null : v })}
                    className="peer absolute opacity-0 cursor-pointer" 
                  />
                  <div className="px-3 py-2 border-2 border-slate-100 rounded-xl text-center text-[10px] font-black text-slate-400 peer-checked:border-slate-500 peer-checked:bg-slate-50 peer-checked:text-slate-700 hover:border-slate-200 transition-all cursor-pointer uppercase">
                    N/A
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}
      </FormSection>

      <FormSection title="Financeiro" description="Custo base e formação estratégica de preços.">
        <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-100 mb-6 flex flex-wrap items-end gap-6">
          <Input label="Custo de Compra (R$)" required className="md:max-w-[200px] text-lg font-bold" type="number" min="0" step="0.01" value={watchedValues.custo} onChange={(e) => handleCusto(e.target.value)} error={errors.custo?.message} data-testid="produto-form-custo" />
          <div className="pb-2">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input type="checkbox" {...register('is_sample')} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">PEÇA DE MOSTRUÁRIO</span>
                <span className="text-[10px] text-slate-500 leading-tight">Flag de auditoria para itens de exposição/ensaio</span>
              </div>
            </label>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Venda Varejo</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Preço (R$)" className="font-bold" type="number" min="0" step="0.01" value={watchedValues.precoVarejo} onChange={(e) => handleVariavelVarejo('preco', e.target.value)} />
              <Input label="Markup (%)" type="number" min="0" step="0.1" value={watchedValues.markupVarejo} onChange={(e) => handleVariavelVarejo('markup', e.target.value)} />
              <Input label="Margem (%)" type="number" min="0" step="0.1" value={watchedValues.margemVarejo} onChange={(e) => handleVariavelVarejo('margem', e.target.value)} />
            </div>
            <Input label="Desconto Máximo (%)" className="md:max-w-[150px]" type="number" min="0" max="100" step="0.1" {...register('descontoVarejo')} />
          </div>
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Venda Atacado</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Preço (R$)" className="font-bold" type="number" min="0" step="0.01" value={watchedValues.precoFixoAtacado} onChange={(e) => handleVariavelAtacado('preco', e.target.value)} />
              <Input label="Markup (%)" type="number" min="0" step="0.1" value={watchedValues.markupAtacado} onChange={(e) => handleVariavelAtacado('markup', e.target.value)} />
              <Input label="Margem (%)" type="number" min="0" step="0.1" value={watchedValues.margemAtacado} onChange={(e) => handleVariavelAtacado('margem', e.target.value)} />
            </div>
            <Input label="Desconto Máximo (%)" className="md:max-w-[150px]" type="number" min="0" max="100" step="0.1" {...register('descontoAtacado')} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Logística" description="Parâmetros para controle de estoque e reposição.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Input label="Qtd Mínima (Venda)" type="number" min="0" step="0.001" {...register('qtmin')} />
          <Input label="Estoque Mínimo" type="number" min="0" step="0.001" {...register('emin')} />
          <Input label="Alerta Reposição" type="number" min="0" step="0.001" {...register('esal')} />
        </div>
        <div className="mt-6 pt-6 border-t border-slate-100 md:max-w-[200px]">
          <Input label="Custo Médio (CM)" type="number" min="0" step="0.01" {...register('ecm')} />
        </div>
      </FormSection>

      {preview && (
        <div className="bg-emerald-900/90 backdrop-blur-xl p-6 rounded-3xl border border-emerald-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5"><TrendingUp size={120} /></div>
          <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-4">Simulação de Preços Reais</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            <div className="space-y-1"><span className="text-[10px] font-bold text-emerald-300/60 uppercase">Varejo Consolidado</span><div className="flex items-baseline gap-2"><span className="text-2xl font-black text-white">{preview.pv > 0 ? fmt(preview.pv) : '-'}</span>{preview.pvMin > 0 && <span className="text-xs font-bold text-emerald-400/80 italic">min {fmt(preview.pvMin)}</span>}</div></div>
            <div className="space-y-1"><span className="text-[10px] font-bold text-emerald-300/60 uppercase">Atacado Consolidado</span><div className="flex items-baseline gap-2"><span className="text-2xl font-black text-white">{preview.pa > 0 ? fmt(preview.pa) : '-'}</span>{preview.paMin > 0 && <span className="text-xs font-bold text-emerald-400/80 italic">min {fmt(preview.paMin)}</span>}</div></div>
          </div>
        </div>
      )}

      <div className="pt-6 border-t border-slate-100">
        <FormError message={error} data-testid="produto-form-error" />
        <FormActions onCancel={onCancelar} loading={saving} submitLabel={produto ? 'Confirmar Alterações' : 'Finalizar Cadastro'} />
      </div>
    </form>
  );
}
