import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, ViewTransition, startTransition, addTransitionType } from 'react';
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
import { PagamentoEquipeModal } from './PagamentoEquipeModal';
import { ContratoAbaGeral } from './tabs/ContratoAbaGeral';
import { ContratoAbaCronograma } from './tabs/ContratoAbaCronograma';
import { ContratoAbaDiario } from './tabs/ContratoAbaDiario';
import { ContratoAbaFinanceiro } from './tabs/ContratoAbaFinanceiro';
import { ContratoAbaDocumentos } from './tabs/ContratoAbaDocumentos';
import { useFilialStore } from '../../../app/useFilialStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { contratosApi } from '../services/contratosApi';
import { listPedidosCompra } from '../../compras/services/comprasApi';
import { fmtBRL } from '../../../shared/lib/formatters';
import { Badge, Button, Card, EmptyState } from '../../../shared/ui';
import type { ContratoAditivoDraft, ContratoCronogramaDraft, DiarioObraDraft, OrdemServico } from '../types';
import { RdoWhatsAppModal } from './RdoWhatsAppModal';
import { buildRdoWhatsAppMessage } from '../utils/rdoWhatsAppHelper';

export function ContratoProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const filialId = useFilialStore((s) => s.filialId);
  const session = useAuthStore((s) => s.session);
  const { resolve } = useApiContext();

  const [activeTab, setActiveTab] = useState<'geral' | 'cronograma' | 'diario' | 'financeiro' | 'documentos'>('geral');
  const [isOsModalOpen, setIsOsModalOpen] = useState(false);
  const [isAnalisadorOpen, setIsAnalisadorOpen] = useState(false);
  const [pagamentoOsSelected, setPagamentoOsSelected] = useState<{ id: string, titulo: string, valor: number } | null>(null);

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

  // WhatsApp Bulletin Modal State
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');

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

  // 6. Fetch Rentabilidade from View
  const { data: rentabilidade } = useQuery({
    queryKey: ['contrato-rentabilidade', id],
    queryFn: () => {
      const context = resolve();
      if (!context || !id) throw new Error('API context not ready');
      return contratosApi.getContratoRentabilidade(context, id);
    },
    enabled: !!id
  });

  // 6.5 Fetch Purchases to list on the table (macro level for now)
  const { data: compras = [] } = useQuery({
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

  const totalInsumos = rentabilidade?.custo_material || 0;

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

  const progressoCronograma = useMemo(() => {
    if (!cronograma.length) return 0;
    const soma = cronograma.reduce((acc, item) => acc + (item.percentual_conclusao || 0), 0);
    return Math.min(100, Math.round(soma / cronograma.length));
  }, [cronograma]);

  function handleOpenRdoWhatsAppModal(rdo: any) {
    if (!contrato || !id) return;
    const msg = buildRdoWhatsAppMessage({
      clienteNome: contrato.cliente?.nome,
      clienteTelefone: (contrato.cliente as any)?.whatsapp || (contrato.cliente as any)?.tel,
      obraTitulo: contrato.titulo,
      obraId: id,
      rdoTitulo: rdo.titulo,
      rdoRelatorio: rdo.relatorio,
      clima: rdo.clima,
      maoDeObraQtd: rdo.mao_de_obra_qtd,
      progressoTotal: progressoCronograma,
      dataRegistro: rdo.criado_em || rdo.data_registro
    });
    setWhatsAppMessage(msg);
    setIsWhatsAppModalOpen(true);
  }

  const createDiarioMutation = useMutation({
    mutationFn: (draft: DiarioObraDraft) => {
      const context = resolve();
      if (!context) throw new Error('API context not ready');
      return contratosApi.createDiarioObra(context, draft);
    },
    onSuccess: (newDiario) => {
      refetchDiarios();
      handleOpenRdoWhatsAppModal(newDiario);
      setNewDiarioTitle('');
      setNewDiarioRelatorio('');
      setUploadedPhotos([]);
      toast.success('Relatório Diário de Obra (RDO) registrado!');
    }
  });

  const uploadRdoFotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const context = resolve();
      if (!context || !id) throw new Error('API context not ready');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}/rdo_${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      return contratosApi.uploadArquivoStorage(context, file, fileName);
    },
    onSuccess: (url) => {
      setUploadedPhotos(prev => [...prev, url]);
      toast.success('Foto anexada!');
    },
    onError: (err: any) => {
      toast.error('Erro ao subir foto', { description: err.message });
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

  const handleAddDiario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiarioTitle || !newDiarioRelatorio) return;
    createDiarioMutation.mutate({
      contrato_id: id!,
      titulo: newDiarioTitle,
      relatorio: newDiarioRelatorio,
      clima: newDiarioClima,
      mao_de_obra_qtd: newDiarioMaoDeObra,
      fotos: uploadedPhotos
    });
  };

  return (
    <ViewTransition 
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      default="none"
    >
      <div className="flex h-full flex-col overflow-y-auto">
      {/* Header Executivo Obra */}
      <div className="border-b border-white/5 bg-slate-900/40 px-6 py-6 pt-8 backdrop-blur-md">
        <button 
          onClick={() => {
            startTransition(() => {
              if (typeof addTransitionType === 'function') addTransitionType('nav-back');
              navigate('/app/contratos');
            });
          }}
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
            <ViewTransition name={`contrato-hero-${contrato.id}`} share="morph">
              <h1 className="font-display text-2xl font-black tracking-tight text-white mb-2 inline-block">
                {contrato.titulo}
              </h1>
            </ViewTransition>
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

          <div className="flex flex-col items-end gap-3 text-left md:text-right bg-white/[0.02] border border-white/5 rounded-2xl p-4 min-w-[200px]">
            <div className="w-full text-left md:text-right">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Valor Contratado Total</div>
              <div className="text-xl font-black text-teal-400">{fmtBRL(valorContratadoTotal)}</div>
              {totalAditivos > 0 && (
                <div className="text-[10px] text-emerald-500 font-bold mt-1">Inclui R$ {totalAditivos.toLocaleString('pt-BR')} em Aditivos</div>
              )}
            </div>
            <button 
              onClick={() => {
                const url = `${window.location.origin}/portal/obra/${contrato.id}`;
                navigator.clipboard.writeText(url);
                toast.success('Link do Portal do Cliente copiado!');
              }}
              className="mt-2 flex items-center gap-2 rounded-xl bg-teal-500/10 border border-teal-500/20 px-4 py-2 text-xs font-bold text-teal-400 hover:bg-teal-500/20 active:scale-[0.98] transition-all"
            >
              Copiar Link do Portal Público
            </button>
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
          <ContratoAbaGeral 
            contrato={contrato}
            ordensServico={ordensServico}
            diarios={diarios}
            setIsAnalisadorOpen={setIsAnalisadorOpen}
            setIsOsModalOpen={setIsOsModalOpen}
            setPagamentoOsSelected={setPagamentoOsSelected}
            updateOSStatusMutation={updateOSStatusMutation}
          />
        )}

        {/* TAB 2: CRONOGRAMA & GANTT */}
        {activeTab === 'cronograma' && (
          <ContratoAbaCronograma 
            cronograma={cronograma}
            faturamentos={faturamentos}
            newPhaseTitle={newPhaseTitle}
            setNewPhaseTitle={setNewPhaseTitle}
            newPhaseStart={newPhaseStart}
            setNewPhaseStart={setNewPhaseStart}
            newPhaseEnd={newPhaseEnd}
            setNewPhaseEnd={setNewPhaseEnd}
            newPhasePrecedente={newPhasePrecedente}
            setNewPhasePrecedente={setNewPhasePrecedente}
            newPhaseValorFaturamento={newPhaseValorFaturamento}
            setNewPhaseValorFaturamento={setNewPhaseValorFaturamento}
            handleAddPhase={handleAddPhase}
            updateCronogramaProgressMutation={updateCronogramaProgressMutation}
            faturarMarcoMutation={faturarMarcoMutation}
          />
        )}

        {/* TAB 3: DIÁRIO DE OBRA */}
        {activeTab === 'diario' && (
          <ContratoAbaDiario 
            diarios={diarios}
            newDiarioTitle={newDiarioTitle}
            setNewDiarioTitle={setNewDiarioTitle}
            newDiarioClima={newDiarioClima}
            setNewDiarioClima={setNewDiarioClima}
            newDiarioMaoDeObra={newDiarioMaoDeObra}
            setNewDiarioMaoDeObra={setNewDiarioMaoDeObra}
            newDiarioRelatorio={newDiarioRelatorio}
            setNewDiarioRelatorio={setNewDiarioRelatorio}
            uploadedPhotos={uploadedPhotos}
            handleAddDiario={handleAddDiario}
            uploadRdoFotoMutation={uploadRdoFotoMutation}
            createDiarioMutation={createDiarioMutation}
            onOpenWhatsAppModal={handleOpenRdoWhatsAppModal}
          />
        )}

        {/* TAB 4: FINANCEIRO & ADITIVOS */}
        {activeTab === 'financeiro' && (
          <ContratoAbaFinanceiro 
            contrato={contrato}
            valorContratadoTotal={valorContratadoTotal}
            totalCustosReal={totalCustosReal}
            margemRealEst={margemRealEst}
            pacingPercentual={pacingPercentual}
            despesasApropriadas={despesasApropriadas}
            totalMaoDeObraTerceiros={totalMaoDeObraTerceiros}
            ordensServico={ordensServico}
            newAditivoTitle={newAditivoTitle}
            setNewAditivoTitle={setNewAditivoTitle}
            newAditivoValue={newAditivoValue}
            setNewAditivoValue={setNewAditivoValue}
            handleAddAditivo={handleAddAditivo}
            aditivos={aditivos}
          />
        )}

        {/* TAB 5: DOCUMENTOS E ANEXOS */}
        {activeTab === 'documentos' && (
          <ContratoAbaDocumentos 
            arquivos={arquivos}
            isUploading={isUploading}
            uploadArquivoMutation={uploadArquivoMutation}
          />
        )}

      </div>

      <RdoWhatsAppModal
        open={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        clienteNome={contrato?.cliente?.nome}
        clienteTelefone={(contrato?.cliente as any)?.whatsapp || (contrato?.cliente as any)?.tel}
        defaultMessage={whatsAppMessage}
      />

      {isOsModalOpen && (
        <OrdemServicoModal
          contratoId={id!}
          onClose={() => {
            setIsOsModalOpen(false);
            refetchOS();
          }}
        />
      )}

      <AnalisadorContratoModal
        isOpen={isAnalisadorOpen}
        onClose={() => setIsAnalisadorOpen(false)}
        contratoId={id!}
      />

      {pagamentoOsSelected && (
        <PagamentoEquipeModal 
          osId={pagamentoOsSelected.id}
          osTitulo={pagamentoOsSelected.titulo}
          valorParceiro={pagamentoOsSelected.valor}
          onClose={() => setPagamentoOsSelected(null)}
        />
      )}
    </div>
    </ViewTransition>
  );
}
