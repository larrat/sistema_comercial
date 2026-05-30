import { useState } from 'react';
import { Button } from '../../../shared/ui';
import { ConfirmModal } from '../../../shared/ui/ConfirmModal';
import type { Filial } from '../../../../types/domain';
import { useFiliaisStore } from '../store/useFiliaisStore';
import { useFilialMutations } from '../hooks/useFilialMutations';

type Props = { filial: Filial };

export function FilialCard({ filial }: Props) {
  const openEdit = useFiliaisStore((s) => s.openEdit);
  const { remover } = useFilialMutations();
  const [showConfirm, setShowConfirm] = useState(false);

  const cor = filial.cor ?? '#163F80';
  const localidade =
    filial.cidade && filial.estado
      ? `${filial.cidade} — ${filial.estado}`
      : filial.cidade ?? filial.estado ?? null;

  return (
    <div className="rf-bento-item col-span-12 md:col-span-6 lg:col-span-4 flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl shadow-lg flex-shrink-0" style={{ background: cor }} />
        <div className="flex-1 min-w-0">
          <div className="text-lg font-black text-slate-900 truncate">{filial.nome}</div>
          {localidade && <div className="text-sm font-medium text-slate-400">{localidade}</div>}
        </div>
      </div>
      
      {filial.endereco && (
        <div className="text-sm text-slate-500 font-medium line-clamp-2 min-h-[40px]">
          {filial.endereco}
        </div>
      )}

      <div className="flex items-center gap-2 mt-auto pt-2">
        <Button size="sm" className="flex-1" onClick={() => openEdit(filial)}>
          Editar
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => setShowConfirm(true)}
        >
          Remover
        </Button>
      </div>

      <ConfirmModal
        open={showConfirm}
        title="Remover Filial"
        description={`Remover a filial "${filial.nome}"? Esta ação afeta cadastros, pedidos e acessos vinculados.`}
        isDestructive
        onCancel={() => setShowConfirm(false)}
        onConfirm={() => {
          setShowConfirm(false);
          void remover(filial.id);
        }}
      />
    </div>
  );
}
