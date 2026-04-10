export function normalizeClienteDoc(value: string | null | undefined): string {
  return String(value || '')
    .replace(/[^0-9A-Za-z]+/g, '')
    .trim()
    .toLowerCase();
}

export function normalizeClienteEmail(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function normalizeClientePhone(value: string | null | undefined): string {
  return String(value || '').replace(/\D+/g, '');
}
