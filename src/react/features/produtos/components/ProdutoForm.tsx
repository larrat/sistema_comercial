import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Image, Upload, Trash2, Loader2, TrendingUp, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import type { Produto } from '../../../../types/domain';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { useFilialStore } from '../../../app/useFilialStore';
import { useFiliaisData } from '../../filiais/hooks/useFiliaisData';
import { toast } from 'sonner';
import {
  syncPriceFields,
  recalcFromCost,
  markupToPrice,
  type SyncedPriceState
} from '../hooks/useProdutoCalculations';
import { useUnsavedChangesGuard } from '../../../shared/hooks/useUnsavedChangesGuard';
import { FormActions, FormError, FormSection, Input, Select, Typography, UnsavedChangesModal } from '../../../shared/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const produtoSchema = z.object({
  id: z.string().optional(),
  produto_pai_id: z.string().nullable().optional(),
  nome: z.string().min(1, 'Nome do produto é obrigatório.'),
  sku: z.string().optional(),
  un: z.string(),
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
  is_sample: z.boolean(),
  genero: z.enum(['masculino', 'feminino', 'unissex']).nullable().optional(),
  tamanho: z.string().nullable().optional(),
  foto_url: z.string().nullable().optional(),
  ncm: z.string().min(8, 'NCM deve ter exatamente 8 caracteres.').max(8, 'NCM deve ter exatamente 8 caracteres.').optional().or(z.literal('')),
  cest: z.string().optional(),
  origem: z.string().optional(),
  cfop_padrao: z.string().optional(),
  qualidade: z.string().optional().nullable()
});

type ProdutoFormValues = z.infer<typeof produtoSchema>;

type Props = {
  produto: Produto | null;
  pais: Produto[];
  saving: boolean;
  error: string | null;
  onSalvar: (_values: ProdutoFormValues, _grade?: string[], _cores?: string[]) => void | Promise<void>;
  onCancelar: () => void;
  variantes?: Produto[];
};

function toFormValues(p: Produto | null): ProdutoFormValues {
  const custo = p?.custo || 0;
  const mkv = p?.mkv || 0;
  const mka = p?.mka || 0;
  const pfa = p?.pfa || 0;

  const precoV = mkv !== 0 && custo > 0 ? markupToPrice(custo, mkv) : (p?.pvv || 0);
  const margemV = precoV > 0 && custo > 0 ? ((precoV - custo) / precoV) * 100 : 0;

  const precoA = pfa > 0 ? pfa : (mka !== 0 && custo > 0 ? markupToPrice(custo, mka) : 0);
  const margemA = precoA > 0 && custo > 0 ? ((precoA - custo) / precoA) * 100 : 0;

  return {
    id: p?.id,
    produto_pai_id: p?.produto_pai_id || null,
    nome: p?.nome || '',
    sku: p?.sku || '',
    un: p?.un || 'un',
    cat: p?.cat || '',
    custo: custo > 0 ? custo.toString() : '0',
    precoVarejo: precoV > 0 ? precoV.toFixed(2) : '',
    markupVarejo: mkv !== 0 ? mkv.toString() : '',
    margemVarejo: margemV !== 0 ? margemV.toFixed(1) : '',
    descontoVarejo: p?.dv?.toString() || '',
    markupAtacado: mka !== 0 ? mka.toString() : '',
    margemAtacado: margemA !== 0 ? margemA.toFixed(1) : '',
    precoFixoAtacado: pfa > 0 ? pfa.toFixed(2) : '',
    descontoAtacado: p?.da?.toString() || '',
    qtmin: p?.qtmin?.toString() || '1',
    emin: p?.emin?.toString() || '0',
    esal: p?.esal?.toString() || '0',
    ecm: p?.ecm?.toString() || '0',
    is_sample: p?.is_sample || false,
    genero: p?.genero || null,
    tamanho: p?.tamanho || null,
    foto_url: p?.foto_url || null,
    ncm: p?.ncm || '61091000',
    cest: p?.cest || '',
    origem: p?.origem?.toString() || '0',
    cfop_padrao: p?.cfop_padrao || '5102',
    qualidade: p?.qualidade || null,
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

export function ProdutoForm({ produto, pais, variantes = [], saving, error, onSalvar, onCancelar }: Props) {
  const { resolve } = useApiContext();
  const context = resolve();
  
  const activeFilialId = useFilialStore((s) => s.filialId);
  const { data: filiais = [] } = useFiliaisData();
  const activeFilial = filiais.find((f) => f.id === activeFilialId);
  const isFiscal = activeFilial?.is_fiscal ?? false;
  
  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isDirty, isSubmitSuccessful } } = useForm<ProdutoFormValues>({
    resolver: zodResolver(produtoSchema),
    defaultValues: useMemo(() => toFormValues(produto), [produto])
  });

  const blocker = useUnsavedChangesGuard(isDirty && !isSubmitSuccessful);

  const [gradeSelecionada, setGradeSelecionada] = useState<string[]>([]);
  const [tamanhosInput, setTamanhosInput] = useState('');
  const [coresInput, setCoresInput] = useState('');
  const [activeTab, setActiveTab] = useState<'geral' | 'comercial' | 'grade' | 'logistica' | 'fiscal'>('geral');
  const [uploading, setUploading] = useState(false);

  const watchedValues = watch();
  const preview = useMemo(() => calcPreview(watchedValues), [watchedValues]);
  
  const SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'G1', 'G2', 'G3', 'U'];
  const cores = useMemo(() => coresInput.split(',').map(c => c.trim()).filter(Boolean), [coresInput]);
  const tamanhosCustomizados = useMemo(() => tamanhosInput.split(',').map(t => t.trim()).filter(Boolean), [tamanhosInput]);
  const gradeFinal = useMemo(() => Array.from(new Set([...gradeSelecionada, ...tamanhosCustomizados])), [gradeSelecionada, tamanhosCustomizados]);

  const onSubmit = async (values: ProdutoFormValues) => {
    try {
      const finalValues = {
        ...values,
        origem: values.origem ? parseInt(values.origem, 10) : 0
      };
      await onSalvar(finalValues as any, gradeFinal, cores);
    } catch (e) {
      console.error("Submit Error:", e);
      toast.error("Erro ao processar envio");
    }
  };
  const handleCustomSubmit = handleSubmit(onSubmit as any);

  useEffect(() => {
    reset(toFormValues(produto));
  }, [produto, reset]);

  // Auto-switch tab on error
  useEffect(() => {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      if (errors.nome || errors.sku || errors.un || errors.cat) setActiveTab("geral");
      else if (errors.custo || errors.precoVarejo || errors.markupVarejo) setActiveTab("comercial");
      else if (errors.ncm || errors.cfop_padrao || errors.cest) setActiveTab("fiscal");
    }
  }, [errors]);

  async function handleUpload(file: File) {
    try {
      setUploading(true);
      const ext = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;
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
      toast.error(e instanceof Error ? e.message : 'Falha no upload');
    } finally {
      setUploading(false);
    }
  }

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
      setValue('precoFixoAtacado', atacado.preco);
      setValue('markupAtacado', atacado.markup);
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
      markup: field === 'markup' ? raw : watchedValues.markupVarejo || '',
      margem: field === 'margem' ? raw : watchedValues.margemAtacado || ''
    };
    const synced = syncPriceFields(field, current, custo);
    setValue('precoFixoAtacado', synced.preco);
    setValue('markupAtacado', synced.markup);
    setValue('margemAtacado', synced.margem);
  }

  function handlePaiChange(paiId: string) {
    const pai = pais.find((p) => p.id === paiId);
    if (pai) {
      setValue('nome', pai.nome);
      setValue('cat', pai.cat || '');
      setValue('custo', pai.custo.toString());
      setValue('precoVarejo', pai.pvv?.toString() || '');
      setValue('markupVarejo', pai.mkv?.toString() || '');
      setValue('precoFixoAtacado', pai.pfa?.toString() || '');
      setValue('markupAtacado', pai.mka?.toString() || '');
    }
    setValue('produto_pai_id', paiId || null);
  }

  return (
    <form onSubmit={handleCustomSubmit} className="flex flex-col h-full overflow-hidden" data-testid="produto-form">
      {/* High-Tech Tab Navigation */}
      <div className="px-8 pt-8 pb-4 bg-slate-950/20 border-b border-white/5 sticky top-0 z-20 backdrop-blur-3xl">
        <div className="flex items-center p-1.5 bg-white/[0.03] border border-white/5 rounded-[1.25rem] shadow-inner">
          {[
            { id: 'geral', label: 'Geral', icon: <Image size={14} /> },
            { id: 'comercial', label: 'Comercial', icon: <TrendingUp size={14} /> },
            ...(!watchedValues.produto_pai_id ? [{ id: 'grade', label: 'Grade', icon: <RefreshCw size={14} /> }] : []),
            { id: 'logistica', label: 'Logística', icon: <AlertCircle size={14} /> },
            ...(isFiscal ? [{ id: 'fiscal', label: 'Fiscal', icon: <ShieldCheck size={14} /> }] : [])
          ].map((tab: any) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-[1rem] text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300",
                activeTab === tab.id 
                  ? "bg-teal-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]" 
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Form Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-10">
        <AnimatePresence mode="wait">
          {activeTab === 'geral' && (
            <motion.div
              key="geral"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.2 }}
              className="space-y-10"
            >
              <FormSection 
                title="Essencial" 
                description="Dados de identificação e classificação do item."
                aside={<span className="px-2 py-1 bg-teal-500/10 rounded-full border border-teal-500/20 text-sm font-medium text-slate-400">Obrigatório</span>}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="flex flex-col gap-4">
                     <label className="block mb-2 text-sm font-medium text-slate-400">Imagem de Capa</label>
                     <div className="relative group">
                        <div className="aspect-square w-full rounded-[2rem] bg-slate-900/50 border-2 border-dashed border-white/10 overflow-hidden flex items-center justify-center transition-all group-hover:border-teal-500/50">
                           {watchedValues.foto_url ? (
                             <div className="relative w-full h-full">
                                <img src={watchedValues.foto_url} alt="Preview" className="w-full h-full object-cover" />
                                <button 
                                  type="button"
                                  onClick={() => setValue('foto_url', null)}
                                  className="absolute top-4 right-4 p-2 bg-rose-500 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 size={16} />
                                </button>
                             </div>
                           ) : (
                             <div className="flex flex-col items-center gap-3 text-slate-500 group-hover:text-teal-500 transition-colors">
                                {uploading ? <Loader2 size={32} className="animate-spin" /> : <Image size={32} strokeWidth={1} />}
                                <span className="text-sm font-medium text-slate-400">Upload Foto</span>
                             </div>
                           )}
                        </div>
                        <input 
                          type="file" accept="image/*" 
                          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                          className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                          disabled={uploading}
                        />
                     </div>
                  </div>

                  <div className="md:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input label="Nome Comercial" required {...register('nome')} error={errors.nome?.message} placeholder="Ex: Camisa Polo - Azul" />
                      <Input label="Código SKU" helperText="Identificação única" {...register('sku')} placeholder="Opcional" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Select 
                        label="Unidade" 
                        {...register('un')} 
                        value={watch('un')}
                        options={[{ value: 'un', label: 'Unidade (un)' }, { value: 'pc', label: 'Peça (pc)' }, { value: 'par', label: 'Par' }]} 
                      />
                      <Input label="Categoria" {...register('cat')} placeholder="Ex: Vestuário" />
                      <Select 
                        label="Qualidade / Tipo" 
                        {...register('qualidade')} 
                        value={watch('qualidade')}
                        options={[
                          { value: '', label: 'Nenhum / Padrão' },
                          { value: 'Primeira Linha', label: 'Primeira Linha' },
                          { value: 'Tailandesa', label: 'Tailandesa' },
                          { value: 'Original', label: 'Original' },
                          { value: 'Nacional', label: 'Nacional' }
                        ]} 
                      />
                    </div>
                    <div className="pt-4 border-t border-white/5 space-y-3">
                       <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gênero do Produto</span>
                       <div className="flex gap-6 bg-slate-900/30 p-3 rounded-xl border border-white/5 w-fit">
                         {['masculino', 'feminino', 'unissex'].map(g => (
                           <label key={g} className="flex items-center gap-2 cursor-pointer group">
                             <input type="radio" value={g} {...register('genero')} className="w-4 h-4 text-teal-500 bg-slate-900 border-white/10" />
                             <span className="text-sm font-semibold text-slate-400 group-hover:text-white uppercase transition-colors">{g}</span>
                           </label>
                         ))}
                       </div>
                    </div>
                  </div>
                </div>

                {pais.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-white/5">
                    <Select 
                      label="Vincular a Família (Produto Pai)" 
                      value={watchedValues.produto_pai_id ?? ''} 
                      onChange={(e) => handlePaiChange(e.target.value)} 
                      options={[{ value: '', label: '— Produto Principal (Mestre) —' }, ...pais.filter(p => p.id !== produto?.id).map(p => ({ value: p.id, label: p.nome }))]} 
                    />
                  </div>
                )}

                {watchedValues.produto_pai_id && (
                  <div className="mt-8 p-6 bg-white/[0.02] rounded-3xl border border-white/5 space-y-6">
                    <div className="flex flex-col gap-4">
                      <label className="text-sm font-medium text-slate-400">Atributos da Variante</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <span className="text-[9px] font-bold text-slate-600 uppercase">Grade</span>
                           <div className="flex flex-wrap gap-1.5">
                             {['P', 'M', 'G', 'GG', 'XG'].map(size => (
                               <label key={size} className="relative cursor-pointer">
                                 <input type="radio" value={size} {...register('tamanho')} className="peer absolute opacity-0" />
                                 <div className="px-3 py-1.5 bg-white/5 rounded-lg text-[10px] font-black text-slate-500 border border-transparent peer-checked:bg-teal-500 peer-checked:text-white peer-checked:shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all uppercase">{size}</div>
                               </label>
                             ))}
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </FormSection>
            </motion.div>
          )}

          {activeTab === 'comercial' && (
            <motion.div
              key="comercial"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.2 }}
              className="space-y-10"
            >
              <FormSection title="Precificação" description="Definição de custos e estratégias de venda.">
                <div className="bg-teal-500/5 p-8 rounded-[2rem] border border-teal-500/10 mb-8">
                   <Input label="Custo de Entrada (R$)" required className="!text-xl font-black text-white" type="number" min="0" step="0.01" value={watchedValues.custo} onChange={(e) => handleCusto(e.target.value)} error={errors.custo?.message} />
                   <div className="mt-4 flex items-center gap-2">
                     <input type="checkbox" {...register('is_sample')} className="w-4 h-4 rounded bg-slate-900 border-white/10 text-teal-500" />
                     <span className="text-sm font-medium text-slate-400">Produto de Mostruário (Auditável)</span>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-12">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-teal-500 rounded-full" />
                      <h4 className="text-white text-sm font-medium text-slate-400">Venda Varejo</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <Input label="Preço Sugerido" className="font-black text-teal-400" type="number" value={watchedValues.precoVarejo} onChange={(e) => handleVariavelVarejo('preco', e.target.value)} />
                      <Input label="Markup (%)" type="number" value={watchedValues.markupVarejo} onChange={(e) => handleVariavelVarejo('markup', e.target.value)} />
                      <Input label="Margem (%)" type="number" value={watchedValues.margemVarejo} onChange={(e) => handleVariavelVarejo('margem', e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-6 pt-10 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                      <h4 className="text-white text-sm font-medium text-slate-400">Venda Atacado</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <Input label="Preço Sugerido" className="font-black text-emerald-400" type="number" value={watchedValues.precoFixoAtacado} onChange={(e) => handleVariavelAtacado('preco', e.target.value)} />
                      <Input label="Markup (%)" type="number" value={watchedValues.markupAtacado} onChange={(e) => handleVariavelAtacado('markup', e.target.value)} />
                      <Input label="Margem (%)" type="number" value={watchedValues.margemAtacado} onChange={(e) => handleVariavelAtacado('margem', e.target.value)} />
                    </div>
                  </div>
                </div>
              </FormSection>
            </motion.div>
          )}

          {activeTab === 'grade' && !watchedValues.produto_pai_id && (
            <motion.div
              key="grade"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.2 }}
            >
              <FormSection title="Gerador de Matriz" description="Criação automática de grades de tamanho e cor.">
                <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                  <Typography variant="label" color="muted" className="mb-4 block uppercase tracking-tighter">Selecione os Tamanhos</Typography>
                  <div className="flex flex-wrap gap-2 mb-4">
                      {SIZES.map(size => (
                        <button
                          key={size} type="button"
                          onClick={() => setGradeSelecionada(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size])}
                          className={cn(
                            "w-12 h-12 rounded-xl text-xs font-black transition-all border-2",
                            gradeSelecionada.includes(size) ? "bg-teal-500 border-teal-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]" : "bg-white/5 border-white/5 text-slate-500 hover:border-white/10"
                          )}
                        >
                          {size}
                        </button>
                      ))}
                  </div>

                  <div className="mb-8">
                      <Typography variant="label" color="muted" className="mb-3 block uppercase tracking-tighter">Tamanhos numéricos / extras (vírgula)</Typography>
                      <input
                        type="text" placeholder="Ex: 36, 38, 40, 42"
                        value={tamanhosInput} onChange={e => setTamanhosInput(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-teal-500/50 transition-all outline-none"
                      />
                  </div>
                  
                  <div className="mb-8">
                      <Typography variant="label" color="muted" className="mb-3 block uppercase tracking-tighter">Cores Disponíveis (vírgula)</Typography>
                      <input
                        type="text" placeholder="Ex: Azul, Branco, Preto"
                        value={coresInput} onChange={e => setCoresInput(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-teal-500/50 transition-all outline-none"
                      />
                  </div>

                  {(gradeFinal.length > 0 || cores.length > 0) && (
                    <div className="space-y-4 p-6 bg-teal-500/5 rounded-3xl border border-teal-500/10">
                      <div className="flex justify-between items-center">
                        <Typography variant="caption" className="!text-teal-400 font-bold uppercase tracking-widest">Preview da Matriz</Typography>
                        <span className="px-2 py-0.5 bg-teal-500 text-white text-[9px] font-black rounded-full">{Math.max(1, gradeFinal.length) * Math.max(1, cores.length)} itens</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                          {(cores.length > 0 ? cores : [null]).map(color => (
                            (gradeFinal.length > 0 ? gradeFinal : [null]).map(size => {
                              if (!color && !size) return null;
                              return (
                                <div key={`${color}-${size}`} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                  <span className="text-[10px] font-bold text-white uppercase">{watchedValues.nome} {color ? `- ${color}` : ''} {size ? `- ${size}` : ''}</span>
                                  <span className="text-[9px] font-black text-teal-500">VARIANTE</span>
                                </div>
                              );
                            })
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </FormSection>

              {variantes.length > 0 && (
                <div className="mt-8">
                  <FormSection title="Variantes Existentes" description="Lista de tamanhos e cores que já foram criados para este produto.">
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                       {variantes.map(v => (
                          <div key={v.id} className="p-3 bg-white/[0.02] rounded-xl border border-white/5 flex flex-col gap-1 hover:border-white/10 transition-colors">
                             <span className="text-sm font-bold text-white truncate" title={v.nome}>{v.nome.replace(produto?.nome || '', '').replace(/^\s*[-–—]\s*/, '').trim() || v.nome}</span>
                             <div className="flex items-center justify-between mt-1">
                               <span className="text-[10px] text-slate-500 font-medium">SKU: {v.sku || '—'}</span>
                               <span className="text-[10px] font-black text-slate-400 bg-white/5 px-1.5 py-0.5 rounded-md">
                                 {v.is_active === false ? 'INATIVA' : 'ATIVA'}
                               </span>
                             </div>
                          </div>
                       ))}
                     </div>
                  </FormSection>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'logistica' && (
            <motion.div
              key="logistica"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.2 }}
              className="space-y-10"
            >
              <FormSection title="Logística" description="Controle de estoque e alarmes de reposição.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <Input label="Estoque Mínimo" type="number" {...register('emin')} />
                    <Input label="Alerta Reposição" type="number" {...register('esal')} />
                  </div>
                  <div className="p-6 bg-slate-900/50 rounded-3xl border border-white/5 flex flex-col justify-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg"><AlertCircle size={20} /></div>
                      <Typography variant="h3" as="h4" className="!text-xs font-black uppercase text-white">Sincronização Ativa</Typography>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Os saldos físicos e custos médios são atualizados em tempo real através dos módulos de <strong>Entrada</strong> e <strong>Estoque</strong>.</p>
                  </div>
                </div>
              </FormSection>

              {preview && (
                <div className="p-8 bg-emerald-500/10 rounded-[2.5rem] border border-emerald-500/20 relative overflow-hidden shadow-2xl">
                  <TrendingUp size={120} className="absolute -right-4 -bottom-4 text-emerald-500/5 rotate-12" />
                  <Typography variant="label" className="!text-emerald-400 font-black uppercase tracking-[0.2em] mb-6 block">Resumo Comercial Final</Typography>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <span className="text-[9px] font-bold text-emerald-400/60 uppercase block mb-1">Margem Varejo</span>
                      <span className="text-3xl font-black text-white font-display tracking-tight">{preview.pv > 0 ? fmt(preview.pv) : '-'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-emerald-400/60 uppercase block mb-1">Margem Atacado</span>
                      <span className="text-3xl font-black text-white font-display tracking-tight">{preview.pa > 0 ? fmt(preview.pa) : '-'}</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'fiscal' && (
            <motion.div
              key="fiscal"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.2 }}
              className="space-y-10"
            >
              <FormSection 
                title="Dados Regulatórios e Fiscais" 
                description="Classificação e alíquotas obrigatórias para emissão de NF-e pela SEFAZ."
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <Input 
                      label="NCM (Nomenclatura Comum do Mercosul)" 
                      required 
                      maxLength={8}
                      {...register('ncm')} 
                      error={errors.ncm?.message} 
                      placeholder="Ex: 61091000" 
                      helperText="Exatamente 8 dígitos numéricos"
                    />
                    <Input 
                      label="CFOP Padrão (Venda)" 
                      maxLength={4}
                      {...register('cfop_padrao')} 
                      error={errors.cfop_padrao?.message} 
                      placeholder="Ex: 5102" 
                      helperText="Exatamente 4 dígitos numéricos"
                    />
                  </div>
                  
                  <div className="space-y-6">
                    <Select 
                      label="Origem da Mercadoria" 
                      {...register('origem')}
                      value={watch('origem')}
                      options={[
                        { value: '0', label: '0 - Nacional' },
                        { value: '1', label: '1 - Estrangeira - Importação Direta' },
                        { value: '2', label: '2 - Estrangeira - Adquirida no Mercado Interno' },
                        { value: '3', label: '3 - Nacional, mercadoria ou bem com Conteúdo de Importação > 40%' }
                      ]} 
                    />
                    <Input 
                      label="CEST (Cód. Especificador de Substituição Tributária)" 
                      maxLength={7}
                      {...register('cest')} 
                      error={errors.cest?.message} 
                      placeholder="Ex: 2804200 (Opcional)" 
                    />
                  </div>
                </div>
              </FormSection>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <UnsavedChangesModal blocker={blocker as any} />

      {/* Fixed Footer */}
      <div className="px-8 py-6 bg-slate-950/40 border-t border-white/5 backdrop-blur-3xl flex flex-col gap-4">
        <FormError message={error || Object.values(errors).map(e => e?.message).filter(Boolean).join(", ")} />
        <FormActions 
          onCancel={onCancelar} 
          loading={saving} 
          submitLabel={produto ? 'Confirmar Edição' : 'Gerar e Finalizar'} 
        />
      </div>
    </form>
  );
}
