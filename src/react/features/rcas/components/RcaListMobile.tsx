import { ActionMenu, StatusBadge } from '../../../shared/ui';
import type { Rca } from '../../../../types/domain';
import { UserCircle } from 'lucide-react';

interface Props {
  rcas: Rca[];
  onEdit: (rca: Rca) => void;
  onDesativar: (id: string) => void;
}

export function RcaListMobile({ rcas, onEdit, onDesativar }: Props) {
  if (rcas.length === 0) return null;

  return (
    <div className="rf-ui-stack">
      {rcas.map((r) => (
        <div
          key={r.id}
          className="rf-card-premium rf-glass p-4 flex items-center justify-between gap-4 cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => onEdit(r)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black text-lg flex items-center justify-center shrink-0 shadow-inner">
              {r.inicial || r.nome.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex flex-col gap-1">
              <span className="text-[15px] font-black text-white truncate leading-tight tracking-tight">
                {r.nome}
              </span>
              <div className="flex items-center gap-2">
                {r.ativo !== false ? (
                  <StatusBadge tone="success">Ativo</StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">Inativo</StatusBadge>
                )}
              </div>
            </div>
          </div>
          <div className="shrink-0" onClick={e => e.stopPropagation()}>
            <ActionMenu
              label="Ações do vendedor"
              align="right"
              items={[
                { key: 'editar', label: 'Editar', onClick: () => onEdit(r) },
                ...(r.ativo !== false
                  ? [
                      {
                        key: 'desativar',
                        label: 'Desativar',
                        danger: true,
                        onClick: () => onDesativar(r.id)
                      }
                    ]
                  : [])
              ]}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
