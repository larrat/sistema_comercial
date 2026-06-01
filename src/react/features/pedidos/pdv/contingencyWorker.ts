import { db } from './db';
import { getSupabaseConfig } from '../../../app/supabaseConfig';

let isSyncing = false;

// Transmits a single NFC-e Contingency record
async function transmitContingencyNfce(id: string, xmlString: string): Promise<boolean> {
  const token = localStorage.getItem('supabase.auth.token');
  if (!token) return false;
  
  const { url, key } = getSupabaseConfig();
  
  try {
    const res = await fetch(`${url}/functions/v1/sefaz-transmit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Authorization': `Bearer ${token}`,
        'apikey': key
      },
      body: xmlString
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Erro HTTP ${res.status}`);
    }

    return true;
  } catch (err: any) {
    console.error(`Erro ao transmitir contingência ${id}:`, err);
    await db.nfce_contingencia.update(id, { 
      status: 'erro', 
      motivo_erro: err.message 
    });
    return false;
  }
}

// Background sync loop
export async function syncContingencyQueue() {
  if (isSyncing || typeof navigator === 'undefined' || !navigator.onLine) {
    return;
  }

  isSyncing = true;
  
  try {
    const pending = await db.nfce_contingencia
      .where('status')
      .anyOf('pendente', 'erro')
      .sortBy('criado_em');
      
    if (pending.length === 0) {
      isSyncing = false;
      return;
    }
    
    for (const record of pending) {
      // Check online status mid-loop
      if (!navigator.onLine) break;

      const success = await transmitContingencyNfce(record.id, record.xml_assinado);
      if (success) {
        await db.nfce_contingencia.update(record.id, {
          status: 'transmitido',
          motivo_erro: null
        });
      }
    }
  } catch (error) {
    console.error('Erro na fila de sincronização de contingência:', error);
  } finally {
    isSyncing = false;
  }
}

// Setup listeners to trigger sync when network restores
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncContingencyQueue();
  });
}
