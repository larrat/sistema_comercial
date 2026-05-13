import { useMemo } from 'react';
import { EmptyState, ErrorState, LoadingState, Badge, Button } from '../../../shared/ui';

import type { Cliente } from '../../../../types/domain';

type Props = {
  clientes: Cliente[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onDetalhe?: (id: string) => void;
};

type GrupoSegmento = {
  segmento: string;
  clientes: Cliente[];
};

function buildInitials(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return 'CL';
  return (partes[0][0] + (partes[1] ? partes[1][0] : '')).toUpperCase();
}

function avatarColor(nome: string) {
  const palette = [
    { bg: '#E6EEF9', c: '#0F2F5E' },
    { bg: '#E6F4EC', c: '#0D3D22' },
    { bg: '#FAF0D6', c: '#5C3900' },
    { bg: '#FAEBE9', c: '#731F18' }
  ];
  return palette[nome.charCodeAt(0) % palette.length];
}

export function ClienteSegmentView({ clientes, loading, error, onRetry, onDetalhe }: Props) {
  const grupos = useMemo<GrupoSegmento[]>(() => {
    const map = new Map<string, Cliente[]>();

    clientes.forEach((cliente) => {
      const key = String(cliente.seg || 'Sem segmento');
      const bucket = map.get(key) || [];
      bucket.push(cliente);
      map.set(key, bucket);
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([segmento, clientes]) => ({
        segmento,
        clientes: [...clientes].sort((a, b) => a.nome.localeCompare(b.nome))
      }));
  }, [clientes]);

  if (loading) {
    return <LoadingState title="Carregando agrupamento por segmento..." compact />;
  }

  if (error) {
    return <ErrorState title={error} compact onRetry={onRetry} />;
  }

  if (!grupos.length) {
    return (
      <EmptyState
        title="Nenhum cliente encontrado para agrupar por segmento."
        description="Ajuste a busca ou os filtros para ampliar os resultados."
        data-testid="cliente-segment-empty"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="cliente-segment-view">
      {grupos.map((grupo) => (
        <div key={grupo.segmento} className="card-shell form-gap-md">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-bold text-slate-900 tracking-tight">{grupo.segmento}</div>
            <Badge variant="blue">{grupo.clientes.length}</Badge>
          </div>

          <div className="fg2">
            {grupo.clientes.map((cliente) => {
              const cor = avatarColor(cliente.nome);
              return (
                <Button
                  key={cliente.id}
                  variant="secondary"
                  size="sm"
                  className="!px-3 !py-2 rounded-xl border-slate-100 bg-slate-50/30 hover:bg-white hover:shadow-sm"
                  onClick={() => onDetalhe?.(String(cliente.id))}
                  leftIcon={
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black"
                      style={{ background: cor.bg, color: cor.c }}
                      aria-hidden="true"
                    >
                      {buildInitials(cliente.nome)}
                    </div>
                  }
                >
                  <span className="text-xs font-bold text-slate-700">{cliente.apelido || cliente.nome}</span>
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
