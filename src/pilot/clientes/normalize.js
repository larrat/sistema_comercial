export function normalizeClienteDoc(value) {
  return String(value || '')
    .replace(/[^0-9A-Za-z]+/g, '')
    .trim()
    .toLowerCase();
}

export function normalizeClienteEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function normalizeClientePhone(value) {
  return String(value || '').replace(/\D+/g, '');
}
