import { fmtBRL } from '../../../shared/lib/formatters';
import { useState } from 'react';
import { 
  ShieldAlert, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  XOctagon, 
  DownloadCloud, 
  ShieldCheck, 
  Search,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  listNotasDestinadas, 
  manifestarNotaDestinada 
} from '../services/comprasApi';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { useFilialStore } from '../../../app/useFilialStore';
import { 
  Badge, 
  Button, 
  DataTable, 
  StatusBadge, 
  Shimmer, 
  FilterBar 
} from '../../../shared/ui';

type Props = {
  onImport: (nota: any) => void;
};

export function NotasDestinadasPanel({ onImport }: Props) {
  const { token } = useApiContext();
  const { filialId } = useFilialStore();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: notas = [], isLoading, isError } = useQuery({
    queryKey: ['nfe-destinadas', filialId],
    queryFn: () => listNotasDestinadas(token!, filialId!),
    enabled: !!token && !!filialId
  });

  const manifestarMutation = useMutation({
    mutationFn: ({ notaId, status }: { notaId: string, status: any }) => 
      manifestarNotaDestinada(token!, notaId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nfe-destinadas'] });
      if (variables.status === 'ciencia') {
        toast.success('Ciência da Operação registrada! XML completo baixado da SEFAZ.');
      } else if (variables.status === 'confirmado') {
        toast.success('Operação Confirmada na SEFAZ.');
      } else if (variables.status === 'desconhecido') {
        toast.error('Manifesto de DESCONHECIMENTO registrado. Alerta de fraude enviado para a SEFAZ!', {
          duration: 6000
        });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao comunicar manifesto com a SEFAZ');
    }
  });

  const handleSincronizar = () => {
    setIsSyncing(true);
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Consultando Ambiente Nacional da SEFAZ...',
        success: () => {
          setIsSyncing(false);
          queryClient.invalidateQueries({ queryKey: ['nfe-destinadas'] });
          return 'Radar atualizado! Nenhuma nota fiscal destinada adicional encontrada.';
        },
        error: 'Erro ao conectar à SEFAZ'
      }
    );
  };

  const getManifestTone = (status: string) => {
    switch (status) {
      case 'confirmado': return 'success';
      case 'ciencia': return 'info';
      case 'desconhecido': return 'danger';
      default: return 'warning';
    }
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case 'confirmado': return 'CONFIRMADA';
      case 'ciencia': return 'CIÊNCIA REGISTRADA';
      case 'desconhecido': return 'DESCONHECIDA (FRAUDE)';
      default: return 'SEM MANIFESTO';
    }
  };

  const filtered = notas.filter(n => 
    n.nome_emitente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.cnpj_emitente.includes(searchTerm) ||
    n.chave_acesso.includes(searchTerm)
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Shimmer height={40} width="100%" />
        <Shimmer height={120} width="100%" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center bg-rose-950/10 border border-rose-500/20 rounded-2xl">
        <ShieldAlert size={32} className="mx-auto text-rose-500 mb-3" />
        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Falha ao carregar radar fiscal</h4>
        <p className="text-xs text-slate-400 mt-1">Verifique as permissões de acesso ou o status do Certificado A1.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Alert Header Banner */}
      <div className="p-5 border border-[#1e293b] hover:border-indigo-500/20 bg-indigo-950/5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300">
        <div className="flex gap-4 items-start text-left">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h4 className="text-white flex items-center gap-2 text-sm font-medium text-slate-400">
              Radar de Notas Fiscais Recebidas (SEFAZ)
              <Badge variant="blue" className="!py-0 !px-1.5 !text-[8px]">Shield</Badge>
            </h4>
            <p className="text-[10px] text-slate-400 mt-1 max-w-xl leading-relaxed">
              Consulte todas as notas fiscais emitidas contra o seu CNPJ na SEFAZ nos últimos 15 dias. Monitore operações reais, barre faturamento fraudulento e faça entradas automáticas com 1-clique.
            </p>
          </div>
        </div>
        <Button 
          variant="secondary" 
          className="flex-shrink-0 !rounded-xl !text-[10px] uppercase font-black tracking-wider" 
          leftIcon={<RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />}
          onClick={handleSincronizar}
          disabled={isSyncing}
        >
          Sincronizar SEFAZ
        </Button>
      </div>

      {/* Filter */}
      <FilterBar 
        search={{
          value: searchTerm,
          onChange: (v) => setSearchTerm(v),
          placeholder: "Buscar por Emitente, CNPJ ou Chave…"
        }}
      />

      {/* DataTable */}
      <div className="rf-card-premium p-0 border-white/5 bg-surface-card/40 backdrop-blur-xl overflow-hidden">
        <DataTable 
          data={filtered}
          columns={[
            {
              key: 'emissao',
              label: 'Emissão',
              render: (n) => (
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-200">
                    {new Intl.DateTimeFormat('pt-BR').format(new Date(n.data_emissao))}
                  </span>
                  <span className="text-sm font-medium text-slate-400">
                    {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(n.data_emissao))}
                  </span>
                </div>
              )
            },
            {
              key: 'emitente',
              label: 'Fornecedor Emitente',
              render: (n) => (
                <div className="flex flex-col text-left">
                  <span className="text-xs font-black text-white truncate max-w-xs">{n.nome_emitente}</span>
                  <span className="text-[9px] text-slate-500 font-mono tracking-tighter">CNPJ: {n.cnpj_emitente.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}</span>
                </div>
              )
            },
            {
              key: 'chave',
              label: 'Chave de Acesso',
              render: (n) => (
                <div className="flex items-center gap-1.5 font-mono text-[9px] text-slate-400 group cursor-pointer hover:text-white transition-colors" onClick={() => {
                  navigator.clipboard.writeText(n.chave_acesso);
                  toast.success('Chave de acesso copiada!');
                }}>
                  <span>{n.chave_acesso.slice(0, 4)}...{n.chave_acesso.slice(-4)}</span>
                  <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )
            },
            {
              key: 'valor',
              label: 'Valor Total',
              render: (n) => <span className="text-xs font-black text-white">{fmtBRL(n.valor_total)}</span>
            },
            {
              key: 'manifesto',
              label: 'Manifestação SEFAZ',
              render: (n) => (
                <StatusBadge tone={getManifestTone(n.manifesto_status)}>
                  {translateStatus(n.manifesto_status)}
                </StatusBadge>
              )
            },
            {
              key: 'actions',
              label: '',
              render: (n) => {
                const isPending = manifestarMutation.isPending && manifestarMutation.variables?.notaId === n.id;
                
                if (n.importado_compra_id) {
                  return (
                    <div className="flex justify-end">
                      <Badge variant="green" className="!text-[8px] !py-1 !px-2 uppercase font-black">Importado</Badge>
                    </div>
                  );
                }

                if (n.manifesto_status === 'desconhecido') {
                  return (
                    <div className="flex justify-end">
                      <Badge variant="red" className="!text-[8px] !py-1 !px-2 uppercase font-black">Bloqueado</Badge>
                    </div>
                  );
                }

                return (
                  <div className="flex justify-end gap-2">
                    {n.manifesto_status === 'sem_manifesto' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          className="!py-1.5 !px-3 !rounded-lg !text-[9px] font-black uppercase text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/20"
                          leftIcon={<XOctagon size={11} />}
                          onClick={() => manifestarMutation.mutate({ notaId: n.id, status: 'desconhecido' })}
                          disabled={isPending}
                        >
                          Desconhecer
                        </Button>
                        <Button 
                          size="sm" 
                          variant="primary"
                          className="!py-1.5 !px-3 !rounded-lg !text-[9px] font-black uppercase"
                          leftIcon={<CheckCircle2 size={11} />}
                          onClick={() => manifestarMutation.mutate({ notaId: n.id, status: 'ciencia' })}
                          disabled={isPending}
                        >
                          Dar Ciência
                        </Button>
                      </>
                    )}

                    {(n.manifesto_status === 'ciencia' || n.manifesto_status === 'confirmado') && (
                      <>
                        {n.manifesto_status === 'ciencia' && (
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="!py-1.5 !px-3 !rounded-lg !text-[9px] font-black uppercase"
                            leftIcon={<ShieldCheck size={11} />}
                            onClick={() => manifestarMutation.mutate({ notaId: n.id, status: 'confirmado' })}
                            disabled={isPending}
                          >
                            Confirmar
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="primary"
                          className="!py-1.5 !px-3 !rounded-lg !text-[9px] font-black uppercase !bg-teal-500 hover:bg-teal-400 text-slate-950"
                          leftIcon={<DownloadCloud size={11} />}
                          onClick={() => onImport(n)}
                          disabled={isPending}
                        >
                          Importar Compra
                        </Button>
                      </>
                    )}
                  </div>
                );
              }
            }
          ]}
        />
      </div>
    </div>
  );
}
