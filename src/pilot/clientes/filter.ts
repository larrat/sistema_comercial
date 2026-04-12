import type { Cliente } from '../../types/domain';

export type ClienteFiltro = {
  q?: string;
  seg?: string;
  status?: string;
};

function normTxt(value: string | null | undefined): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseTimes(value: string | string[] | null | undefined): string[] {
  const raw = Array.isArray(value) ? value : String(value || '').split(/[,;\n]+/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const nome = String(item || '').trim();
    if (!nome) continue;
    const key = normTxt(nome);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(nome);
  }
  return out;
}

export function filterClientes(clientes: Cliente[], filtro: ClienteFiltro): Cliente[] {
  const q = normTxt(filtro.q);
  const seg = String(filtro.seg || '').trim();
  const segKey = normTxt(seg).replace(/[^a-z0-9]/g, '');
  const status = filtro.status || '';

  return clientes.filter((cliente) => {
    const termos = [
      cliente.nome,
      cliente.apelido,
      cliente.seg,
      cliente.resp,
      cliente.email,
      cliente.tel,
      cliente.whatsapp,
      parseTimes(cliente.time).join(' ')
    ]
      .map(normTxt)
      .join(' ');

    const clienteSeg = cliente.seg || 'Sem segmento';
    const clienteSegKey = normTxt(clienteSeg).replace(/[^a-z0-9]/g, '');
    return (
      (!q || termos.includes(q)) &&
      (!seg || clienteSegKey === segKey) &&
      (!status || cliente.status === status)
    );
  });
}

export function getClienteSegmentos(clientes: Cliente[]): string[] {
  return [...new Set(clientes.map((c) => c.seg || 'Sem segmento'))].sort((a, b) =>
    a.localeCompare(b)
  );
}
