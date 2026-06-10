import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, LoadingState, ErrorState } from '../../../shared/ui';
import { Briefcase, MapPin, Plus, FileText, ShoppingCart, PencilRuler, ArrowLeft, LayoutTemplate, User, Search, X } from 'lucide-react';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { getProjeto, saveProjeto, getProjetoLevantamentos, getProjetoPedidos, getProjetoOrcamentos } from '../services/projetosApi';
import { listClientes } from '../../clientes/services/clientesApi';
import { format } from 'date-fns';
import type { Projeto, Cliente } from '../../../../types/domain';
import { toast } from 'sonner';

export function ProjetoProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { resolve } = useApiContext();
  const context = resolve();

  const isEdit = id && id !== 'novo';

  const { data: projetoOrig, isLoading: isLoadingProjeto, isError } = useQuery({
    queryKey: ['projeto', id],
    queryFn: () => getProjeto(context, id as string),
    enabled: !!isEdit
  });

  const { data: levantamentos, isLoading: isLoadingLev } = useQuery({
    queryKey: ['projeto_levantamentos', id],
    queryFn: () => getProjetoLevantamentos(context, id as string),
    enabled: !!isEdit
  });

  const { data: pedidos, isLoading: isLoadingPed } = useQuery({
    queryKey: ['projeto_pedidos', id],
    queryFn: () => getProjetoPedidos(context, id as string),
    enabled: !!isEdit
  });

  const { data: orcamentos, isLoading: isLoadingOrc } = useQuery({
    queryKey: ['projeto_orcamentos', id],
    queryFn: () => getProjetoOrcamentos(context, id as string),
    enabled: !!isEdit
  });

  const [form, setForm] = useState<Partial<Projeto>>({
    nome: '',
    status: 'em_andamento',
    endereco: { logradouro: '', numero: '', cidade: '' }
  });

  // Cliente search
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: clientes } = useQuery({
    queryKey: ['clientes_search', clienteSearch],
    queryFn: () => listClientes(context!),
    enabled: !!context && clienteDropdownOpen,
    staleTime: 30_000
  });

  const clientesFiltrados = clienteSearch
    ? (clientes || []).filter(c => c.nome.toLowerCase().includes(clienteSearch.toLowerCase()))
    : (clientes || []).slice(0, 8);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setClienteDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (projetoOrig) {
      setForm(projetoOrig);
    }
  }, [projetoOrig]);

  // Sync clienteSelecionado when projetoOrig loads with a cliente_id
  const { data: clienteOriginal } = useQuery({
    queryKey: ['cliente_by_id', projetoOrig?.cliente_id],
    queryFn: () => listClientes(context!).then(cs => cs.find(c => c.id === projetoOrig!.cliente_id) ?? null),
    enabled: !!projetoOrig?.cliente_id && !!context
  });
  useEffect(() => {
    if (clienteOriginal) setClienteSelecionado(clienteOriginal);
  }, [clienteOriginal]);

  const saveMutation = useMutation({
    mutationFn: () => saveProjeto(context!, { ...form, cliente_id: clienteSelecionado?.id ?? form.cliente_id }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['projetos'] });
      queryClient.invalidateQueries({ queryKey: ['projeto', saved.id] });
      toast.success('Projeto salvo com sucesso!');
      if (!isEdit) {
        navigate(`/app/projetos/${saved.id}`, { replace: true });
      }
    },
    onError: (e: any) => toast.error(e.message)
  });

  if (isLoadingProjeto) return <LoadingState title="Sincronizando Projeto..." />;
  if (isError) return <ErrorState title="Projeto não encontrado" />;

  const totalPedidos = pedidos?.reduce((acc, p) => acc + (p.total || 0), 0) || 0;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/app/projetos')}
            className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
            <Briefcase className="text-emerald-400" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={form.nome || ''} 
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome do Projeto / Obra..."
                className="bg-transparent text-2xl font-black text-white outline-none border-b border-transparent focus:border-emerald-500/50 transition-colors placeholder:text-slate-600"
              />
              {isEdit && (
                <span className={`px-2 py-1 text-[10px] uppercase font-black tracking-widest rounded-md border ${
                  form.status === 'em_andamento' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                  form.status === 'concluido' ? 'bg-teal-500/10 text-teal-500 border-teal-500/20' :
                  'bg-rose-500/10 text-rose-500 border-rose-500/20'
                }`}>
                  {form.status?.replace('_', ' ')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
              <MapPin size={14} />
              <input 
                type="text" 
                value={form.endereco?.logradouro || ''} 
                onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, logradouro: e.target.value } })}
                placeholder="Endereço da obra..."
                className="bg-transparent outline-none w-64 hover:bg-white/5 px-1 rounded transition-colors"
              />
            </div>
            {/* Cliente Selector */}
            <div className="flex items-center gap-2 text-sm mt-2" ref={dropdownRef}>
              <User size={14} className="text-slate-500 flex-shrink-0" />
              {clienteSelecionado ? (
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-semibold text-sm">{clienteSelecionado.nome}</span>
                  <button 
                    onClick={() => { setClienteSelecionado(null); setForm(f => ({ ...f, cliente_id: undefined })); }}
                    className="w-4 h-4 flex items-center justify-center text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2 py-1 focus-within:border-emerald-500/40 transition-colors">
                    <Search size={12} className="text-slate-500" />
                    <input
                      type="text"
                      value={clienteSearch}
                      onChange={(e) => setClienteSearch(e.target.value)}
                      onFocus={() => setClienteDropdownOpen(true)}
                      placeholder="Vincular cliente..."
                      className="bg-transparent outline-none text-xs text-slate-300 placeholder:text-slate-600 w-44"
                    />
                  </div>
                  {clienteDropdownOpen && clientesFiltrados.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                      {clientesFiltrados.map(c => (
                        <button
                          key={c.id}
                          onMouseDown={(e) => { e.preventDefault(); setClienteSelecionado(c); setForm(f => ({ ...f, cliente_id: c.id })); setClienteDropdownOpen(false); setClienteSearch(''); }}
                          className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                        >
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 flex-shrink-0">
                            {c.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold leading-none">{c.nome}</p>
                            {c.cidade && <p className="text-xs text-slate-500 mt-0.5">{c.cidade}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} variant="primary">
            {saveMutation.isPending ? 'Salvando...' : 'Salvar Projeto'}
          </Button>
        </div>
      </div>

      {!isEdit ? (
        <div className="bg-slate-900/40 border border-white/5 p-12 rounded-[2rem] text-center">
          <Briefcase className="mx-auto text-slate-600 mb-4" size={48} />
          <h3 className="text-xl font-bold text-white mb-2">Novo Projeto</h3>
          <p className="text-slate-400 mb-6 max-w-sm mx-auto">Salve o projeto primeiro para poder atrelar medições, orçamentos e contratos a ele.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coluna 1: Engenharia & Levantamentos */}
          <div className="flex flex-col gap-6">
            <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <LayoutTemplate size={80} />
              </div>
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <PencilRuler size={16} />
                  </div>
                  <h3 className="text-lg font-bold text-white">Arquitetura</h3>
                </div>
                <button 
                  onClick={() => navigate(`/app/projetos/${id}/levantamento/novo`)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors"
                  title="Nova Medição"
                >
                  <Plus size={16} />
                </button>
              </div>

              {isLoadingLev ? (
                <div className="animate-pulse flex flex-col gap-3">
                  <div className="h-16 bg-white/5 rounded-xl"></div>
                </div>
              ) : levantamentos?.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-white/10 rounded-xl relative z-10">
                  <p className="text-sm text-slate-500 font-medium">Nenhum CAD Atrelado</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 relative z-10">
                  {levantamentos?.map(lev => (
                    <div 
                      key={lev.id} 
                      onClick={() => navigate(`/app/projetos/${id}/levantamento/${lev.id}`)}
                      className="p-3 bg-black/20 border border-white/5 hover:border-indigo-500/30 rounded-xl cursor-pointer transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-300 group-hover:text-indigo-400 transition-colors">{lev.nome_projeto || 'Planta DXF'}</p>
                        <p className="text-xs text-slate-500">{format(new Date(lev.criado_em || ''), "dd/MM/yyyy")}</p>
                      </div>
                      <span className={`text-[10px] uppercase font-black px-2 py-1 rounded-md ${lev.status === 'finalizado' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {lev.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Coluna 2: Orçamentos / Propostas */}
          <div className="flex flex-col gap-6">
            <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] p-6 shadow-xl relative overflow-hidden h-full">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                    <FileText size={16} />
                  </div>
                  <h3 className="text-lg font-bold text-white">Orçamentos</h3>
                </div>
                <button onClick={() => navigate(`/app/orcamentos/novo?projetoId=${id}`)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors">
                  <Plus size={16} />
                </button>
              </div>
              
              {isLoadingOrc ? (
                <div className="animate-pulse flex flex-col gap-3">
                  <div className="h-16 bg-white/5 rounded-xl"></div>
                </div>
              ) : orcamentos?.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-white/10 rounded-xl">
                   <p className="text-sm text-slate-500 font-medium mb-2">Nenhum Orçamento</p>
                   <span className="text-xs text-slate-600">Crie um orçamento atrelado a este projeto.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3 relative z-10">
                  {orcamentos?.map(orc => (
                    <div 
                      key={orc.id} 
                      onClick={() => navigate(`/app/orcamentos/${orc.id}`)}
                      className="p-3 bg-black/20 border border-white/5 hover:border-cyan-500/30 rounded-xl cursor-pointer transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-300 group-hover:text-cyan-400 transition-colors">{orc.nome_cliente || `Orçamento #${orc.num}`}</p>
                        <p className="text-xs text-slate-500">{format(new Date(orc.criado_em || ''), "dd/MM/yyyy")}</p>
                      </div>
                      <span className={`text-[10px] uppercase font-black px-2 py-1 rounded-md ${orc.status === 'aprovado' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                        {orc.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Coluna 3: Comercial / Contratos */}
          <div className="flex flex-col gap-6">
            <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] p-6 shadow-xl relative overflow-hidden h-full">
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                    <ShoppingCart size={16} />
                  </div>
                  <h3 className="text-lg font-bold text-white">Pedidos Fechados</h3>
                </div>
              </div>

              {isLoadingPed ? (
                <div className="animate-pulse h-16 bg-white/5 rounded-xl"></div>
              ) : pedidos?.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-white/10 rounded-xl relative z-10">
                  <p className="text-sm text-slate-500 font-medium">Nenhum Pedido Atrelado</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 relative z-10">
                  <div className="p-4 bg-teal-500/5 border border-teal-500/20 rounded-xl mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-500 uppercase tracking-widest">Total Faturado</span>
                    <span className="text-xl font-black text-white">R$ {totalPedidos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {pedidos?.map(ped => (
                    <div key={ped.id} onClick={() => navigate(`/app/pedidos/${ped.id}`)} className="p-3 bg-black/20 border border-white/5 hover:border-teal-500/30 rounded-xl cursor-pointer transition-colors flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-300">Pedido #{ped.num}</p>
                        <p className="text-xs text-slate-500">{format(new Date(ped.data || ''), "dd/MM/yyyy")}</p>
                      </div>
                      <span className="text-sm font-bold text-teal-400">R$ {ped.total.toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
