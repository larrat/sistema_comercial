// @ts-check

/** @typedef {import('../types/domain').Cliente} Cliente */

export const ST_B = {
  ativo: '<span class="bdg bg">Ativo</span>',
  inativo: '<span class="bdg bk">Inativo</span>',
  prospecto: '<span class="bdg bb">Prospecto</span>'
};

export const ST_PED = {
  orcamento: '<span class="bdg bk">Orcamento</span>',
  confirmado: '<span class="bdg bb">Confirmado</span>',
  em_separacao: '<span class="bdg ba">Em separaÃ§Ã£o</span>',
  entregue: '<span class="bdg bg">Entregue</span>',
  cancelado: '<span class="bdg br">Cancelado</span>'
};

export const TAB_LABELS = {
  padrao: 'Padrao',
  especial: '<span class="bdg ba">Especial</span>',
  vip: '<span class="bdg br">VIP</span>'
};

export const PRAZO_LABELS = {
  a_vista: 'A vista',
  '7d': '7d',
  '15d': '15d',
  '30d': '30d',
  '60d': '60d'
};

export const PRAZO_DETALHE_LABELS = {
  a_vista: 'A vista',
  '7d': '7 dias',
  '15d': '15 dias',
  '30d': '30 dias',
  '60d': '60 dias'
};

/**
 * @param {Cliente | null | undefined} cliente
 */
export function getContatoInfo(cliente) {
  const whatsapp = String(cliente?.whatsapp || '').trim();
  const tel = String(cliente?.tel || '').trim();
  const email = String(cliente?.email || '').trim();

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
    return {
      principal: email,
      secundario: '',
      badge: '<span class="bdg bb">E-mail</span>'
    };
  }

  return {
    principal: 'Sem contato',
    secundario: '',
    badge: '<span class="bdg br">Sem contato</span>'
  };
}

/**
 * @param {unknown} value
 */
function normTxt(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * @param {string | string[] | null | undefined} value
 */
export function parseTimes(value) {
  const raw = Array.isArray(value) ? value : String(value || '').split(/[,;\n]+/);

  const seen = new Set();
  const out = [];

  raw.forEach((item) => {
    const nome = String(item || '').trim();
    if (!nome) return;
    const key = normTxt(nome);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(nome);
  });

  return out;
}

/**
 * @param {unknown} value
 */
export function normalizePhone(value) {
  return String(value || '').replace(/\D+/g, '');
}

/**
 * @param {unknown} value
 */
export function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

/**
 * @param {unknown} value
 */
export function normalizeDoc(value) {
  return String(value || '')
    .replace(/[^0-9A-Za-z]+/g, '')
    .trim()
    .toLowerCase();
}
