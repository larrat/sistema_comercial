import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, FileText, CheckCircle, Clock, AlertTriangle, ArrowRight, Printer, Link as LinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Card, EmptyState, Badge } from '../../../shared/ui';
import { fmtBRL } from '../../../shared/lib/formatters';
import { useFilialStore } from '../../../app/useFilialStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { orcamentosApi, type OrcamentoObra } from '../services/orcamentosApi';
import { OrcamentoForm } from '../components/OrcamentoForm';

export function OrcamentosRoutePage() {
  const filialId = useFilialStore((s) => s.filialId);
  const session = useAuthStore((s) => s.session);
  const navigate = useNavigate();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOrcamento, setSelectedOrcamento] = useState<OrcamentoObra | undefined>();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: orcamentos = [], isLoading, refetch } = useQuery({
    queryKey: ['orcamentos-list', filialId],
    queryFn: () => {
      if (!session?.access_token || !filialId) throw new Error('Auth not ready');
      return orcamentosApi.listOrcamentos(session.access_token, filialId);
    },
    enabled: !!filialId && !!session?.access_token
  });

  const saveMutation = useMutation({
    mutationFn: async (params: { cabecalho: Partial<OrcamentoObra>, itens: any[] }) => {
      if (!session?.access_token || !filialId) throw new Error('Auth required');
      return orcamentosApi.saveOrcamento(session.access_token, filialId, params.cabecalho, params.itens);
    },
    onSuccess: () => {
      refetch();
      setIsFormOpen(false);
      setSelectedOrcamento(undefined);
      toast.success('Orçamento salvo com sucesso!');
    },
    onError: (err: any) => {
      toast.error('Erro ao salvar orçamento', { description: err.message });
    }
  });

  const filtered = orcamentos.filter(o => 
    o.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (o.cliente_nome || o.cliente?.nome || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = async (id: string) => {
    try {
      const full = await orcamentosApi.getOrcamento(session!.access_token, id);
      setSelectedOrcamento(full);
      setIsFormOpen(true);
    } catch (err: any) {
      toast.error('Falha ao carregar os itens do orçamento', { description: err.message });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'rascunho': return <Badge variant="slate" className="gap-1.5"><Clock size={10} />Rascunho</Badge>;
      case 'enviado': return <Badge variant="yellow" className="gap-1.5"><ArrowRight size={10} />Enviado ao Cliente</Badge>;
      case 'aprovado': return <Badge variant="green" className="gap-1.5"><CheckCircle size={10} />Aprovado (Contrato)</Badge>;
      case 'rejeitado': return <Badge variant="red" className="gap-1.5"><AlertTriangle size={10} />Declinado</Badge>;
      default: return <Badge variant="slate">{status}</Badge>;
    }
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Orçamentos & Propostas</h1>
          <p className="text-slate-400 text-sm mt-1">Gere propostas precisas com a Planilha Mestra e cálculo de BDI automático.</p>
        </div>
        <Button 
          variant="primary" 
          leftIcon={<Plus size={18} />} 
          onClick={() => { setSelectedOrcamento(undefined); setIsFormOpen(true); }}
        >
          Novo Orçamento
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input 
          type="text" 
          placeholder="Buscar por cliente ou título da obra..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900/50 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all shadow-inner"
        />
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-500 font-black uppercase tracking-widest animate-pulse">Carregando propostas...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center bg-slate-900/30 border-white/5">
          <EmptyState 
            icon={<FileText size={48} className="text-slate-600 mb-4" />}
            title="Nenhum orçamento encontrado"
            description="Você ainda não criou nenhuma planilha mestra de precificação."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(orc => (
            <Card 
              key={orc.id} 
              className="p-5 flex flex-col justify-between hover:border-teal-500/30 transition-all duration-300 group cursor-pointer bg-slate-900/40 border-white/5 hover:bg-slate-900/60"
              onClick={() => handleEdit(orc.id)}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    ORC-{orc.id.substring(0, 5)}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(orc.status)}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/app/orcamentos/${orc.id}/imprimir`, '_blank');
                      }}
                      className="p-1.5 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      title="Gerar PDF"
                    >
                      <Printer size={14} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = `${window.location.origin}/portal/proposta/${orc.id}`;
                        navigator.clipboard.writeText(url);
                        toast.success('Link da Proposta Digital copiado!');
                      }}
                      className="p-1.5 bg-teal-500/10 text-teal-400 hover:text-white hover:bg-teal-500/30 border border-teal-500/20 rounded-lg transition-colors"
                      title="Copiar Link de Aceite Digital"
                    >
                      <LinkIcon size={14} />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-1 leading-tight group-hover:text-teal-400 transition-colors">{orc.titulo}</h3>
                <p className="text-xs text-slate-400 font-medium">{orc.cliente_nome || orc.cliente?.nome || 'Sem cliente'}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Custo Direto (Obra)</div>
                  <div className="text-sm font-bold text-amber-400">{fmtBRL(orc.calculos?.custo_direto_total || 0)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Venda (BDI {orc.bdi_percentual}%)</div>
                  <div className="text-base font-black text-emerald-400">{fmtBRL(orc.calculos?.preco_venda_final || 0)}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {isFormOpen && (
        <OrcamentoForm 
          filialId={filialId!}
          initialData={selectedOrcamento}
          onClose={() => { setIsFormOpen(false); setSelectedOrcamento(undefined); }}
          onSave={(cabecalho, itens) => saveMutation.mutate({ cabecalho, itens })}
        />
      )}
    </div>
  );
}
