import React, { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { Pedido } from '../../../../types/domain';
import { usePedidoStore } from '../store/usePedidoStore';
import { usePedidosQuery, usePedidoMutations } from '../hooks/usePedidosQuery';
import { LoadingState, ErrorState, EmptyState } from '../../../shared/ui';
import { normalizePedStatus, PEDIDO_STATUS_LABEL, PEDIDO_STATUS_TONE } from '../types';
import { toast } from 'sonner';

const KANBAN_COLUMNS = [
  { id: 'orcamento', label: 'Orçamento' },
  { id: 'confirmado', label: 'Confirmado' },
  { id: 'em_separacao', label: 'Em Separação' },
  { id: 'em_andamento', label: 'Em Andamento' },
  { id: 'pago_aguardando_entrega', label: 'Aguard. Entrega' },
  { id: 'entregue_aguardando_pagamento', label: 'Aguard. Pagto' },
  { id: 'concluido', label: 'Concluído' }
];

function KanbanCard({ pedido, isOverlay }: { pedido: Pedido; isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: pedido.id,
    data: { pedido }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-slate-900 border border-white/10 p-3 rounded-xl mb-3 shadow-sm hover:border-teal-500/50 transition-colors ${ isOverlay ? 'shadow-2xl ring-2 ring-teal-500 rotate-2' : '' }`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-black text-slate-300">#{pedido.num}</span>
        <span className="text-[10px] text-slate-500">{new Date(pedido.data).toLocaleDateString()}</span>
      </div>
      <p className="text-sm text-slate-200 line-clamp-2 leading-tight font-medium mb-3">{pedido.cli || 'Sem cliente'}</p>
      <div className="flex justify-between items-end mt-auto">
        <span className="text-xs text-teal-400 font-bold">
          {pedido.total?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">{pedido.pgto || '—'}</span>
      </div>
    </div>
  );
}

function KanbanColumn({ id, title, pedidos }: { id: string; title: string; pedidos: Pedido[] }) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { columnId: id }
  });

  return (
    <div className="flex flex-col flex-shrink-0 w-72 bg-slate-900/40 rounded-2xl border border-white/5 overflow-hidden h-[calc(100vh-280px)]">
      <div className="p-4 border-b border-white/5 bg-slate-900/60 sticky top-0 flex items-center justify-between z-10">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
          {pedidos.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 p-3 overflow-y-auto scrollbar-hide transition-colors ${ isOver ? 'bg-teal-500/10' : '' }`}
      >
        {pedidos.map((p) => (
          <KanbanCard key={p.id} pedido={p} />
        ))}
      </div>
    </div>
  );
}

export function PedidoKanbanView() {
  const filtro = usePedidoStore((s) => s.filtro);
  const { data: pedidosPage, isLoading, isError, error } = usePedidosQuery(
    { ...filtro, tab: 'emaberto' }, 
    1, 
    500 // Kanban carrega mais itens de uma vez
  );
  
  const { updateStatus } = usePedidoMutations();
  const [activePedido, setActivePedido] = useState<Pedido | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const pedidos = pedidosPage?.rows || [];

  const columnsData = useMemo(() => {
    const cols: Record<string, Pedido[]> = {};
    KANBAN_COLUMNS.forEach(c => (cols[c.id] = []));
    
    pedidos.forEach(p => {
      const status = normalizePedStatus(p.status);
      if (cols[status]) cols[status].push(p);
    });
    return cols;
  }, [pedidos]);

  if (isLoading) return <LoadingState description="Carregando funil de vendas..." />;
  if (isError) return <ErrorState title="Erro no Kanban" description={error instanceof Error ? error.message : 'Erro'} />;
  if (pedidos.length === 0) return <EmptyState icon="layout" title="Sem pedidos" description="Não há pedidos na aba Em Aberto para visualizar no Kanban." />;

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const pedido = active.data.current?.pedido as Pedido;
    setActivePedido(pedido);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePedido(null);
    const { active, over } = event;
    
    if (!over) return;

    const pedidoId = active.id as string;
    const oldStatus = activePedido?.status;
    const newStatus = over.id as string;

    if (oldStatus !== newStatus && KANBAN_COLUMNS.some(c => c.id === newStatus)) {
      // Otimista (imutabilidade local será feita pelo React Query na mutation)
      toast.promise(
        updateStatus.mutateAsync({ id: pedidoId, status: newStatus }),
        {
          loading: 'Movendo pedido...',
          success: 'Status atualizado com sucesso!',
          error: 'Falha ao mover pedido.'
        }
      );
    }
  };

  return (
    <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 min-w-max px-2">
          {KANBAN_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.label}
              pedidos={columnsData[col.id]}
            />
          ))}
        </div>

        <DragOverlay>
          {activePedido ? <KanbanCard pedido={activePedido} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
