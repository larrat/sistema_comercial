import type { Cliente } from '../../../../types/domain';
import type { ContatoInfo } from '../../../../pilot/clientes/ui/ClienteCard';

// ---------------------------------------------------------------------------
// Constantes visuais — espelho do piloto
// ---------------------------------------------------------------------------

const AVC = [
  { bg: '#E6EEF9', c: '#0F2F5E' },
  { bg: '#E6F4EC', c: '#0D3D22' },
  { bg: '#FAF0D6', c: '#5C3900' },
  { bg: '#FAEBE9', c: '#731F18' }
];

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  ativo: { label: 'Ativo', cls: 'bdg bg' },
  inativo: { label: 'Inativo', cls: 'bdg bk' },
  prospecto: { label: 'Prospecto', cls: 'bdg bb' }
};

function avatarColor(nome: string) {
  return AVC[nome.charCodeAt(0) % AVC.length];
}

function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'CL';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

function getContatoInfo(cliente: Cliente): ContatoInfo & { badgeCls: string; badgeLabel: string } {
  const whatsapp = String(cliente.whatsapp || '').trim();
  const tel = String(cliente.tel || '').trim();
  const email = String(cliente.email || '').trim();

  if (whatsapp) {
    return {
      principal: `WhatsApp: ${whatsapp}`,
      secundario: tel && tel !== whatsapp ? `Telefone: ${tel}` : '',
      badge: '',
      badgeCls: 'bdg bg',
      badgeLabel: 'WhatsApp'
    };
  }
  if (tel) {
    return {
      principal: `Telefone: ${tel}`,
      secundario: email,
      badge: '',
      badgeCls: 'bdg ba',
      badgeLabel: 'Telefone'
    };
  }
  if (email) {
    return {
      principal: email,
      secundario: '',
      badge: '',
      badgeCls: 'bdg bb',
      badgeLabel: 'E-mail'
    };
  }
  return {
    principal: 'Sem contato',
    secundario: '',
    badge: '',
    badgeCls: 'bdg br',
    badgeLabel: 'Sem contato'
  };
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

type Props = {
  cliente: Cliente;
  onDetalhe?: (id: string) => void;
  onEditar?: (id: string) => void;
  onExcluir?: (id: string) => void;
};

export function ClienteCard({ cliente, onDetalhe, onEditar, onExcluir }: Props) {
  const cor = avatarColor(cliente.nome);
  const contato = getContatoInfo(cliente);
  const status = STATUS_LABEL[cliente.status ?? ''];

  return (
    <div className="cliente-card" data-testid="cliente-card">
      {/* Header */}
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
        {status && <span className={status.cls}>{status.label}</span>}
      </div>

      {/* Contato */}
      <div className="cliente-card__contact">
        <div className="cliente-card__contact-primary">{contato.principal}</div>
        {contato.secundario && (
          <div className="cliente-card__contact-secondary">{contato.secundario}</div>
        )}
      </div>

      {/* Badges */}
      <div className="cliente-card__badges">
        <span className={contato.badgeCls}>{contato.badgeLabel}</span>
        {cliente.seg && <span className="bdg bk">{cliente.seg}</span>}
        {cliente.optin_marketing && <span className="bdg bg">MKT</span>}
      </div>

      {/* Ações */}
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
