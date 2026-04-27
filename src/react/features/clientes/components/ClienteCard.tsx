import type { Cliente } from '../../../../types/domain';
import { StatusBadge } from '../../../shared/ui';
import type { StatusBadgeTone } from '../../../shared/ui';

const STATUS_BADGE: Record<string, { label: string; tone: StatusBadgeTone }> = {
  ativo: { label: 'Ativo', tone: 'success' },
  inativo: { label: 'Inativo', tone: 'neutral' },
  prospecto: { label: 'Prospecto', tone: 'info' }
};

type ContactInfo = {
  principal: string;
  secundario: string;
  badgeTone: StatusBadgeTone;
  badgeLabel: string;
};

function getContactInfo(cliente: Cliente): ContactInfo {
  const whatsapp = String(cliente.whatsapp || '').trim();
  const tel = String(cliente.tel || '').trim();
  const email = String(cliente.email || '').trim();

  if (whatsapp) {
    return {
      principal: whatsapp,
      secundario: tel && tel !== whatsapp ? tel : '',
      badgeTone: 'success',
      badgeLabel: 'WhatsApp'
    };
  }
  if (tel) {
    return {
      principal: tel,
      secundario: email,
      badgeTone: 'warning',
      badgeLabel: 'Telefone'
    };
  }
  if (email) {
    return {
      principal: email,
      secundario: '',
      badgeTone: 'info',
      badgeLabel: 'E-mail'
    };
  }
  return {
    principal: 'Sem contato',
    secundario: '',
    badgeTone: 'danger',
    badgeLabel: 'Sem contato'
  };
}

type Props = {
  cliente: Cliente;
  onDetalhe?: (id: string) => void;
  onEditar?: (id: string) => void;
  onExcluir?: (id: string) => void;
};

export function ClienteCard({ cliente, onDetalhe, onEditar, onExcluir }: Props) {
  const contato = getContactInfo(cliente);
  const statusBadge = STATUS_BADGE[cliente.status ?? ''];
  const localidade = [cliente.cidade, cliente.estado].filter(Boolean).join(' / ');

  return (
    <div className="mobile-card" data-testid="cliente-card">
      <div className="mobile-card-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mobile-card-title">{cliente.nome}</div>
          {cliente.apelido && <div className="mobile-card-sub">{cliente.apelido}</div>}
        </div>
        {statusBadge && (
          <StatusBadge tone={statusBadge.tone}>{statusBadge.label}</StatusBadge>
        )}
      </div>

      <div className="mobile-card-meta">
        <span>{contato.principal}</span>
        {contato.secundario && <span>{contato.secundario}</span>}
        {localidade && <span>{localidade}</span>}
        {cliente.doc && <span>{cliente.doc}</span>}
        {cliente.rca_nome && <span>Vendedor: {cliente.rca_nome}</span>}
      </div>

      <div className="mobile-card-tags">
        <StatusBadge tone={contato.badgeTone}>{contato.badgeLabel}</StatusBadge>
        {cliente.seg && <StatusBadge tone="neutral">{cliente.seg}</StatusBadge>}
        {cliente.optin_marketing && <StatusBadge tone="success">MKT</StatusBadge>}
      </div>

      {(onDetalhe || onEditar || onExcluir) && (
        <div className="mobile-card-actions">
          {onDetalhe && (
            <button className="btn btn-sm" onClick={() => onDetalhe(String(cliente.id))}>
              Detalhes
            </button>
          )}
          {onEditar && (
            <button className="btn btn-p btn-sm" onClick={() => onEditar(String(cliente.id))}>
              Editar
            </button>
          )}
          {onExcluir && (
            <button className="btn btn-r btn-sm" onClick={() => onExcluir(String(cliente.id))}>
              Excluir
            </button>
          )}
        </div>
      )}
    </div>
  );
}
