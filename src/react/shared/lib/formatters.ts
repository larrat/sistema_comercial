/**
 * Global Formatters
 * Centralized formatting utilities to ensure consistency across the application.
 */

export const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function fmtBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return BRL.format(0);
  }
  return BRL.format(value);
}

export function fmtDate(isoString: string | null | undefined, includeTime = false): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    
    if (includeTime) {
      return d.toLocaleString('pt-BR', { 
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    }
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  } catch {
    return '—';
  }
}

export function fmtNumber(value: number | null | undefined, minimumFractionDigits = 0): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString('pt-BR', { minimumFractionDigits, maximumFractionDigits: minimumFractionDigits === 0 ? 2 : minimumFractionDigits });
}
