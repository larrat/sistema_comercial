export function fmtDateYYYYMMDD(date: Date | string) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(baseDate: Date | string, days: number) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d;
}

export function parseDateOnly(value: Date | string) {
  if (value instanceof Date) return new Date(value);
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return new Date(raw);
}

export function nextBirthdayDate(birthDate: string, baseDate = new Date()) {
  const b = parseDateOnly(birthDate);
  if (Number.isNaN(b.getTime())) return null;

  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);

  let next = new Date(start.getFullYear(), b.getMonth(), b.getDate());
  next.setHours(0, 0, 0, 0);

  if (next < start) {
    next = new Date(start.getFullYear() + 1, b.getMonth(), b.getDate());
    next.setHours(0, 0, 0, 0);
  }

  return next;
}

export function isBirthdayWithinDays(birthDate: string, baseDate = new Date(), maxDays = 0) {
  const limitDays = Math.max(0, Number(maxDays || 0));
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);

  const end = addDays(start, limitDays);
  end.setHours(23, 59, 59, 999);

  const next = nextBirthdayDate(birthDate, start);
  if (!next) return false;

  return next >= start && next <= end;
}

type CampanhaClienteElegivel = {
  data_aniversario?: string | null;
  optin_email?: boolean | null;
  email?: string | null;
  optin_sms?: boolean | null;
  tel?: string | null;
  optin_marketing?: boolean | null;
  whatsapp?: string | null;
};

type CampanhaMensagemInput = {
  mensagem?: string | null;
  cliente?: {
    nome?: string | null;
    apelido?: string | null;
  } | null;
  campanha?: {
    desconto?: number | string | null;
    cupom?: string | null;
  } | null;
  validade?: Date | string | null;
};

export function filtrarClientesElegiveisCampanhaAniversario(
  clientes: CampanhaClienteElegivel[] = [],
  campanha: { dias_antecedencia?: number | string | null; canal?: string | null } | null,
  baseDate = new Date()
) {
  const dias = Number(campanha?.dias_antecedencia || 0);
  const canal = String(campanha?.canal || '');

  return (clientes || []).filter((c) => {
    if (!c?.data_aniversario) return false;
    if (!isBirthdayWithinDays(c.data_aniversario, baseDate, dias)) return false;

    if (canal === 'email') return !!c.optin_email && !!c.email;
    if (canal === 'sms') return !!c.optin_sms && !!c.tel;
    if (canal === 'whatsapp_manual') return !!c.optin_marketing && !!(c.whatsapp || c.tel);

    return !!c.optin_marketing;
  });
}

export function montarMensagemCampanha({
  mensagem,
  cliente,
  campanha,
  validade = null
}: CampanhaMensagemInput) {
  let txt = String(mensagem || '');

  const desconto = campanha?.desconto ? `${Number(campanha.desconto)}%` : '';
  const cupom = campanha?.cupom || '';
  const nome = cliente?.nome || '';
  const apelido = cliente?.apelido || nome;
  const validadeFmt = validade
    ? fmtDateYYYYMMDD(validade)
    : fmtDateYYYYMMDD(addDays(new Date(), 7));

  txt = txt.replaceAll('{{nome}}', nome);
  txt = txt.replaceAll('{{apelido}}', apelido);
  txt = txt.replaceAll('{{desconto}}', desconto);
  txt = txt.replaceAll('{{cupom}}', cupom);
  txt = txt.replaceAll('{{validade}}', validadeFmt);

  return txt;
}
