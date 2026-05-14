import { getSupabaseConfig } from '../../app/supabaseConfig';

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'SOFT_DELETE';

export async function logAudit(
  token: string,
  entityType: string,
  entityId: string,
  action: AuditAction,
  newData: any = null,
  oldData: any = null
) {
  const { url, key } = getSupabaseConfig();

  try {
    const res = await fetch(`${url}/rest/v1/logs_auditoria`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        entity_type: entityType,
        entity_id: entityId,
        action,
        new_data: newData,
        old_data: oldData
      })
    });

    if (!res.ok) {
      console.warn('[audit] Falha ao registrar log de auditoria:', await res.text());
    }
  } catch (err) {
    console.error('[audit] Erro crítico na auditoria:', err);
  }
}
