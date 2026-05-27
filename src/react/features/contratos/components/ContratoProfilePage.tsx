import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  LucideArrowLeft, 
  Hammer, 
  Calendar, 
  User, 
  Plus, 
  Bot, 
  DollarSign, 
  FileText, 
  Sun, 
  CloudRain, 
  Cloud, 
  Check, 
  Loader2, 
  Camera, 
  UserCheck, 
  AlertTriangle,
  ClipboardList,
  BarChart3,
  Paperclip,
  UploadCloud,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { useContratoDetail, useOrdensServicoData } from '../hooks/useContratosData';
import { OrdemServicoModal } from './OrdemServicoModal';
import { AnalisadorContratoModal } from './AnalisadorContratoModal';
import { useFilialStore } from '../../../app/useFilialStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { contratosApi } from '../services/contratosApi';
import { listPedidosCompra } from '../../compras/services/comprasApi';
import { fmtBRL } from '../../../shared/lib/formatters';
import { Badge, Button, Card, EmptyState } from '../../../shared/ui';
import type { ContratoAditivoDraft, ContratoCronogramaDraft, DiarioObraDraft, OrdemServico } from '../types';

export function ContratoProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const filialId = useFilialStore((s) => s.filialId);
  const session = useAuthStore((s) => s.session);
  const { resolve } = useApiContext();

  const [activeTab, setActiveTab] = useState<'geral' | 'cronograma' | 'diario' | 'financeiro' | 'documentos'>('geral');
  const [isOsModalOpen, setIsOsModalOpen] = useState(false);
  const [isAnalisadorOpen, setIsAnalisadorOpen] = useState(false);

  // Form states for new items
  const [newAditivoTitle, setNewAditivoTitle] = useState('');
  const [newAditivoValue, setNewAditivoValue] = useState(0);

  const [newPhaseTitle, setNewPhaseTitle] = useState('');
  const [newPhaseStart, setNewPhaseStart] = useState('');
  const [newPhaseEnd, setNewPhaseEnd] = useState('');
  const [newPhasePrecedente, setNewPhasePrecedente] = useState('');
  const [newPhaseValorFaturamento, setNewPhaseValorFaturamento] = useState(0);

  const [newDiarioTitle, setNewDiarioTitle] = useState('');
  const [newDiarioRelatorio, setNewDiarioRelatorio] = useState('');
  const [newDiarioClima, setNewDiarioClima] = useState<'ensolarado' | 'chuvoso' | 'nublado'>('ensolarado');
  const [newDiarioMaoDeObra, setNewDiarioMaoDeObra] = useState(1);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  // 1. Fetch Contrato details
  const { data: contrato, isLoading: isLoadingContrato, refetch: refetchContrato } = useContratoDetail(id);
  
  // 2. Fetch Ordens de Serviço
  const { data: ordensServico = [], refetch: refetchOS } = useOrdensServicoData(id);

  // 3. Fetch Aditivos
  const { data: aditivos = [], refetch: refetchAditivos } = useQuery({
    queryKey: ['contrato-aditivos', id, filialId],
    queryFn: () => {
      const context = resolve();
      if (!context || !id) throw new Error('API context not ready');
      return contratosApi.getContratoAditivos(context, id);
    },
    enabled: !!id && !!filialId
  });

  // 4. Fetch Cronograma
  const { data: cronograma = [], refetch: refetchCronograma } = useQuery({
    queryKey: ['contrato-cronograma', id, filialId],
    queryFn: () => {
      const context = resolve();
      if (!context || !id) throw new Error('API context not ready');
      return contratosApi.getContratoCronograma(context, id);
    },
    enabled: !!id && !!filialId
  });

  // 5. Fetch Diarios
  const { data: diarios = [], refetch: refetchDiarios } = useQuery({
    queryKey: ['contrato-diarios', id, filialId],
    queryFn: () => {
      const context = resolve();
      if (!context || !id) throw new Error('API context not ready');
      return contratosApi.getDiarioObra(context, id);
    },
    enabled: !!id && !!filialId
  });

  // 5.5 Fetch Arquivos
  const { data: arquivos = [], refetch: refetchArquivos } = useQuery({
    queryKey: ['contrato-arquivos', id, filialId],
    queryFn: () => {
      const context = resolve();
      if (!context || !id) throw new Error('API context not ready');
      return contratosApi.getContratoArquivos(context, id);
    },
    enabled: !!id && !!filialId
  });

  // 6. Fetch Purchases to appropriate costs
  const { data: compras = [], refetch: refetchCompras } = useQuery({
    queryKey: ['pedidos-compra-list', filialId],
    queryFn: () => {
      if (!session?.access_token || !filialId) throw new Error('Auth not ready');
      return listPedidosCompra(session.access_token, filialId);
    },
    enabled: !!filialId && !!session?.access_token
  });

  // 7. Fetch Accounts Receivable (Faturamentos) for this contract
  const { data: faturamentos = [], refetch: refetchFaturamentos } = useQuery({
    queryKey: ['contrato-faturamentos', id, filialId],
    queryFn: () => {
      const context = resolve();
      if (!context || !id) throw new Error('API context not ready');
      return contratosApi.getContratoContasReceber(context, id);
    },
    enabled: !!id && !!filialId
  });

  // Financial Calculations
  const despesasApropriadas = useMemo(() => {
    return compras.filter(c => c.contrato_id === id && c.status === 'finalizado');
  }, [compras, id]);

  const totalInsumos = useMemo(() => {
    return despesasApropriadas.reduce((acc, c) => acc + c.total, 0);
  }, [despesasApropriadas]);

  const totalAditivos = useMemo(() => {
    return aditivos.reduce((acc, a) => acc + Number(a.valor), 0);
  }, [aditivos]);

  const totalMaoDeObraTerceiros = useMemo(() => {
    return ordensServico
      .filter(os => os.status === 'concluida')
      .reduce((acc, os) => acc + (os.valor_parceiro || 0), 0);
  }, [ordensServico]);

  const valorContratadoTotal = (contrato?.valor_total || 0) + totalAditivos;
  const totalCustosReal = totalInsumos + totalMaoDeObraTerceiros;
  const margemRealEst = valorContratadoTotal - totalCustosReal;
  const pacingPercentual = valorContratadoTotal > 0 ? (totalCustosReal / valorContratadoTotal) * 100 : 0;

  // Mutations
  const createAditivoMutation = useMutation({
    mutationFn: (draft: ContratoAditivoDraft) => {
      const context = resolve();
      if (!context) throw new Error('API context not ready');
      return contratosApi.createContratoAditivo(context, draft);
    },
    onSuccess: () => {
      refetchAditivos();
      setNewAditivoTitle('');
      setNewAditivoValue(0);
      toast.success('Termo aditivo lançado com sucesso!');
    }
  });

  const createDiarioMutation = useMutation({
    mutationFn: (draft: DiarioObraDraft) => {
      const context = resolve();
      if (!context) throw new Error('API context not ready');
      return contratosApi.createDiarioObra(context, draft);
    },
    onSuccess: () => {
      refetchDiarios();
      setNewDiarioTitle('');
      setNewDiarioRelatorio('');
      setUploadedPhotos([]);
      toast.success('Relatório Diário de Obra (RDO) registrado!');
    }
  });

  const createCronogramaMutation = useMutation({
    mutationFn: (draft: ContratoCronogramaDraft) => {
      const context = resolve();
      if (!context) throw new Error('API context not ready');
      return contratosApi.createContratoCronograma(context, draft);
    },
    onSuccess: () => {
      refetchCronograma();
      setNewPhaseTitle('');
      setNewPhaseStart('');
      setNewPhaseEnd('');
      setNewPhasePrecedente('');
      setNewPhaseValorFaturamento(0);
      toast.success('Nova fase adicionada ao cronograma!');
    }
  });

  const faturarMarcoMutation = useMutation({
    mutationFn: (params: { cronogramaId: string; valor: number; tituloFase: string }) => {
      const context = resolve();
      if (!context || !contrato) throw new Error('API or contract not ready');
      return contratosApi.faturarMarcoCronograma(context, {
        contratoId: contrato.id,
        cronogramaId: params.cronogramaId,
        clienteId: contrato.cliente_id,
        clienteNome: contrato.cliente?.nome || 'Cliente da Obra',
        valor: params.valor,
        tituloFase: params.tituloFase
      });
    },
    onSuccess: () => {
      refetchFaturamentos();
      toast.success('Faturamento lançado no contas a receber com sucesso!');
    },
    onError: (err: any) => {
      toast.error('Erro ao faturar marco físico', { description: err.message });
    }
  });

  const updateCronogramaProgressMutation = useMutation({
    mutationFn: ({ phaseId, progress }: { phaseId: string, progress: number }) => {
      const context = resolve();
      if (!context) throw new Error('API context not ready');
      return contratosApi.updateCronogramaProgresso(context, phaseId, progress);
    },
    onSuccess: () => {
      refetchCronograma();
      toast.success('Progresso da fase atualizado!');
    }
  });

  const updateOSStatusMutation = useMutation({
    mutationFn: ({ osId, status }: { osId: string, status: OrdemServico['status'] }) => {
      const context = resolve();
      if (!context) throw new Error('API context not ready');
      return contratosApi.updateOsStatus(context, osId, status);
    },
    onSuccess: () => {
      refetchOS();
      toast.success('Status da O.S. atualizado!');
    }
  });

  const [isUploading, setIsUploading] = useState(false);
  const uploadArquivoMutation = useMutation({
    mutationFn: async (file: File) => {
      const context = resolve();
      if (!context || !id) throw new Error('API context not ready');
      setIsUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const publicUrl = await contratosApi.uploadArquivoStorage(context, file, fileName);
      
      let tipo: any = 'outro';
      if (file.type === 'application/pdf') tipo = 'contrato';
      else if (file.type.startsWith('image/')) tipo = 'foto_diario';

      await contratosApi.createContratoArquivo(context, {
        contrato_id: id,
        nome_arquivo: file.name,
        url_arquivo: publicUrl,
        tipo_documento: tipo,
      });
    },
    onSuccess: () => {
      refetchArquivos();
      setIsUploading(false);
      toast.success('Arquivo anexado com sucesso!');
    },
    onError: (err: any) => {
      setIsUploading(false);
      toast.error('Erro ao enviar arquivo', { description: err.message });
    }
  });

  if (isLoadingContrato) return <div className="p-8 text-slate-400">Carregando contrato...</div>;
  if (!contrato) return <div className="p-8 text-rose-400">Contrato não encontrado.</div>;

  const handleAddAditivo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAditivoTitle || newAditivoValue <= 0) return toast.error('Preencha os campos do aditivo');
    createAditivoMutation.mutate({
      contrato_id: contrato.id,
      titulo: newAditivoTitle,
      valor: newAditivoValue
    });
  };

  const handleAddPhase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhaseTitle || !newPhaseStart || !newPhaseEnd) return toast.error('Preencha os campos da fase');
    createCronogramaMutation.mutate({
      contrato_id: contrato.id,
      titulo: newPhaseTitle,
      data_inicio: newPhaseStart,
      data_fim: newPhaseEnd,
      percentual_conclusao: 0,
      precedente_id: newPhasePrecedente || null,
      valor_faturamento: newPhaseValorFaturamento
    });
  };

  const handleSimulatePhoto = () => {
    // Premium renovation images from Unsplash
    const options = [
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=400', // Pintura / Cimento
      'https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&q=80&w=400', // Estrutura metálica
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=400', // Drywall / Gesso
      'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=400', // Tijolos / Alvenaria
    ];
    const pick = options[Math.floor(Math.random() * options.length)];
    setUploadedPhotos([...uploadedPhotos, pick]);
    toast.success('Imagem da obra anexada com sucesso!');
  };

  const handleAddDiario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiarioTitle || !newDiarioRelatorio) return toast.error('Preencha os campos do diário');
    createDiarioMutation.mutate({
      contrato_id: contrato.id,
      titulo: newDiarioTitle,
      relatorio: newDiarioRelatorio,
      fotos: uploadedPhotos,
      clima: newDiarioClima,
      mao_de_obra_qtd: newDiarioMaoDeObra
    });
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header Executivo Obra */}
      <div className="border-b border-white/5 bg-slate-900/40 px-6 py-6 pt-8 backdrop-blur-md">
        <button 
          onClick={() => navigate('/app/contratos')}
          className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-teal-400 transition-colors"
        >
          <LucideArrowLeft className="h-4 w-4" />
          Voltar para Contratos
        </button>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md">MÓDULO REFORMAS</span>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                contrato.status === 'ativo' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
              }`}>
                {contrato.status}
              </span>
            </div>
            <h1 className="font-display text-2xl font-black tracking-tight text-white mb-2">
              {contrato.titulo}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5"><User className="h-4 w-4 text-slate-500" /> {contrato.cliente?.nome}</span>
              <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-slate-500" /> 
                Início: {contrato.data_inicio ? format(new Date(contrato.data_inicio), 'dd/MM/yyyy') : '-'}
              </span>
              <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-slate-500" /> 
                Previsão Fim: {contrato.previsao_fim ? format(new Date(contrato.previsao_fim), 'dd/MM/yyyy') : '-'}
              </span>
            </div>
          </div>

          <div className="text-left md:text-right bg-white/[0.02] border border-white/5 rounded-2xl p-4 min-w-[200px]">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Valor Contratado Total</div>
            <div className="text-xl font-black text-teal-400">{fmtBRL(valorContratadoTotal)}</div>
            {totalAditivos > 0 && (
              <div className="text-[10px] text-emerald-500 font-bold mt-1">Inclui R$ {totalAditivos.toLocaleString('pt-BR')} em Aditivos</div>
            )}
          </div>
        </div>

        {/* Custom Premium Tabs with Micro-indicator */}
        <div className="flex gap-2 mt-8 border-b border-white/5">
          {[
            { id: 'geral', label: 'Ordens de Serviço & Medição', icon: Hammer },
            { id: 'cronograma', label: 'Cronograma (Gantt)', icon: Calendar },
            { id: 'diario', label: 'Diário de Obra (RDO)', icon: ClipboardList },
            { id: 'financeiro', label: 'Financeiro & Pacing', icon: DollarSign },
            { id: 'documentos', label: 'Documentos & Anexos', icon: Paperclip }
          ].map(t => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all relative ${
                  active 
                    ? 'border-teal-400 text-teal-400 font-extrabold' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={14} className={active ? 'text-teal-400' : 'text-slate-500'} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Area de Conteúdo de Abas */}
      <div className="p-6 flex-1 overflow-y-auto">
        
        {/* TAB 1: GERAL & OS */}
        {activeTab === 'geral' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 overflow-hidden shadow-xl">
                <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] p-5">
                  <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Hammer className="h-5 w-5 text-teal-400" />
                    Cronograma de Execução Física (O.S.)
                  </h2>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsAnalisadorOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2 text-xs font-bold text-indigo-400 hover:bg-indigo-500/20 active:scale-[0.98] transition-all"
                    >
                      <Bot className="h-4 w-4" />
                      Analisar Contrato (NLP)
                    </button>
                    <button 
                      onClick={() => setIsOsModalOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20 px-3.5 py-2 text-xs font-bold text-teal-400 hover:bg-teal-500/20 active:scale-[0.98] transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      Nova O.S.
                    </button>
                  </div>
                </div>

                <div className="p-5">
                  {ordensServico.length === 0 ? (
                    <EmptyState title="Nenhuma O.S. vinculada a este contrato ainda." compact />
                  ) : (
                    <div className="grid gap-4">
                      {ordensServico.map(os => (
                        <div key={os.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.01] p-5 hover:border-white/10 transition-all hover:bg-white/[0.02]">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[9px] font-black text-slate-500 uppercase">OS-{os.id.substring(0, 5)}</span>
                              {os.valor_parceiro && os.valor_parceiro > 0 ? (
                                <Badge variant="green">Parceiro: {fmtBRL(os.valor_parceiro)}</Badge>
                              ) : (
                                <Badge variant="slate">Sem repasse</Badge>
                              )}
                            </div>
                            <h4 className="font-bold text-white text-sm">{os.titulo}</h4>
                            <p className="text-xs text-slate-400 mt-1">{os.descricao}</p>
                          </div>
                          
                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <select
                              value={os.status}
                              onChange={(e) => updateOSStatusMutation.mutate({ osId: os.id, status: e.target.value as any })}
                              className="bg-black/40 border border-white/5 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
                            >
                              <option value="agendada">Agendada</option>
                              <option value="em_andamento">Em Andamento</option>
                              <option value="concluida">Concluída</option>
                              <option value="cancelada">Cancelada</option>
                            </select>

                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                              os.status === 'concluida' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              os.status === 'em_andamento' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              'bg-slate-500/10 text-slate-400 border-slate-400/20'
                            }`}>
                              {os.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <Card className="p-5 bg-slate-900/40 border-white/10 shadow-lg">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Informações Gerais</h3>
                <div className="space-y-4 text-xs font-bold">
                  <div className="flex justify-between border-b border-white/5 pb-2.5">
                    <span className="text-slate-500 uppercase tracking-tight">Status do Contrato</span>
                    <span className="text-white capitalize">{contrato.status}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2.5">
                    <span className="text-slate-500 uppercase tracking-tight">Previsão Conclusão</span>
                    <span className="text-white">
                      {contrato.previsao_fim ? format(new Date(contrato.previsao_fim), 'dd/MM/yyyy') : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2.5">
                    <span className="text-slate-500 uppercase tracking-tight">Qtd Ordens Serviço</span>
                    <span className="text-teal-400">{ordensServico.length} OS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 uppercase tracking-tight">Total Diários Registrados</span>
                    <span className="text-indigo-400">{diarios.length} relatórios</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: CRONOGRAMA & GANTT */}
        {activeTab === 'cronograma' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 shadow-xl">
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 mb-6">
                  <Calendar className="h-5 w-5 text-teal-400" />
                  Visualizador Físico do Cronograma (Fases da Obra)
                </h2>

                {cronograma.length === 0 ? (
                  <EmptyState title="Nenhuma fase ou marco físico lançado no cronograma." compact />
                ) : (
                  <div className="space-y-5">
                    {cronograma.map(fase => (
                      <div key={fase.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-white uppercase tracking-tight">{fase.titulo}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-teal-400">{fase.percentual_conclusao}% concluído</span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={fase.percentual_conclusao}
                              onChange={(e) => updateCronogramaProgressMutation.mutate({ phaseId: fase.id, progress: Number(e.target.value) })}
                              className="w-24 accent-teal-400"
                            />
                          </div>
                        </div>

                        {/* Visual Gantt Bar */}
                        <div className="h-2.5 bg-black/40 rounded-full overflow-hidden relative">
                          <div 
                            className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 rounded-full transition-all duration-300"
                            style={{ width: `${fase.percentual_conclusao}%` }}
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 mt-2 border-t border-white/5 pt-2">
                          <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold">
                            <span>Início: {fase.data_inicio ? format(new Date(fase.data_inicio), 'dd/MM/yyyy') : '-'}</span>
                            <span>Fim: {fase.data_fim ? format(new Date(fase.data_fim), 'dd/MM/yyyy') : '-'}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {fase.valor_faturamento > 0 && (
                              <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1">
                                <DollarSign size={10} />
                                Faturamento: {fmtBRL(Number(fase.valor_faturamento))}
                              </span>
                            )}
                            {fase.percentual_conclusao === 100 && fase.valor_faturamento > 0 && (
                              <>
                                {faturamentos.find((f: any) => f.cronograma_id === fase.id) ? (
                                  <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md">
                                    <Check size={10} /> Faturado ✓
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => faturarMarcoMutation.mutate({
                                      cronogramaId: fase.id,
                                      valor: Number(fase.valor_faturamento),
                                      tituloFase: fase.titulo
                                    })}
                                    disabled={faturarMarcoMutation.isPending}
                                    className="flex items-center gap-1 rounded-md bg-gradient-to-r from-teal-500 to-indigo-600 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                  >
                                    {faturarMarcoMutation.isPending ? '...' : 'Faturar Marco'}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <Card className="p-5 bg-slate-900/40 border-white/10 shadow-lg">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Adicionar Nova Fase</h3>
                <form onSubmit={handleAddPhase} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome da Fase</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Demolição, Pintura, Reboco"
                      value={newPhaseTitle}
                      onChange={(e) => setNewPhaseTitle(e.target.value)}
                      className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Início</label>
                      <input 
                        type="date" 
                        value={newPhaseStart}
                        onChange={(e) => setNewPhaseStart(e.target.value)}
                        className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Previsão Fim</label>
                      <input 
                        type="date" 
                        value={newPhaseEnd}
                        onChange={(e) => setNewPhaseEnd(e.target.value)}
                        className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Precedente (Depende de)</label>
                    <select
                      value={newPhasePrecedente}
                      onChange={(e) => setNewPhasePrecedente(e.target.value)}
                      className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white appearance-none"
                    >
                      <option value="">Nenhuma fase anterior</option>
                      {cronograma.map(c => (
                        <option key={c.id} value={c.id}>{c.titulo}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <DollarSign size={12} className="text-slate-500" /> Valor do Faturamento (R$)
                    </label>
                    <input 
                      type="number" 
                      placeholder="Ex: 5000"
                      value={newPhaseValorFaturamento || ''}
                      onChange={(e) => setNewPhaseValorFaturamento(Number(e.target.value))}
                      className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
                    />
                  </div>
                  <Button type="submit" variant="primary" className="w-full">Lançar Fase</Button>
                </form>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 3: DIÁRIO DE OBRA */}
        {activeTab === 'diario' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-5">
                {diarios.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-10 text-center shadow-xl">
                    <EmptyState title="Nenhum Diário de Obra (RDO) lançado para este projeto." compact />
                  </div>
                ) : (
                  diarios.map(rdo => (
                    <div key={rdo.id} className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 shadow-lg space-y-4">
                      <div className="flex items-start justify-between border-b border-white/5 pb-3">
                        <div>
                          <span className="text-[9px] font-black text-slate-500 uppercase">Diário de Obra — {format(new Date(rdo.criado_em), 'dd/MM/yyyy HH:mm')}</span>
                          <h4 className="font-bold text-white text-sm mt-0.5">{rdo.titulo}</h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-bold uppercase">
                            <UserCheck size={12} /> {rdo.mao_de_obra_qtd || 0} operários
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold uppercase">
                            {rdo.clima === 'ensolarado' && <Sun size={12} />}
                            {rdo.clima === 'chuvoso' && <CloudRain size={12} />}
                            {rdo.clima === 'nublado' && <Cloud size={12} />}
                            Clima: {rdo.clima}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed font-medium whitespace-pre-line">{rdo.relatorio}</p>

                      {rdo.fotos && rdo.fotos.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                          {rdo.fotos.map((foto, fIdx) => (
                            <div key={fIdx} className="aspect-video rounded-xl bg-slate-950 overflow-hidden border border-white/5 shadow-md">
                              <img src={foto} alt={`Obra-${fIdx}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-6">
              <Card className="p-5 bg-slate-900/40 border-white/10 shadow-lg">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Adicionar Entrada (RDO)</h3>
                <form onSubmit={handleAddDiario} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resumo do Dia</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Conclusão do Reboco do Banheiro"
                      value={newDiarioTitle}
                      onChange={(e) => setNewDiarioTitle(e.target.value)}
                      className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Clima Observado</label>
                    <select
                      value={newDiarioClima}
                      onChange={(e) => setNewDiarioClima(e.target.value as any)}
                      className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
                    >
                      <option value="ensolarado">☀️ Ensolarado</option>
                      <option value="nublado">☁️ Nublado</option>
                      <option value="chuvoso">🌧️ Chuvoso</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mão de Obra Presente</label>
                    <input 
                      type="number" 
                      min="1"
                      value={newDiarioMaoDeObra}
                      onChange={(e) => setNewDiarioMaoDeObra(Number(e.target.value))}
                      className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Relatório Técnico / Ocorrências</label>
                    <textarea 
                      rows={4}
                      placeholder="Descreva o que foi realizado, entregas recebidas e ocorrências..."
                      value={newDiarioRelatorio}
                      onChange={(e) => setNewDiarioRelatorio(e.target.value)}
                      className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Registros Fotográficos</label>
                    <div className="flex flex-wrap gap-2">
                      {uploadedPhotos.map((p, pIdx) => (
                        <div key={pIdx} className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 bg-slate-950">
                          <img src={p} alt="upload" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleSimulatePhoto}
                        className="w-12 h-12 rounded-lg border-2 border-dashed border-white/10 hover:border-teal-500/30 text-slate-600 hover:text-teal-400 flex items-center justify-center transition-all bg-white/[0.01]"
                        title="Simular tirar foto da obra"
                      >
                        <Camera size={18} />
                      </button>
                    </div>
                  </div>

                  <Button type="submit" variant="primary" className="w-full">Registrar Diário</Button>
                </form>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 4: FINANCEIRO & ADITIVOS */}
        {activeTab === 'financeiro' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
            <div className="lg:col-span-2 space-y-6">
              
              {/* Executive Physical-Financial Dashboard */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 shadow-xl space-y-6">
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3.5">
                  <BarChart3 className="h-5 w-5 text-teal-400" />
                  Painel Físico-Financeiro Executivo
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight block">Valor Inicial</span>
                    <span className="text-base font-extrabold text-white">{fmtBRL(contrato.valor_total)}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight block">Receita Total</span>
                    <span className="text-base font-extrabold text-white">{fmtBRL(valorContratadoTotal)}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight block">Custos Totais</span>
                    <span className="text-base font-extrabold text-rose-400">{fmtBRL(totalCustosReal)}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <span className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-tight block">Margem Estimada</span>
                    <span className="text-base font-black text-emerald-400">{fmtBRL(margemRealEst)}</span>
                  </div>
                </div>

                {/* Progress costs pacing */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-400 uppercase">Pacing de Custo sobre Receita</span>
                    <span className={`${pacingPercentual > 75 ? 'text-rose-400' : 'text-teal-400'}`}>{pacingPercentual.toFixed(1)}% consumido</span>
                  </div>
                  <div className="h-3 bg-black/40 rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        pacingPercentual > 75 ? 'bg-gradient-to-r from-rose-500 to-red-600' : 'bg-gradient-to-r from-teal-500 to-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, pacingPercentual)}%` }}
                    />
                  </div>
                  {pacingPercentual > 75 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-rose-400 font-bold uppercase mt-1">
                      <AlertTriangle size={12} /> Alerta: Custos físicos excederam 75% da receita orçada!
                    </div>
                  )}
                </div>
              </div>

              {/* List of Appropriated Costs */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 shadow-xl space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-2">
                  <ClipboardList className="h-4.5 w-4.5 text-slate-500" />
                  Custos e Insumos Apropriados a esta Obra
                </h3>

                {despesasApropriadas.length === 0 && totalMaoDeObraTerceiros === 0 ? (
                  <EmptyState title="Nenhuma despesa ou repasse carimbado nesta obra." compact />
                ) : (
                  <div className="space-y-3">
                    {/* Material Purchases */}
                    {despesasApropriadas.map(c => (
                      <div key={c.id} className="flex justify-between items-center p-3 rounded-xl border border-white/5 bg-white/[0.01] text-xs">
                        <div>
                          <span className="text-[9px] font-black text-rose-400 uppercase tracking-wider">COMPRA INSUMOS</span>
                          <div className="font-bold text-white mt-0.5">{c.fornecedor_nome}</div>
                          <div className="text-[10px] text-slate-500 font-semibold mt-1">Ref: #{c.id} • {format(new Date(c.criado_em), 'dd/MM/yyyy')}</div>
                        </div>
                        <span className="font-black text-rose-400">{fmtBRL(c.total)}</span>
                      </div>
                    ))}

                    {/* Subcontractor repasses */}
                    {ordensServico.filter(os => os.status === 'concluida' && os.valor_parceiro && os.valor_parceiro > 0).map(os => (
                      <div key={os.id} className="flex justify-between items-center p-3 rounded-xl border border-white/5 bg-white/[0.01] text-xs">
                        <div>
                          <span className={`text-[9px] font-black uppercase tracking-wider ${os.is_garantia ? 'text-rose-400' : 'text-indigo-400'}`}>
                            {os.is_garantia ? 'MÃO DE OBRA (ASSISTÊNCIA / GARANTIA)' : 'MÃO DE OBRA TERCEIRIZADA'}
                          </span>
                          <div className="font-bold text-white mt-0.5">Repasse: OS-{os.titulo}</div>
                          <div className="text-[10px] text-slate-500 font-semibold mt-1">
                            {os.is_garantia ? 'OS de Garantia pós-obra concluída' : 'OS concluída • Medição aprovada'}
                          </div>
                        </div>
                        <span className="font-black text-rose-400">{fmtBRL(os.valor_parceiro || 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar aditivos form */}
            <div className="space-y-6">
              <Card className="p-5 bg-slate-900/40 border-white/10 shadow-lg">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Lançar Termo Aditivo</h3>
                <form onSubmit={handleAddAditivo} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição da Alteração</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Instalação de Revestimento 3D Adicional"
                      value={newAditivoTitle}
                      onChange={(e) => setNewAditivoTitle(e.target.value)}
                      className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor do Aditivo (R$)</label>
                    <input 
                      type="number" 
                      placeholder="2500"
                      value={newAditivoValue}
                      onChange={(e) => setNewAditivoValue(Number(e.target.value))}
                      className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
                    />
                  </div>
                  <Button type="submit" variant="primary" className="w-full">Lançar Aditivo</Button>
                </form>
              </Card>

              {/* List of active aditivos */}
              <Card className="p-5 bg-slate-900/40 border-white/10 shadow-lg">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Histórico de Aditivos</h3>
                {aditivos.length === 0 ? (
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider py-4 text-center">Nenhum termo aditivo lançado.</div>
                ) : (
                  <div className="space-y-2">
                    {aditivos.map(a => (
                      <div key={a.id} className="flex justify-between items-center text-xs p-2 rounded bg-black/20 border border-white/5">
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="font-bold text-slate-300 truncate">{a.titulo}</div>
                          <div className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{format(new Date(a.criado_em), 'dd/MM/yyyy')}</div>
                        </div>
                        <span className="font-extrabold text-emerald-400">+{fmtBRL(Number(a.valor))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* TAB 5: DOCUMENTOS E ANEXOS */}
        {activeTab === 'documentos' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Paperclip className="h-5 w-5 text-teal-400" />
                    Arquivos da Obra
                  </h2>
                  <Badge variant="teal">{arquivos.length} arquivos anexados</Badge>
                </div>

                {arquivos.length === 0 ? (
                  <EmptyState title="Nenhum arquivo anexado a esta obra." compact />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {arquivos.map((arq) => (
                      <div key={arq.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors group">
                        <div className="w-12 h-12 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
                          {arq.tipo_documento === 'contrato' || arq.nome_arquivo.endsWith('.pdf') ? (
                            <FileText size={20} />
                          ) : (
                            <Camera size={20} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate" title={arq.nome_arquivo}>{arq.nome_arquivo}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                            Enviado em {format(new Date(arq.criado_em), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <a 
                          href={arq.url_arquivo} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex-shrink-0"
                        >
                          <Download size={16} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <Card className="p-5 bg-slate-900/40 border-white/10 shadow-lg">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Adicionar Novo Arquivo</h3>
                
                <div className="relative border-2 border-dashed border-white/10 rounded-2xl p-8 hover:border-teal-500/50 hover:bg-teal-500/5 transition-all text-center flex flex-col items-center justify-center min-h-[200px] overflow-hidden group">
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 text-teal-400 animate-spin" />
                      <p className="text-xs font-bold text-teal-400 animate-pulse">Enviando arquivo...</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400 mb-4 group-hover:text-teal-400 group-hover:scale-110 transition-all">
                        <UploadCloud size={28} />
                      </div>
                      <p className="text-xs font-bold text-white mb-1">Clique ou arraste um arquivo</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">PDF, Imagens (Máx 10MB)</p>
                      
                      <input 
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            uploadArquivoMutation.mutate(file);
                          }
                        }}
                      />
                    </>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

      </div>

      <OrdemServicoModal
        isOpen={isOsModalOpen}
        onClose={() => setIsOsModalOpen(false)}
        contratoId={id!}
        onSuccess={() => refetchOS()}
      />

      <AnalisadorContratoModal
        isOpen={isAnalisadorOpen}
        onClose={() => setIsAnalisadorOpen(false)}
      />
    </div>
  );
}
