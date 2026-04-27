import type { Cliente } from '../../../../types/domain';
import { StatusBadge } from '../../../shared/ui';
import type { StatusBadgeTone } from '../../../shared/ui';

const AVC = [
  { bg: '#E6EEF9', c: '#0F2F5E' },
  { bg: '#E6F4EC', c: '#0D3D22' },
  { bg: '#FAF0D6', c: '#5C3900' },
  { bg: '#FAEBE9', c: '#731F18' }
];

const STATUS_BADGE: Record<string, { label: string; tone: StatusBadgeTone }> = {
  ativo: { label: 'Ativo', tone: 'success' },
  inativo: { label: 'Inativo', tone: 'neutral' },
  prospecto: { label: 'Prospecto', tone: 'info' }
};

type ContatoInfo = {
  principal: string;
  secundario: string;
  badgeTone: StatusBadgeTone;
  badgeLabel: string;
};

function avatarColor(nome: string) {
  return AVC[nome.charCodeAt(0) % AVC.length];
}

function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'CL';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

function getContatoInfo(cliente: Cliente): ContatoInfo {
  const whatsapp = String(cliente.whatsapp || '').trim();
  const tel = String(cliente.tel || '').trim();
  const email = String(cliente.email || '').trim();

  if (whatsapp) {
    return {
      principal: `WhatsApp: ${whatsapp}`,
      secundario: tel && tel !== whatsapp ? `Telefone: ${tel}` : '',
      badgeTone: 'success',
      badgeLabel: 'WhatsApp'
    };
  }
  if (tel) {
    return {
      principal: `Telefone: ${tel}`,
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
  const cor = avatarColor(cliente.nome);
  const contato = getContatoInfo(cliente);
  const statusBadge = STATUS_BADGE[cliente.status ?? ''];

  return (
    <div className="cliente-card" data-testid="cliente-card">
      <div className="cliente-card__header">
        <div className="cliente-card__hero">
          <div className="av" style={{ background: cor.bg, color: cor.c }} aria-hidden="true">
            {initials(cliente.nome)}
          </div>
          <div className="cliente-card__info">
            <div className="cliente-card__nome">{cliente.nome}</div>
            {cliente.apelido && <div className="cliente-card__apelido">{cliente.apelido}</div>}
          </div>
        </div>
        {statusBadge && (
          <StatusBadge tone={statusBadge.tone}>{statusBadge.label}</StatusBadge>
        )}
      </div>

      <div className="cliente-card__contact">
        <div className="cliente-card__contact-primary">{contato.principal}</div>
        {contato.secundario && (
          <div className="cliente-card__contact-secondary">{contato.secundario}</div>
        )}
      </div>

      <div className="cliente-card__badges">
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
