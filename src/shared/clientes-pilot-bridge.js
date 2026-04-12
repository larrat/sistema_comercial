function normalizeClienteDoc(value) {
  return String(value || '')
    .replace(/[^0-9A-Za-z]+/g, '')
    .trim()
    .toLowerCase();
}

function normalizeClienteEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizeClientePhone(value) {
  return String(value || '').replace(/\D+/g, '');
}

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

function toClientePilotRecord(cliente) {
  return {
    id: String(cliente.id),
    nome: cliente.nome,
    doc: cliente.doc ?? null,
    email: cliente.email ?? null,
    tel: cliente.tel ?? null,
    whatsapp: cliente.whatsapp ?? null
  };
}

function findClienteIdentityConflict(input, existingRecords) {
  const checks = [
    {
      field: 'doc',
      label: 'documento',
      normalizedValue: normalizeClienteDoc(input.doc),
      getExistingValues: (cliente) => [normalizeClienteDoc(cliente.doc)]
    },
    {
      field: 'email',
      label: 'e-mail',
      normalizedValue: normalizeClienteEmail(input.email),
      getExistingValues: (cliente) => [normalizeClienteEmail(cliente.email)]
    },
    {
      field: 'tel',
      label: 'telefone',
      normalizedValue: normalizeClientePhone(input.tel),
      getExistingValues: (cliente) => [
        normalizeClientePhone(cliente.tel),
        normalizeClientePhone(cliente.whatsapp)
      ]
    },
    {
      field: 'whatsapp',
      label: 'WhatsApp',
      normalizedValue: normalizeClientePhone(input.whatsapp),
      getExistingValues: (cliente) => [
        normalizeClientePhone(cliente.tel),
        normalizeClientePhone(cliente.whatsapp)
      ]
    }
  ];

  for (const check of checks) {
    if (!check.normalizedValue) continue;

    const existing = existingRecords.find((cliente) => {
      if (!cliente) return false;
      if (cliente.id && input.id && cliente.id === input.id) return false;

      return check.getExistingValues(cliente).filter(Boolean).includes(check.normalizedValue);
    });

    if (existing) {
      return {
        field: check.field,
        label: check.label,
        normalizedValue: check.normalizedValue,
        existing
      };
    }
  }

  return null;
}

export function checkClienteIdentity(input, existingClientes) {
  return findClienteIdentityConflict(
    toClientePilotRecord(input),
    existingClientes.map(toClientePilotRecord)
  );
}

export function filterClientesFromLegacy(clientes, filtro) {
  const q = normTxt(filtro?.q);
  const seg = String(filtro?.seg || '').trim();
  const segKey = normTxt(seg).replace(/[^a-z0-9]/g, '');
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

    const clienteSeg = cliente.seg || 'Sem segmento';
    const clienteSegKey = normTxt(clienteSeg).replace(/[^a-z0-9]/g, '');
    return (
      (!q || termos.includes(q)) &&
      (!seg || clienteSegKey === segKey) &&
      (!status || cliente.status === status)
    );
  });
}

export function getClienteSegmentosFromLegacy(clientes) {
  return [...new Set(clientes.map((c) => c.seg || 'Sem segmento'))].sort((a, b) =>
    a.localeCompare(b)
  );
}
