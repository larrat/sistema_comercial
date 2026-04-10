function normTxt(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseTimes(value) {
  const raw = Array.isArray(value) ? value : String(value || '').split(/[,;\n]+/);
  const seen = new Set();
  const out = [];
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

export function filterClientes(clientes, filtro) {
  const q = normTxt(filtro?.q);
  const seg = filtro?.seg || '';
  const status = filtro?.status || '';

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

    return (
      (!q || termos.includes(q)) &&
      (!seg || cliente.seg === seg) &&
      (!status || cliente.status === status)
    );
  });
}

export function getClienteSegmentos(clientes) {
  return [...new Set(clientes.map((c) => c.seg || 'Sem segmento'))].sort((a, b) =>
    a.localeCompare(b)
  );
}
