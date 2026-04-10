import type { Cliente } from '../../../types/domain';

// ---------------------------------------------------------------------------
// Constantes visuais (espelho das constantes do legado, sem acoplamento)
// ---------------------------------------------------------------------------

const AVC = [
  { bg: '#E6EEF9', c: '#0F2F5E' },
  { bg: '#E6F4EC', c: '#0D3D22' },
  { bg: '#FAF0D6', c: '#5C3900' },
  { bg: '#FAEBE9', c: '#731F18' }
];

const STATUS_BADGE: Record<string, string> = {
  ativo: '<span class="bdg bg">Ativo</span>',
  inativo: '<span class="bdg bk">Inativo</span>',
  prospecto: '<span class="bdg bb">Prospecto</span>'
};

// ---------------------------------------------------------------------------
// Helpers puros
// ---------------------------------------------------------------------------

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function avatarColor(nome: string): { bg: string; c: string } {
  return AVC[nome.charCodeAt(0) % AVC.length];
}

function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'CL';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

export type ContatoInfo = {
  principal: string;
  secundario: string;
  badge: string;
};

export function getContatoInfo(cliente: Cliente): ContatoInfo {
  const whatsapp = String(cliente.whatsapp || '').trim();
  const tel = String(cliente.tel || '').trim();
  const email = String(cliente.email || '').trim();

  if (whatsapp) {
    return {
      principal: `WhatsApp: ${whatsapp}`,
      secundario: tel && tel !== whatsapp ? `Telefone: ${tel}` : '',
      badge: '<span class="bdg bg">WhatsApp</span>'
    };
  }
  if (tel) {
    return {
      principal: `Telefone: ${tel}`,
      secundario: email,
      badge: '<span class="bdg ba">Telefone</span>'
    };
  }
  if (email) {
    return { principal: email, secundario: '', badge: '<span class="bdg bb">E-mail</span>' };
  }
  return {
    principal: 'Sem contato',
    secundario: '',
    badge: '<span class="bdg br">Sem contato</span>'
  };
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export type ClienteCardOptions = {
  /** Mostra linha secundária de contato quando disponível (default: true) */
  showSecondaryContact?: boolean;
};

/**
 * Renderiza um card de cliente como string HTML.
 * Função pura: sem acesso a DOM, sem estado global.
 */
export function renderClienteCard(cliente: Cliente, options: ClienteCardOptions = {}): string {
  const { showSecondaryContact = true } = options;

  const cor = avatarColor(cliente.nome);
  const contato = getContatoInfo(cliente);
  const statusBadge = STATUS_BADGE[cliente.status ?? ''] ?? '';

  const avatarStyle = `background:${cor.bg};color:${cor.c}`;

  const secondaryLine =
    showSecondaryContact && contato.secundario
      ? `<div class="cliente-card__contact-secondary">${esc(contato.secundario)}</div>`
      : '';

  const apelidoLine = cliente.apelido
    ? `<div class="cliente-card__apelido">${esc(cliente.apelido)}</div>`
    : '';

  return `
<div class="cliente-card" data-id="${esc(cliente.id)}">
  <div class="cliente-card__header">
    <div class="cliente-card__hero">
      <div class="av" style="${avatarStyle}">${esc(initials(cliente.nome))}</div>
      <div class="cliente-card__info">
        <div class="cliente-card__nome">${esc(cliente.nome)}</div>
        ${apelidoLine}
      </div>
    </div>
    <div class="cliente-card__status">${statusBadge}</div>
  </div>
  <div class="cliente-card__contact">
    <div class="cliente-card__contact-primary">${esc(contato.principal)}</div>
    ${secondaryLine}
  </div>
  <div class="cliente-card__badges">
    ${contato.badge}
    ${cliente.seg ? `<span class="bdg bk">${esc(cliente.seg)}</span>` : ''}
  </div>
</div>`.trim();
}
