import { normalizeClienteDoc, normalizeClienteEmail, normalizeClientePhone } from './normalize.js';

function buildChecks(input) {
  return [
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
}

export function findClienteIdentityConflict(input, existingRecords) {
  const checks = buildChecks(input);

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
