import type { Cliente } from '../../../../types/domain';
import { EmptyState, ActionMenu, Button, StatusBadge, Badge, Typography } from '../../../shared/ui';
import { Phone, Tag, Building2, User } from 'lucide-react';

const STATUS_BADGE: Record<string, { label: string; tone: 'success' | 'neutral' | 'info' }> = {
  ativo: { label: 'Ativo', tone: 'success' },
  inativo: { label: 'Inativo', tone: 'neutral' },
  prospecto: { label: 'Prospecto', tone: 'info' }
};

function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Props = {
  clientes: Cliente[];
  total: number;
  page: number;
  pageSize: number;
  hasFilters?: boolean;
  onPageChange: (page: number) => void;
  onDetalhe: (id: string) => void;
  onEditar: (id: string) => void;
  onRemover: (id: string) => void;
  onNovo: () => void;
};

export function ClienteListMobile({
  clientes,
  total,
  page,
  pageSize,
  hasFilters,
  onPageChange,
  onDetalhe,
  onEditar,
  onRemover,
  onNovo
}: Props) {
  if (clientes.length === 0) {
    return (
      <EmptyState
        title={hasFilters ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
        description={hasFilters ? 'Tente ajustar sua busca ou limpar os filtros.' : 'Cadastre o primeiro cliente para começar.'}
        action={<Button variant="primary" onClick={onNovo}>Novo cliente</Button>}
      />
    );
  }

  return (
    <div className="rf-ui-stack">
      {clientes.map(cliente => {
        const badge = STATUS_BADGE[cliente.status ?? 'inativo'] || STATUS_BADGE.inativo;
        
        return (
          <div
            key={cliente.id}
            className="rf-card-premium rf-glass p-5 flex flex-col gap-4 relative overflow-hidden transition-all hover:scale-[1.01] cursor-pointer"
            style={{ borderLeft: '4px solid var(--color-indigo-vibrant)' }}
            onClick={() => onDetalhe(cliente.id)}
          >
            <div className="absolute top-0 right-0 p-3 opacity-[0.03] pointer-events-none">
               <User className="w-24 h-24" />
            </div>
            
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div 
                  className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black text-lg flex items-center justify-center shrink-0 shadow-inner"
                  style={{ viewTransitionName: `cliente-hero-${cliente.id}` }}
                >
                  {getInitials(cliente.nome || '')}
                </div>
                <div className="min-w-0">
                  <div className="text-[15px] font-black text-white truncate leading-tight tracking-tight">
                    {cliente.nome}
                  </div>
                  {cliente.apelido && (
                    <div className="text-xs text-slate-400 font-medium truncate mt-0.5">
                      {cliente.apelido}
                    </div>
                  )}
                </div>
              </div>
              <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-t border-white/5 pt-4 relative z-10">
              <div className="flex flex-col gap-1">
                <Typography variant="label" color="muted" className="flex items-center gap-1">
                  <Phone size={12} /> Contato
                </Typography>
                <span className="text-sm font-bold text-slate-200">
                  {cliente.whatsapp || cliente.tel || '—'}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <Typography variant="label" color="muted" className="flex items-center gap-1">
                  <Building2 size={12} /> Segmento
                </Typography>
                <span className="text-sm font-bold text-slate-300">
                  {cliente.seg || '—'}
                </span>
              </div>
              {cliente.optin_marketing && (
                <div className="flex flex-col gap-1 col-span-2">
                  <Typography variant="label" color="muted" className="flex items-center gap-1">
                    <Tag size={12} /> Tags
                  </Typography>
                  <div className="mt-0.5">
                    <Badge variant="green" className="!text-[10px]">MKT</Badge>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 relative z-10" onClick={e => e.stopPropagation()}>
              <Button size="sm" onClick={() => onDetalhe(cliente.id)}>
                Detalhes
              </Button>
              <ActionMenu
                label="Ações"
                align="right"
                items={[
                  { key: 'editar', label: 'Editar', onClick: () => onEditar(cliente.id) },
                  { key: 'remover', label: 'Excluir', danger: true, onClick: () => onRemover(cliente.id) }
                ]}
              />
            </div>
          </div>
        );
      })}

      {total > clientes.length ? (
        <div className="rf-glass border border-white/5 rounded-2xl flex items-center justify-between p-4">
          <div className="text-xs text-slate-400 font-medium">
            Página {page} · {clientes.length} de {total}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Ant</Button>
            <Button size="sm" disabled={page * pageSize >= total} onClick={() => onPageChange(page + 1)}>Próx</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
