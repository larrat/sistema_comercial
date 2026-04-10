export type ClientePilotRecord = {
  id?: string | null;
  nome: string;
  doc?: string | null;
  email?: string | null;
  tel?: string | null;
  whatsapp?: string | null;
};

export type ClienteIdentityField = 'doc' | 'email' | 'tel' | 'whatsapp';

export type ClienteIdentityConflict = {
  field: ClienteIdentityField;
  label: string;
  normalizedValue: string;
  existing: ClientePilotRecord;
};
