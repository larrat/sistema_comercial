import type { Filial } from '../../../../../types/domain';
import { useFiliaisStore } from '../store/useFiliaisStore';
import { useFilialMutations } from '../hooks/useFilialMutations';

type Props = { filial: Filial };

export function FilialCard({ filial }: Props) {
  const openEdit = useFiliaisStore((s) => s.openEdit);
  const { remover } = useFilialMutations();

  const cor = filial.cor ?? '#163F80';
  const localidade =
    filial.cidade && filial.estado
      ? `${filial.cidade} — ${filial.estado}`
      : filial.cidade ?? filial.estado ?? null;

  return (
    <div className="card filial-card">
      <div className="filial-card-hdr">
        <div className="filial-card-cor" style={{ background: cor }} />
        <div className="filial-card-nome">{filial.nome}</div>
      </div>
      {localidade && <div className="filial-card-meta">{localidade}</div>}
      {filial.endereco && <div className="filial-card-meta">{filial.endereco}</div>}
      <div className="filial-card-actions">
        <button className="btn btn-xs btn-ghost" onClick={() => openEdit(filial)}>
          Editar
        </button>
        <button
          className="btn btn-xs btn-ghost tone-danger"
          onClick={() => void remover(filial.id)}
        >
          Remover
        </button>
      </div>
    </div>
  );
}
