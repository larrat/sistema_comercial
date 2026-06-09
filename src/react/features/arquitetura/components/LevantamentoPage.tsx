import React, { useState } from 'react';
import { Card, Button, Input } from '../../../shared/ui';
import { Download, AlertTriangle, CheckCircle, PencilRuler, Square, LayoutTemplate, Layers } from 'lucide-react';
import { downloadDXF } from '../lib/dxfExport';
import type { Room, WallSegment, Wall } from '../lib/dxfExport';
import { toast } from 'sonner';

export function LevantamentoPage() {
  const [room, setRoom] = useState<Room>({
    name: 'Cozinha',
    width: 3.20,
    length: 4.81,
    height: 2.75,
    walls: {
      top: { id: 'top', name: 'Parede Superior', totalLength: 3.20, segments: [] },
      right: { id: 'right', name: 'Parede Direita', totalLength: 4.81, segments: [] },
      bottom: { id: 'bottom', name: 'Parede Inferior', totalLength: 3.20, segments: [] },
      left: { id: 'left', name: 'Parede Esquerda', totalLength: 4.81, segments: [] },
    }
  });

  const [activeWall, setActiveWall] = useState<'top'|'right'|'bottom'|'left'>('top');

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

  const currentWall = room.walls[activeWall];
  const currentSum = currentWall.segments.reduce((acc, s) => acc + s.length, 0);
  const diff = currentWall.totalLength - currentSum;
  const isOk = Math.abs(diff) < 0.01;

  const handleExport = () => {
    downloadDXF(room);
    toast.success('Arquivo DXF gerado com sucesso!');
  };

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
      </div>
    );
  };

  return (
    <div className="flex flex-col xl:flex-row h-full min-h-[calc(100vh-100px)] gap-6 p-4 bg-[#020617] text-slate-300 font-sans">
      
      {/* Coluna Esquerda: Resumo (Estilo Glassmorphism) */}
      <div className="w-full xl:w-80 flex-shrink-0 flex flex-col gap-6">
        <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.05] rounded-[2rem] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center border border-cyan-500/30">
              <Layers className="text-cyan-400" size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Resumo do Cômodo</p>
              <h2 className="text-2xl font-bold text-white tracking-tight">{room.name}</h2>
            </div>
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
            <LayoutTemplate className="text-teal-500" size={24} />
            <h2 className="text-xl font-bold text-white tracking-tight">Construtor Visual</h2>
          </div>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-2.5 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/50 text-cyan-400 font-bold rounded-full transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]"
          >
            <Download size={16} /> Export DXF
          </button>
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

          </div>
        </div>
      </div>
    </div>
  );
}
