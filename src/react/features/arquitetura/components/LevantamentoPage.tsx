import React, { useState } from 'react';
import { Card, Button, Input } from '../../../shared/ui';
import { Plus, Download, AlertTriangle, CheckCircle, PencilRuler } from 'lucide-react';
import { downloadDXF } from '../lib/dxfExport';
import type { Room, WallSegment } from '../lib/dxfExport';
import { toast } from 'sonner';

export function LevantamentoPage() {
  const [room, setRoom] = useState<Room>({
    name: 'Cozinha',
    width: 3.20,
    length: 4.81,
    height: 2.56,
    walls: {
      top: { id: 'top', name: 'Parede Superior', totalLength: 3.20, segments: [] },
      right: { id: 'right', name: 'Parede Direita', totalLength: 4.81, segments: [] },
      bottom: { id: 'bottom', name: 'Parede Inferior', totalLength: 3.20, segments: [] },
      left: { id: 'left', name: 'Parede Esquerda', totalLength: 4.81, segments: [] },
    }
  });

  const [activeWall, setActiveWall] = useState<'top'|'right'|'bottom'|'left'>('top');

  // Atualiza medidas gerais
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

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <PencilRuler className="text-teal-400" /> Levantamento Mobile
          </h1>
          <p className="text-slate-400 text-sm mt-1">Protótipo de inserção rápida de cotas</p>
        </div>
        <Button onClick={handleExport} variant="primary" className="gap-2">
          <Download size={16} /> Exportar DXF
        </Button>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-medium text-white mb-4">Medidas Gerais do Ambiente</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input 
            label="Nome do Ambiente" 
            value={room.name} 
            onChange={(e) => setRoom({ ...room, name: e.target.value })} 
          />
          <Input 
            label="Largura (m)" 
            type="number" 
            step="0.01"
            value={room.width} 
            onChange={(e) => updateRoomDimension('width', parseFloat(e.target.value) || 0)} 
          />
          <Input 
            label="Comprimento (m)" 
            type="number" 
            step="0.01"
            value={room.length} 
            onChange={(e) => updateRoomDimension('length', parseFloat(e.target.value) || 0)} 
          />
          <Input 
            label="Pé-direito (m)" 
            type="number" 
            step="0.01"
            value={room.height} 
            onChange={(e) => updateRoomDimension('height', parseFloat(e.target.value) || 0)} 
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Navegação de Paredes */}
        <div className="flex flex-col gap-2">
          {(['top', 'right', 'bottom', 'left'] as const).map((wKey) => {
            const w = room.walls[wKey];
            const sum = w.segments.reduce((acc, s) => acc + s.length, 0);
            const wDiff = w.totalLength - sum;
            const wOk = Math.abs(wDiff) < 0.01;
            
            return (
              <button
                key={wKey}
                onClick={() => setActiveWall(wKey)}
                className={`p-4 rounded-xl text-left transition-colors border ${
                  activeWall === wKey 
                    ? 'bg-teal-500/10 border-teal-500/50 text-teal-300' 
                    : 'bg-[#0f172a] border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{w.name}</span>
                  <span className="text-sm">{w.totalLength.toFixed(2)}m</span>
                </div>
                <div className="mt-2 text-xs flex items-center gap-1">
                  {w.segments.length === 0 ? (
                    <span className="text-slate-500">Sem detalhes</span>
                  ) : wOk ? (
                    <span className="text-emerald-400 flex items-center gap-1"><CheckCircle size={12}/> Cotas batem</span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1"><AlertTriangle size={12}/> Faltam {wDiff.toFixed(2)}m</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Painel de Segmentos */}
        <Card className="lg:col-span-2 p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center pb-4 border-b border-white/5">
            <h2 className="text-lg font-medium text-white">Detalhamento: {currentWall.name}</h2>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${isOk ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {isOk ? 'Matemática Exata' : `Diferença: ${diff.toFixed(2)}m`}
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <Button onClick={() => addSegment('parede')} variant="secondary" size="sm" className="flex-1">+ Parede Seca</Button>
            <Button onClick={() => addSegment('janela')} variant="secondary" size="sm" className="flex-1 border-emerald-500/30 text-emerald-300">+ Janela</Button>
            <Button onClick={() => addSegment('porta')} variant="secondary" size="sm" className="flex-1 border-rose-500/30 text-rose-300">+ Porta</Button>
            <Button onClick={() => addSegment('boneca')} variant="secondary" size="sm" className="flex-1">+ Boneca</Button>
          </div>

          <div className="flex flex-col gap-3">
            {currentWall.segments.length === 0 ? (
              <div className="text-center py-10 text-slate-500 border border-dashed border-white/10 rounded-xl">
                Nenhum elemento adicionado. A parede será desenhada inteira.
              </div>
            ) : (
              currentWall.segments.map((seg, idx) => (
                <div key={seg.id} className="flex items-center gap-4 bg-white/[0.02] p-3 rounded-lg border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                    {idx + 1}
                  </div>
                  <div className="w-24 capitalize text-sm font-medium text-slate-300">
                    {seg.type}
                  </div>
                  <div className="flex-1">
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={seg.length || ''} 
                      onChange={(e) => updateSegment(seg.id, parseFloat(e.target.value) || 0)}
                      placeholder="Medida em metros"
                    />
                  </div>
                  <button onClick={() => removeSegment(seg.id)} className="text-slate-500 hover:text-rose-400 p-2">
                    X
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
