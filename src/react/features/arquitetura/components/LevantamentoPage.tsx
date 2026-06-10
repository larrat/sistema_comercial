import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Input, LoadingState } from '../../../shared/ui';
import { Download, AlertTriangle, CheckCircle, PencilRuler, Square, LayoutTemplate, Layers, Save, Plus, ArrowLeft } from 'lucide-react';
import { downloadDXF } from '../lib/dxfExport';
import type { Room, WallSegment, Wall, PointOfInterest, ElementoInterno } from '../lib/dxfExport';
import { toast } from 'sonner';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { saveLevantamento, listLevantamentos } from '../services/levantamentosApi';

function createDefaultRoom(name: string): Room {
  return {
    name,
    width: 3.00,
    length: 4.00,
    height: 2.75,
    walls: {
      top: { id: 'top', name: 'Parede Superior', totalLength: 3.00, segments: [], points: [] },
      right: { id: 'right', name: 'Parede Direita', totalLength: 4.00, segments: [], points: [] },
      bottom: { id: 'bottom', name: 'Parede Inferior', totalLength: 3.00, segments: [], points: [] },
      left: { id: 'left', name: 'Parede Esquerda', totalLength: 4.00, segments: [], points: [] },
    },
    internalElements: []
  };
}

export function LevantamentoPage() {
  const { projetoId, id } = useParams<{ projetoId: string; id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { resolve } = useApiContext();
  const context = resolve();

  const isEdit = id && id !== 'novo';

  // Carregar dados se for edição
  const { data: levantamentos, isLoading } = useQuery({
    queryKey: ['levantamentos'],
    queryFn: () => listLevantamentos(context),
    enabled: !!isEdit
  });

  const projetoSalvo = isEdit ? levantamentos?.find(l => l.id === id) : null;

  const [nomeProjeto, setNomeProjeto] = useState('Novo Projeto');
  const [rooms, setRooms] = useState<Room[]>([createDefaultRoom('Ambiente 1')]);
  const [activeRoomIndex, setActiveRoomIndex] = useState(0);
  const [activeWall, setActiveWall] = useState<'top'|'right'|'bottom'|'left'>('top');

  useEffect(() => {
    if (projetoSalvo) {
      setNomeProjeto(projetoSalvo.nome_projeto);
      if (Array.isArray(projetoSalvo.dados_cad) && projetoSalvo.dados_cad.length > 0) {
        setRooms(projetoSalvo.dados_cad as Room[]);
      }
    }
  }, [projetoSalvo]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...(isEdit ? { id } : {}),
        projeto_id: projetoId,
        nome_projeto: nomeProjeto,
        dados_cad: rooms,
        status: 'rascunho' as const
      };
      return saveLevantamento(context, payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['levantamentos'] });
      toast.success('Projeto salvo com sucesso!');
      if (!isEdit) {
        navigate(`/app/projetos/${projetoId}/levantamento/${saved.id}`, { replace: true });
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar projeto');
    }
  });

  const room = rooms[activeRoomIndex];
  if (!room) return null; // Fallback if out of bounds

  const setRoom = (updater: (prev: Room) => Room) => {
    setRooms(prev => {
      const newRooms = [...prev];
      newRooms[activeRoomIndex] = updater(newRooms[activeRoomIndex]);
      return newRooms;
    });
  };

  const updateRoomDimension = (field: 'width' | 'length' | 'height', value: number) => {
    setRoom(prev => {
      const w = field === 'width' ? value : prev.width;
      const l = field === 'length' ? value : prev.length;
      return {
        ...prev,
        [field]: value,
        walls: {
          ...prev.walls,
          top: { ...prev.walls.top, totalLength: w },
          bottom: { ...prev.walls.bottom, totalLength: w },
          right: { ...prev.walls.right, totalLength: l },
          left: { ...prev.walls.left, totalLength: l },
        }
      };
    });
  };

  const addSegment = (type: WallSegment['type']) => {
    setRoom(prev => {
      const wall = prev.walls[activeWall];
      return {
        ...prev,
        walls: {
          ...prev.walls,
          [activeWall]: {
            ...wall,
            segments: [...wall.segments, { id: crypto.randomUUID(), type, length: 0 }]
          }
        }
      };
    });
  };

  const updateSegment = (id: string, length: number) => {
    setRoom(prev => {
      const wall = prev.walls[activeWall];
      return {
        ...prev,
        walls: {
          ...prev.walls,
          [activeWall]: {
            ...wall,
            segments: wall.segments.map(s => s.id === id ? { ...s, length } : s)
          }
        }
      };
    });
  };

  const removeSegment = (id: string) => {
    setRoom(prev => {
      const wall = prev.walls[activeWall];
      return {
        ...prev,
        walls: {
          ...prev.walls,
          [activeWall]: {
            ...wall,
            segments: wall.segments.filter(s => s.id !== id)
          }
        }
      };
    });
  };

  const addPoint = (type: PointOfInterest['type']) => {
    setRoom(prev => {
      const wall = prev.walls[activeWall];
      return {
        ...prev,
        walls: {
          ...prev.walls,
          [activeWall]: {
            ...wall,
            points: [...wall.points, { id: crypto.randomUUID(), type, distanceFromStart: 0 }]
          }
        }
      };
    });
  };

  const updatePoint = (id: string, distanceFromStart: number) => {
    setRoom(prev => {
      const wall = prev.walls[activeWall];
      return {
        ...prev,
        walls: {
          ...prev.walls,
          [activeWall]: {
            ...wall,
            points: wall.points.map(p => p.id === id ? { ...p, distanceFromStart } : p)
          }
        }
      };
    });
  };

  const removePoint = (id: string) => {
    setRoom(prev => {
      const wall = prev.walls[activeWall];
      return {
        ...prev,
        walls: {
          ...prev.walls,
          [activeWall]: {
            ...wall,
            points: wall.points.filter(p => p.id !== id)
          }
        }
      };
    });
  };

  const addInternalElement = (camada: ElementoInterno['camada'], type: ElementoInterno['type']) => {
    setRoom(prev => ({
      ...prev,
      internalElements: [
        ...prev.internalElements,
        { id: crypto.randomUUID(), camada, type, width: 0.5, length: 0.5, x: 0, y: 0 }
      ]
    }));
  };

  const updateInternalElement = (id: string, field: keyof ElementoInterno, value: number) => {
    setRoom(prev => ({
      ...prev,
      internalElements: prev.internalElements.map(el => el.id === id ? { ...el, [field]: value } : el)
    }));
  };

  const removeInternalElement = (id: string) => {
    setRoom(prev => ({
      ...prev,
      internalElements: prev.internalElements.filter(el => el.id !== id)
    }));
  };

  const currentWall = room.walls[activeWall];
  const currentSum = currentWall.segments.reduce((acc, s) => acc + s.length, 0);
  const diff = currentWall.totalLength - currentSum;
  const isOk = Math.abs(diff) < 0.01;

  const handleExport = () => {
    downloadDXF(rooms, nomeProjeto);
    toast.success('Arquivo DXF gerado com sucesso!');
  };

  const handleAddRoom = () => {
    setRooms(prev => [...prev, createDefaultRoom(`Ambiente ${prev.length + 1}`)]);
    setActiveRoomIndex(rooms.length);
    setActiveWall('top');
  };

  if (isLoading) return <LoadingState title="Carregando projeto..." />;

  const area = (room.width * room.length).toFixed(2);
  const perimeter = ((room.width * 2) + (room.length * 2)).toFixed(2);

  // UI Components Internos
  const SegmentBar = () => {
    if (currentWall.segments.length === 0) {
      return (
        <div className="w-full h-12 bg-white/[0.03] border border-white/10 rounded-xl flex items-center justify-center text-slate-500 font-medium text-sm">
          A parede inteira é fechada
        </div>
      );
    }

    return (
      <div className="w-full flex h-12 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
        {currentWall.segments.map((seg) => {
          const percentage = Math.max((seg.length / currentWall.totalLength) * 100, 5);
          
          let bgColor = 'bg-slate-700 border-r border-slate-900';
          if (seg.type === 'janela') bgColor = 'bg-cyan-500/80 border-r border-cyan-700 shadow-[0_0_20px_rgba(6,182,212,0.3)] z-10';
          if (seg.type === 'porta') bgColor = 'bg-teal-500/80 border-r border-teal-700 shadow-[0_0_20px_rgba(20,184,166,0.3)] z-10';
          if (seg.type === 'boneca') bgColor = 'bg-slate-500 border-r border-slate-700';

          return (
            <div 
              key={seg.id} 
              style={{ width: `${percentage}%` }}
              className={`flex items-center justify-center text-[10px] font-bold text-white/90 overflow-hidden ${bgColor} transition-all duration-300 relative group`}
            >
              {seg.length > 0 && <span>{seg.length}m</span>}
            </div>
          );
        })}
        {diff > 0.01 && (
          <div style={{ width: `${(diff / currentWall.totalLength) * 100}%` }} className="bg-rose-500/20 border-rose-500/50 border-r flex items-center justify-center overflow-hidden">
            <span className="text-rose-400 text-[10px] font-bold">-{diff.toFixed(2)}m</span>
          </div>
        )}

        {/* Draw Electrical Points as absolute positioned yellow dots */}
        {currentWall.points.map(poi => {
          const leftPerc = (poi.distanceFromStart / currentWall.totalLength) * 100;
          return (
            <div 
              key={poi.id}
              className="absolute w-3 h-3 bg-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.8)] border border-amber-200 z-20"
              style={{ left: `calc(${leftPerc}% - 6px)`, top: '50%', transform: 'translateY(-50%)' }}
              title={poi.type}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col xl:flex-row h-full min-h-[calc(100vh-100px)] gap-6 p-4 bg-[#020617] text-slate-300 font-sans">
      
      {/* Header Superior Principal */}
      <div className="w-full flex-shrink-0 flex items-center justify-between px-6 py-4 bg-white/[0.02] border-b border-white/[0.05] backdrop-blur-2xl z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/app/projetos/${projetoId}`)}
            className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center">
            <PencilRuler className="text-indigo-400" size={24} />
          </div>
          <div className="w-px h-8 bg-white/10 mx-2" />
          <div className="flex flex-col">
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-0.5">Nome do Projeto</span>
            <input 
              type="text" 
              value={nomeProjeto} 
              onChange={(e) => setNomeProjeto(e.target.value)}
              className="bg-transparent text-xl font-black text-white outline-none border-b border-transparent focus:border-indigo-500/50 transition-colors w-64"
              placeholder="Ex: Reforma Cozinha..."
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleExport}
            variant="secondary"
            className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
          >
            <Download size={16} className="mr-2" /> Exportar DXF (Tudo)
          </Button>
          <Button 
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]"
          >
            {saveMutation.isPending ? 'Salvando...' : <><Save size={16} className="mr-2" /> Salvar na Nuvem</>}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col xl:flex-row gap-6 p-4 overflow-hidden">
        
        {/* Coluna Esquerda: Resumo */}
        <div className="w-full xl:w-80 flex-shrink-0 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
          
          {/* Navegação de Cômodos */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-4 flex flex-col gap-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-2">Ambientes ({rooms.length})</h3>
            <div className="flex flex-col gap-2">
              {rooms.map((r, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveRoomIndex(idx);
                    setActiveWall('top');
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                    idx === activeRoomIndex
                      ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                      : 'hover:bg-white/5 border border-transparent text-slate-400'
                  }`}
                >
                  <span className="font-bold text-sm truncate max-w-[160px]">{r.name}</span>
                  <span className="text-xs opacity-50 font-mono">{(r.width * r.length).toFixed(1)}m²</span>
                </button>
              ))}
              <button 
                onClick={handleAddRoom}
                className="mt-2 border border-dashed border-white/10 hover:border-indigo-500/30 text-slate-500 hover:text-indigo-400 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-bold transition-colors"
              >
                <Plus size={16} /> Adicionar Ambiente
              </button>
            </div>
          </div>

          <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.05] rounded-[2rem] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="flex flex-col gap-2 mb-6">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Editando</p>
              <input 
                type="text" 
                value={room.name} 
                onChange={(e) => setRoom(prev => ({ ...prev, name: e.target.value }))}
                className="bg-black/20 border border-white/10 text-xl font-bold text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500/50"
              />
            </div>

          <div className="flex gap-4 mb-8 text-sm">
            <div>
              <p className="text-slate-500">Área</p>
              <p className="text-xl font-bold text-slate-200">{area} m²</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div>
              <p className="text-slate-500">Perímetro</p>
              <p className="text-xl font-bold text-slate-200">{perimeter} m</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-bold text-slate-400 border-b border-white/5 pb-2">Medições (m)</p>
            <Input 
              label="Largura (X)" 
              type="number" 
              step="0.01"
              value={room.width} 
              onChange={(e) => updateRoomDimension('width', parseFloat(e.target.value) || 0)} 
              className="bg-black/20 border-white/10 text-white"
            />
            <Input 
              label="Comprimento (Y)" 
              type="number" 
              step="0.01"
              value={room.length} 
              onChange={(e) => updateRoomDimension('length', parseFloat(e.target.value) || 0)} 
              className="bg-black/20 border-white/10 text-white"
            />
            <Input 
              label="Pé-direito (Z)" 
              type="number" 
              step="0.01"
              value={room.height} 
              onChange={(e) => updateRoomDimension('height', parseFloat(e.target.value) || 0)} 
              className="bg-black/20 border-white/10 text-white"
            />
          </div>
        </div>
      </div>

      {/* Coluna Direita: Construtor Visual (Blueprint View) */}
      <div className="flex-1 bg-[#060b13] rounded-[2rem] border border-white/[0.03] shadow-2xl relative overflow-hidden flex flex-col">
        {/* Background Grid Blueprint */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" 
             style={{ 
               backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', 
               backgroundSize: '40px 40px',
               backgroundPosition: 'center center'
             }} 
        />
        <div className="absolute inset-0 opacity-10 bg-gradient-to-tr from-cyan-500/10 via-transparent to-teal-500/5 pointer-events-none" />

        {/* Header do Builder */}
        <div className="relative z-10 flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.01] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <LayoutTemplate className="text-indigo-500" size={24} />
            <h2 className="text-xl font-bold text-white tracking-tight">Geometria do Ambiente</h2>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col p-6 overflow-y-auto">
          {/* Navegação de Paredes estilo "Abas" */}
          <div className="flex gap-2 p-1 bg-black/40 rounded-2xl border border-white/5 mb-8 w-fit mx-auto">
            {(['top', 'right', 'bottom', 'left'] as const).map((wKey) => {
              const w = room.walls[wKey];
              const isActive = activeWall === wKey;
              return (
                <button
                  key={wKey}
                  onClick={() => setActiveWall(wKey)}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive 
                      ? 'bg-slate-800 shadow-md text-white' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {w.name} ({w.totalLength.toFixed(2)}m)
                </button>
              )
            })}
          </div>

          <div className="max-w-3xl mx-auto w-full flex flex-col gap-8">
            {/* O Blueprint Fake */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-slate-300">Layout da Parede</span>
                <span className="text-slate-500">{currentWall.totalLength.toFixed(2)}m totais</span>
              </div>
              <SegmentBar />
              
              <div className="mt-2 flex justify-center">
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border shadow-lg ${
                  isOk 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {isOk ? <><CheckCircle size={14}/> Matemática Exata (Layout Válido)</> : <><AlertTriangle size={14}/> {diff > 0 ? `Faltam ${diff.toFixed(2)}m` : `Sobra ${Math.abs(diff).toFixed(2)}m`}</>}
                </div>
              </div>
            </div>

            {/* Inserção de Segmentos */}
            <div className="bg-white/[0.02] border border-white/5 rounded-[1.5rem] p-6 shadow-xl">
              <div className="flex gap-3 mb-6">
                <button onClick={() => addSegment('parede')} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm font-medium text-slate-300 transition-colors">+ Parede Seca</button>
                <button onClick={() => addSegment('janela')} className="flex-1 py-3 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/50 rounded-xl text-sm font-medium text-cyan-400 transition-colors shadow-[0_0_10px_rgba(6,182,212,0.1)]">+ Janela (Window)</button>
                <button onClick={() => addSegment('porta')} className="flex-1 py-3 bg-teal-950/40 hover:bg-teal-900/60 border border-teal-800/50 rounded-xl text-sm font-medium text-teal-400 transition-colors shadow-[0_0_10px_rgba(20,184,166,0.1)]">+ Porta (Door)</button>
              </div>

              <div className="flex flex-col gap-3">
                {currentWall.segments.length === 0 ? (
                  <div className="text-center py-8 text-slate-600 border border-dashed border-white/10 rounded-xl font-medium">
                    Nenhum elemento adicionado.
                  </div>
                ) : (
                  currentWall.segments.map((seg, idx) => (
                    <div key={seg.id} className="flex items-center gap-4 bg-black/20 p-2.5 rounded-xl border border-white/5">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shadow-inner">
                        {idx + 1}
                      </div>
                      <div className={`w-32 capitalize text-sm font-bold flex items-center gap-2 ${
                        seg.type === 'janela' ? 'text-cyan-400' : 
                        seg.type === 'porta' ? 'text-teal-400' : 'text-slate-300'
                      }`}>
                        {seg.type === 'janela' && <Square size={14} className="fill-cyan-500/20" />}
                        {seg.type === 'porta' && <Square size={14} className="fill-teal-500/20" />}
                        {seg.type === 'parede' || seg.type === 'boneca' ? <Square size={14} className="fill-slate-500/20" /> : null}
                        {seg.type}
                      </div>
                      <div className="flex-1">
                        <input 
                          type="number" 
                          step="0.01" 
                          value={seg.length || ''} 
                          onChange={(e) => updateSegment(seg.id, parseFloat(e.target.value) || 0)}
                          placeholder="0.00 m"
                          className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                        />
                      </div>
                      <button onClick={() => removeSegment(seg.id)} className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                        X
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Inserção de Pontos Elétricos */}
            <div className="bg-white/[0.02] border border-white/5 rounded-[1.5rem] p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <span className="text-amber-500 font-bold text-lg leading-none">⚡</span>
                </div>
                <h3 className="text-lg font-bold text-white">Elétrica e Lógica</h3>
              </div>
              <p className="text-sm text-slate-500 mb-6">Pontos de interesse não consomem espaço da parede. Eles são alocados a uma distância específica do canto inicial.</p>
              
              <div className="flex gap-3 mb-6">
                <button onClick={() => addPoint('tomada_baixa')} className="flex-1 py-2.5 bg-amber-950/20 hover:bg-amber-900/40 border border-amber-800/30 rounded-xl text-xs font-bold text-amber-400 transition-colors shadow-[0_0_10px_rgba(251,191,36,0.05)]">+ Tomada Baixa</button>
                <button onClick={() => addPoint('tomada_media')} className="flex-1 py-2.5 bg-amber-950/20 hover:bg-amber-900/40 border border-amber-800/30 rounded-xl text-xs font-bold text-amber-400 transition-colors shadow-[0_0_10px_rgba(251,191,36,0.05)]">+ Tomada Média</button>
                <button onClick={() => addPoint('tomada_alta')} className="flex-1 py-2.5 bg-amber-950/20 hover:bg-amber-900/40 border border-amber-800/30 rounded-xl text-xs font-bold text-amber-400 transition-colors shadow-[0_0_10px_rgba(251,191,36,0.05)]">+ Tomada Alta</button>
                <button onClick={() => addPoint('interruptor')} className="flex-1 py-2.5 bg-amber-950/20 hover:bg-amber-900/40 border border-amber-800/30 rounded-xl text-xs font-bold text-amber-400 transition-colors shadow-[0_0_10px_rgba(251,191,36,0.05)]">+ Interruptor</button>
              </div>

              <div className="flex flex-col gap-3">
                {currentWall.points.length === 0 ? (
                  <div className="text-center py-6 text-slate-600 border border-dashed border-white/10 rounded-xl font-medium text-sm">
                    Nenhum ponto elétrico nesta parede.
                  </div>
                ) : (
                  currentWall.points.map((poi, idx) => (
                    <div key={poi.id} className="flex items-center gap-4 bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/10">
                      <div className="w-8 h-8 rounded-lg bg-amber-950/50 flex items-center justify-center text-xs font-bold text-amber-500 shadow-inner">
                        {idx + 1}
                      </div>
                      <div className="w-32 capitalize text-sm font-bold flex items-center gap-2 text-amber-400">
                        {poi.type.replace('_', ' ')}
                      </div>
                      <div className="flex-1 flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-medium">Distância do Início:</span>
                        <input 
                          type="number" 
                          step="0.01" 
                          value={poi.distanceFromStart || ''} 
                          onChange={(e) => updatePoint(poi.id, parseFloat(e.target.value) || 0)}
                          placeholder="0.00 m"
                          className="w-32 bg-slate-900/80 border border-amber-500/20 rounded-lg px-4 py-2 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
                        />
                      </div>
                      <button onClick={() => removePoint(poi.id)} className="w-10 h-10 flex items-center justify-center rounded-lg text-amber-600/50 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                        X
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Inserção de Elementos Internos (Piso e Teto) */}
            <div className="bg-white/[0.02] border border-white/5 rounded-[1.5rem] p-6 shadow-xl mt-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <span className="text-indigo-500 font-bold text-lg leading-none">🏗️</span>
                </div>
                <h3 className="text-lg font-bold text-white">Piso e Teto (Área Interna)</h3>
              </div>
              <p className="text-sm text-slate-500 mb-6">Elementos que ficam no meio do ambiente. Você define o tamanho (Largura x Comprimento) e a posição X,Y a partir do canto inferior esquerdo.</p>
              
              <div className="flex gap-3 mb-6">
                <button onClick={() => addInternalElement('piso', 'escada')} className="flex-1 py-2.5 bg-indigo-950/20 hover:bg-indigo-900/40 border border-indigo-800/30 rounded-xl text-xs font-bold text-indigo-400 transition-colors shadow-[0_0_10px_rgba(99,102,241,0.05)]">+ Escada (Piso)</button>
                <button onClick={() => addInternalElement('piso', 'pilar')} className="flex-1 py-2.5 bg-indigo-950/20 hover:bg-indigo-900/40 border border-indigo-800/30 rounded-xl text-xs font-bold text-indigo-400 transition-colors shadow-[0_0_10px_rgba(99,102,241,0.05)]">+ Pilar (Piso)</button>
                <button onClick={() => addInternalElement('teto', 'luminaria')} className="flex-1 py-2.5 bg-fuchsia-950/20 hover:bg-fuchsia-900/40 border border-fuchsia-800/30 rounded-xl text-xs font-bold text-fuchsia-400 transition-colors shadow-[0_0_10px_rgba(217,70,239,0.05)]">+ Luminária (Teto)</button>
                <button onClick={() => addInternalElement('teto', 'ar_k7')} className="flex-1 py-2.5 bg-fuchsia-950/20 hover:bg-fuchsia-900/40 border border-fuchsia-800/30 rounded-xl text-xs font-bold text-fuchsia-400 transition-colors shadow-[0_0_10px_rgba(217,70,239,0.05)]">+ Ar K7 (Teto)</button>
              </div>

              <div className="flex flex-col gap-3">
                {room.internalElements.length === 0 ? (
                  <div className="text-center py-6 text-slate-600 border border-dashed border-white/10 rounded-xl font-medium text-sm">
                    Nenhum elemento interno adicionado.
                  </div>
                ) : (
                  room.internalElements.map((el, idx) => (
                    <div key={el.id} className={`flex items-center gap-4 p-2.5 rounded-xl border ${el.camada === 'piso' ? 'bg-indigo-500/5 border-indigo-500/10' : 'bg-fuchsia-500/5 border-fuchsia-500/10'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shadow-inner ${el.camada === 'piso' ? 'bg-indigo-950/50 text-indigo-500' : 'bg-fuchsia-950/50 text-fuchsia-500'}`}>
                        {idx + 1}
                      </div>
                      <div className={`w-28 capitalize text-sm font-bold flex flex-col ${el.camada === 'piso' ? 'text-indigo-400' : 'text-fuchsia-400'}`}>
                        <span>{el.type.replace('_', ' ')}</span>
                        <span className="text-[10px] opacity-70 uppercase tracking-widest">{el.camada}</span>
                      </div>
                      
                      <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Largura (X)</span>
                          <input type="number" step="0.01" value={el.width || ''} onChange={(e) => updateInternalElement(el.id, 'width', parseFloat(e.target.value) || 0)} className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500/50" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Comprim. (Y)</span>
                          <input type="number" step="0.01" value={el.length || ''} onChange={(e) => updateInternalElement(el.id, 'length', parseFloat(e.target.value) || 0)} className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500/50" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Posição X</span>
                          <input type="number" step="0.01" value={el.x || ''} onChange={(e) => updateInternalElement(el.id, 'x', parseFloat(e.target.value) || 0)} className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500/50" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Posição Y</span>
                          <input type="number" step="0.01" value={el.y || ''} onChange={(e) => updateInternalElement(el.id, 'y', parseFloat(e.target.value) || 0)} className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500/50" />
                        </div>
                      </div>

                      <button onClick={() => removeInternalElement(el.id)} className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                        X
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
