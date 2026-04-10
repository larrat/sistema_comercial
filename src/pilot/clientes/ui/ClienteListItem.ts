import type { Cliente } from '../../../types/domain';
import { getContatoInfo } from './ClienteCard';

// ---------------------------------------------------------------------------
// Constantes visuais
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

const TAB_LABELS: Record<string, string> = {
  padrao: 'Padrao',
  especial: '<span class="bdg ba">Especial</span>',
  vip: '<span class="bdg br">VIP</span>'
};

const PRAZO_LABELS: Record<string, string> = {
  a_vista: 'A vista',
  '7d': '7d',
  '15d': '15d',
  '30d': '30d',
  '60d': '60d'
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

function parseTimes(value: string | string[] | null | undefined): string[] {
  const raw = Array.isArray(value) ? value : String(value || '').split(/[,;\n]+/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const nome = String(item || '').trim();
    if (!nome) continue;
    const key = nome.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(nome);
  }
  return out;
}

function getBadgeAniversario(cliente: Cliente): string {
  if (!cliente.data_aniversario) return '';

  const [, rawMonth, rawDay] = String(cliente.data_aniversario).split('-').map(Number);
  if (!rawMonth || !rawDay) return '';

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let alvo = new Date(hoje.getFullYear(), rawMonth - 1, rawDay);
  alvo.setHours(0, 0, 0, 0);
  if (alvo < hoje) alvo = new Date(hoje.getFullYear() + 1, rawMonth - 1, rawDay);

  const dias = Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
  const fmtDia = `${String(rawDay).padStart(2, '0')}/${String(rawMonth).padStart(2, '0')}`;

  if (dias === 0) return '<span class="bdg br">Aniv hoje</span>';
  if (dias <= 7) return `<span class="bdg ba">Aniv ${dias}d</span>`;
  return `<span class="bdg bb">Aniv ${fmtDia}</span>`;
}

function renderOptinBadges(cliente: Cliente): string {
  return [
    cliente.optin_marketing ? '<span class="bdg bg">MKT</span>' : '',
    cliente.optin_email ? '<span class="bdg bk">E-mail</span>' : '',
    cliente.optin_sms ? '<span class="bdg bk">SMS</span>' : ''
  ]
    .filter(Boolean)
    .join('');
}

function renderSegTimeBadges(cliente: Cliente, times: string[]): string {
  return [
    cliente.seg ? `<span class="bdg bk">${esc(cliente.seg)}</span>` : '',
    ...times.map((t) => `<span class="bdg bb">${esc(t)}</span>`)
  ]
    .filter(Boolean)
    .join('');
}

// ---------------------------------------------------------------------------
// Renderizações
// ---------------------------------------------------------------------------

/**
 * Card mobile de um cliente na lista.
 * Função pura: sem DOM, sem estado global.
 */
export function renderClienteListItemMobile(cliente: Cliente): string {
  const cor = avatarColor(cliente.nome);
  const contato = getContatoInfo(cliente);
  const times = parseTimes(cliente.time);
  const tabela = TAB_LABELS[cliente.tab ?? ''] ?? '-';
  const prazo = PRAZO_LABELS[cliente.prazo ?? ''] ?? '-';
  const emailExtraLine =
    cliente.email && !contato.principal.includes(cliente.email)
      ? `<div>${esc(cliente.email)}</div>`
      : '';

  const tags = [
    getBadgeAniversario(cliente),
    contato.badge,
    renderOptinBadges(cliente),
    renderSegTimeBadges(cliente, times)
  ]
    .filter(Boolean)
    .join('');

  return `
<div class="mobile-card" data-id="${esc(cliente.id)}">
  <div class="mobile-card-head">
    <div class="mobile-card-hero">
      <div class="av" style="background:${cor.bg};color:${cor.c}">${esc(initials(cliente.nome))}</div>
      <div class="mobile-card-grow">
        <div class="mobile-card-title">${esc(cliente.nome)}</div>
        ${cliente.apelido ? `<div class="mobile-card-sub">${esc(cliente.apelido)}</div>` : ''}
      </div>
    </div>
    <div>${STATUS_BADGE[cliente.status ?? ''] ?? ''}</div>
  </div>

  <div class="mobile-card-meta mobile-card-meta-gap">
    <div>${esc(contato.principal)}</div>
    ${contato.secundario ? `<div>${esc(contato.secundario)}</div>` : ''}
    ${emailExtraLine}
    <div>${tabela} · ${esc(prazo)}</div>
  </div>

  <div class="mobile-card-tags mobile-card-tags-tight">${tags}</div>

  <div class="mobile-card-actions">
    <button class="btn btn-sm" data-action="detalhe" data-id="${esc(cliente.id)}">Detalhes</button>
    <button class="btn btn-p btn-sm" data-action="editar" data-id="${esc(cliente.id)}">Editar</button>
    <button class="btn btn-sm" data-action="excluir" data-id="${esc(cliente.id)}">Excluir</button>
  </div>
</div>`.trim();
}

/**
 * Linha de tabela desktop de um cliente na lista.
 * Função pura: sem DOM, sem estado global.
 */
export function renderClienteListItemDesktop(cliente: Cliente): string {
  const cor = avatarColor(cliente.nome);
  const contato = getContatoInfo(cliente);
  const times = parseTimes(cliente.time);
  const emailExtraLine =
    cliente.email && !contato.principal.includes(cliente.email)
      ? `<div class="table-cell-caption table-cell-muted">${esc(cliente.email)}</div>`
      : '';

  const anivBadge = getBadgeAniversario(cliente);
  const marketingBadges = renderOptinBadges(cliente);
  const segTimeBadges = renderSegTimeBadges(cliente, times);

  return `
<tr data-id="${esc(cliente.id)}">
  <td><div class="av" style="background:${cor.bg};color:${cor.c}">${esc(initials(cliente.nome))}</div></td>
  <td>
    <div class="table-cell-strong">${esc(cliente.nome)}</div>
    ${cliente.apelido ? `<div class="table-cell-caption table-cell-muted">${esc(cliente.apelido)}</div>` : ''}
  </td>
  <td>
    <div>${esc(contato.principal)}</div>
    ${contato.secundario ? `<div class="table-cell-caption table-cell-muted">${esc(contato.secundario)}</div>` : ''}
    ${emailExtraLine}
  </td>
  <td>
    <div class="fg2 gap-4">
      ${anivBadge || '<span class="table-cell-muted">-</span>'}
      ${contato.badge}
      ${marketingBadges}
    </div>
  </td>
  <td>
    <div class="fg2 gap-4">
      ${segTimeBadges || '-'}
    </div>
  </td>
  <td>${TAB_LABELS[cliente.tab ?? ''] ?? '-'}</td>
  <td class="table-cell-muted">${esc(PRAZO_LABELS[cliente.prazo ?? ''] ?? '-')}</td>
  <td>${STATUS_BADGE[cliente.status ?? ''] ?? ''}</td>
  <td>
    <div class="fg2">
      <button class="btn btn-sm" data-action="detalhe" data-id="${esc(cliente.id)}">Detalhes</button>
      <button class="btn btn-p btn-sm" data-action="editar" data-id="${esc(cliente.id)}">Editar</button>
      <button class="btn btn-sm" data-action="excluir" data-id="${esc(cliente.id)}">Excluir</button>
    </div>
  </td>
</tr>`.trim();
}
