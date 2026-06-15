import { useState, useMemo } from 'react';
import { X, Save, Plus, Trash2, CheckCircle2, ChevronRight, Calculator, AlertCircle, User as UserIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Card, Badge } from '../../../shared/ui';
import { fmtBRL } from '../../../shared/lib/formatters';
import { useAuthStore } from '../../../app/useAuthStore';
import { useUIStore } from '../../../app/useUIStore';
import { useIsMobile } from '../../../shared/hooks/useIsMobile';
import { orcamentosApi, type OrcamentoObra, type OrcamentoItem } from '../services/orcamentosApi';

type Props = {
  onSave: (orcamento: Partial<OrcamentoObra>, itens: OrcamentoItem[]) => void;
  onClose: () => void;
  filialId: string;
  initialData?: OrcamentoObra;
};

export function OrcamentoForm({ onSave, onClose, filialId, initialData }: Props) {
  const { sidebarCollapsed: collapsed } = useUIStore();
  const isMobile = useIsMobile(1024);
  const [titulo, setTitulo] = useState(initialData?.titulo || '');
  const [clienteNome, setClienteNome] = useState(initialData?.cliente_nome || initialData?.cliente?.nome || '');
  const [modalidade, setModalidade] = useState<'empreitada' | 'administracao'>(initialData?.modalidade || 'empreitada');
  const [bdi, setBdi] = useState(initialData?.bdi_percentual ?? 30.0);
  const [taxaAdmin, setTaxaAdmin] = useState(initialData?.taxa_administracao_percentual ?? 20.0);
  const [status, setStatus] = useState(initialData?.status || 'rascunho');
  const [itens, setItens] = useState<OrcamentoItem[]>(initialData?.itens || []);
  
  // Agrupar itens por ambiente para a View
  const ambientes = useMemo(() => {
    const map = new Map<string, OrcamentoItem[]>();
    itens.forEach(i => {
      const key = i.ambiente || 'Geral';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(i);
    });
    return Array.from(map.entries());
  }, [itens]);

  const session = useAuthStore(s => s.session);

  const { data: templates = [] } = useQuery({
    queryKey: ['orcamento-templates', filialId],
    queryFn: () => orcamentosApi.listTemplates(session!.access_token, filialId),
    enabled: !!session?.access_token && !!filialId
  });

  const handleImportTemplate = async (templateId: string) => {
    if (!templateId) return;
    try {
      const template = await orcamentosApi.getTemplate(session!.access_token, templateId);
      if (template.itens) {
        // Appends template items to current items
        const newItens = template.itens.map(i => ({ ...i, ordem_apresentacao: itens.length }));
        setItens([...itens, ...newItens]);
        if (!titulo) setTitulo(template.titulo);
        toast.success(`Template '${template.titulo}' importado com sucesso!`);
      }
    } catch (err: any) {
      toast.error('Erro ao importar template', { description: err.message });
    }
  };

  const addAmbiente = () => {
    const nome = prompt('Qual o nome do novo ambiente? (Ex: Suíte Master, Cozinha)');
    if (!nome) return;
    if (itens.some(i => i.ambiente === nome)) return toast.error('Ambiente já existe');
    
    // Adiciona um item vazio para garantir que o ambiente exista no state
    setItens([...itens, {
      ambiente: nome,
      ordem_apresentacao: itens.length,
      descricao_servico: 'Novo serviço',
      unidade: 'un',
      quantidade: 1,
      custo_material_unitario: 0,
      custo_mao_obra_unitario: 0
    }]);
  };

  const addItemToAmbiente = (ambiente: string) => {
    setItens([...itens, {
      ambiente,
      ordem_apresentacao: itens.length,
      descricao_servico: '',
      unidade: 'm2',
      quantidade: 1,
      custo_material_unitario: 0,
      custo_mao_obra_unitario: 0
    }]);
  };

  const updateItem = (index: number, field: keyof OrcamentoItem, value: any) => {
    const newItens = [...itens];
    newItens[index] = { ...newItens[index], [field]: value };
    setItens(newItens);
  };

  const removeItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  // Cálculos em tempo real
  const totalMaterial = itens.reduce((acc, i) => acc + (i.custo_material_unitario * i.quantidade), 0);
  const totalMaoObra = itens.reduce((acc, i) => acc + (i.custo_mao_obra_unitario * i.quantidade), 0);
  const custoDiretoTotal = totalMaterial + totalMaoObra;
  
  const precoVendaFinal = modalidade === 'administracao'
    ? custoDiretoTotal * (1 + (taxaAdmin / 100))
    : custoDiretoTotal * (1 + (bdi / 100));

  const margemBruta = modalidade === 'administracao'
    ? custoDiretoTotal * (taxaAdmin / 100)
    : custoDiretoTotal * (bdi / 100);

  const handleSave = () => {
    if (!titulo) return toast.error('Informe um título para a obra');
    if (itens.length === 0) return toast.error('Adicione pelo menos um item');
    
    // Validate empty services
    if (itens.some(i => !i.descricao_servico.trim())) {
      return toast.error('Preencha a descrição de todos os serviços');
    }

    onSave({
      id: initialData?.id,
      titulo,
      cliente_nome: clienteNome,
      modalidade,
      bdi_percentual: bdi,
      taxa_administracao_percentual: taxaAdmin,
      status
    }, itens);
  };

  return (
    <div 
      className="fixed bottom-0 right-0 z-50 flex items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 transition-all duration-300"
      style={{ left: isMobile ? 0 : (collapsed ? '80px' : '280px'), top: isMobile ? 0 : '80px' }}
    >
      <Card className={`w-full max-w-5xl max-h-full sm:max-h-[90vh] overflow-hidden flex flex-col bg-surface-card border-white/10 shadow-2xl ${isMobile ? 'h-full rounded-none' : ''}`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/10 text-teal-400 rounded-xl border border-teal-500/20">
              <Calculator size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Planilha Mestra de Orçamento</h2>
              <p className="text-sm font-medium text-slate-400 mt-0.5">Formação de Preço e BDI</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar orçamento" className="text-slate-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-950/20">
          
          {/* Header Params */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-5 rounded-2xl border border-white/5 bg-white/[0.01]">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-slate-400">Nome da Obra / Projeto</label>
              <input 
                name="titulo_obra"
                type="text" 
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Reforma Apartamento 402 - Chave na Mão"
                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus-visible:border-teal-500/50 focus-visible:ring-1 focus-visible:ring-teal-500/50 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-400">Cliente</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  name="cliente_nome"
                  type="text" 
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 pl-9 text-white focus:outline-none focus-visible:border-teal-500/50 focus-visible:ring-1 focus-visible:ring-teal-500/50 transition-all"
                />
              </div>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-slate-400">Modalidade</label>
              <select
                name="modalidade"
                value={modalidade}
                onChange={(e) => setModalidade(e.target.value as 'empreitada' | 'administracao')}
                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus-visible:border-teal-500/50 focus-visible:ring-1 focus-visible:ring-teal-500/50 transition-all appearance-none"
              >
                <option value="empreitada">Empreitada de Mão de Obra</option>
                <option value="administracao">Obra por Administração (Preço de Custo)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-400">
                {modalidade === 'empreitada' ? 'Taxa de BDI (%)' : 'Taxa de Administração (%)'}
              </label>
              <input 
                name="taxa_bdi"
                type="number" 
                value={modalidade === 'empreitada' ? bdi : taxaAdmin}
                onChange={(e) => modalidade === 'empreitada' ? setBdi(Number(e.target.value)) : setTaxaAdmin(Number(e.target.value))}
                step="0.5"
                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus-visible:border-teal-500/50 focus-visible:ring-1 focus-visible:ring-teal-500/50 transition-all"
              />
            </div>
          </div>

          {/* Builder de Ambientes */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-400">Escopo por Ambientes</h3>
              <div className="flex items-center gap-3">
                <select 
                  onChange={(e) => {
                    handleImportTemplate(e.target.value);
                    e.target.value = ""; // reset
                  }}
                  className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-1.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-500/50 text-sm font-medium text-slate-400"
                >
                  <option value="">+ Importar Combo/Template</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.titulo}</option>
                  ))}
                </select>

                <Button size="sm" variant="secondary" leftIcon={<Plus size={14} />} onClick={addAmbiente}>
                  Adicionar Ambiente
                </Button>
              </div>
            </div>

            {ambientes.length === 0 && (
              <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-3xl">
                <p className="text-xs text-slate-500 font-medium">Nenhum ambiente adicionado. Comece adicionando um ambiente.</p>
              </div>
            )}

            {ambientes.map(([amb, ambItens]) => (
              <div key={amb} className="rounded-2xl border border-white/10 bg-slate-900/40 overflow-hidden shadow-xl">
                <div className="bg-white/[0.02] border-b border-white/5 p-4 flex items-center justify-between">
                  <h4 className="font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <ChevronRight size={18} className="text-teal-400" />
                    {amb}
                  </h4>
                  <button onClick={() => addItemToAmbiente(amb)} className="hover:text-teal-300 text-sm font-medium text-slate-400">
                    + Novo Serviço
                  </button>
                </div>
                <div className="p-4 space-y-2">
                  <div className="grid grid-cols-12 gap-4 px-4 pb-2 text-xs font-medium text-slate-500">
                    <div className="col-span-4">Descrição do Serviço</div>
                    <div className="col-span-1 text-center">Un.</div>
                    <div className="col-span-1 text-center">Qtd</div>
                    <div className="col-span-2 text-right">Custo Mat.</div>
                    <div className="col-span-2 text-right">Custo M.O.</div>
                    <div className="col-span-2 text-right">Direto (M+M.O)</div>
                  </div>
                  
                  {itens.map((item, originalIdx) => {
                    if (item.ambiente !== amb) return null;
                    return (
                      <div key={originalIdx} className="grid grid-cols-12 gap-4 items-center bg-black/20 p-2 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                        <div className="col-span-4">
                          <input 
                            name={`desc_${originalIdx}`}
                            type="text" 
                            value={item.descricao_servico}
                            onChange={(e) => updateItem(originalIdx, 'descricao_servico', e.target.value)}
                            placeholder="Ex: Assentamento de porcelanato…"
                            className="w-full bg-transparent border border-transparent text-xs text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-500/50 focus-visible:border-teal-500/50 rounded p-1"
                          />
                        </div>
                        <div className="col-span-1">
                          <input 
                            name={`unidade_${originalIdx}`}
                            type="text" 
                            value={item.unidade}
                            onChange={(e) => updateItem(originalIdx, 'unidade', e.target.value)}
                            className="w-full bg-white/5 border border-transparent text-xs text-center text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-500/50 focus-visible:border-teal-500/50 rounded p-1"
                          />
                        </div>
                        <div className="col-span-1">
                          <input 
                            name={`qtd_${originalIdx}`}
                            type="number" 
                            value={item.quantidade}
                            onChange={(e) => updateItem(originalIdx, 'quantidade', Number(e.target.value))}
                            className="w-full bg-white/5 border border-transparent text-xs text-center text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-500/50 focus-visible:border-teal-500/50 rounded p-1"
                          />
                        </div>
                        <div className="col-span-2">
                          <input 
                            name={`custo_mat_${originalIdx}`}
                            type="number" 
                            value={item.custo_material_unitario}
                            onChange={(e) => updateItem(originalIdx, 'custo_material_unitario', Number(e.target.value))}
                            className="w-full bg-white/5 border border-transparent text-xs text-right text-slate-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-500/50 focus-visible:border-teal-500/50 rounded p-1"
                          />
                        </div>
                        <div className="col-span-2">
                          <input 
                            name={`custo_mo_${originalIdx}`}
                            type="number" 
                            value={item.custo_mao_obra_unitario}
                            onChange={(e) => updateItem(originalIdx, 'custo_mao_obra_unitario', Number(e.target.value))}
                            className="w-full bg-white/5 border border-transparent text-xs text-right text-slate-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-500/50 focus-visible:border-teal-500/50 rounded p-1"
                          />
                        </div>
                        <div className="col-span-2 flex items-center justify-end gap-3">
                          <span className="text-xs font-bold text-amber-400/90">
                            {fmtBRL((item.custo_material_unitario + item.custo_mao_obra_unitario) * item.quantidade)}
                          </span>
                          <button onClick={() => removeItem(originalIdx)} aria-label="Remover item" className="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Dashboard / Footer */}
        <div className="p-6 border-t border-white/5 bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-8 w-full md:w-auto">
            <div>
              <span className="text-xs font-medium text-slate-500 block mb-1">Custo Direto (Obra)</span>
              <span className="text-lg font-black text-amber-400">{fmtBRL(custoDiretoTotal)}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 block mb-1 flex items-center gap-1">
                <Plus size={10}/> {modalidade === 'empreitada' ? `BDI (${bdi}%)` : `Taxa Admin (${taxaAdmin}%)`}
              </span>
              <span className="text-lg font-black text-emerald-400">{fmtBRL(margemBruta)}</span>
            </div>
            <div className="hidden lg:block h-8 w-px bg-white/10" />
            <div>
              <span className="text-xs font-medium text-teal-500 block mb-1">Preço Venda (Cliente)</span>
              <span className="text-2xl font-black text-white shadow-teal-500/20">{fmtBRL(precoVendaFinal)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-500/50 text-sm font-medium text-slate-400"
            >
              <option value="rascunho">Rascunho</option>
              <option value="enviado">Enviado</option>
              <option value="aprovado">Aprovado (Vira Contrato)</option>
              <option value="rejeitado">Rejeitado</option>
            </select>
            <Button variant="primary" leftIcon={<Save size={18} />} onClick={handleSave}>Salvar Orçamento</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
