import { useAuthStore } from '../../app/useAuthStore';
import { useFilialStore } from '../../app/useFilialStore';
import { getSupabaseConfig } from '../../app/supabaseConfig';

export function useApiContext() {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);

  const resolve = () => {
    if (!session?.access_token || !filialId) return null;
    const { url, key, ready } = getSupabaseConfig();
    if (!ready) return null;
    return { url, key, token: session.access_token, filialId };
  };

  return {
    resolve,
    filialId,
    token: session?.access_token
  };
}
