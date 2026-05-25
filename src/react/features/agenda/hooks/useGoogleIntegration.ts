import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../app/useAuthStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { toast } from 'sonner';

export function useGoogleIntegration() {
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const config = getSupabaseConfig();
  
  const userId = session?.user?.id;
  const token = session?.access_token;

  const getContext = () => {
    if (!userId || !token || !config.ready) throw new Error('Não autenticado');
    return { url: config.url, key: config.key, token, userId };
  };

  const getIntegration = useQuery({
    queryKey: ['google_integration', userId],
    queryFn: async () => {
      const ctx = getContext();
      const res = await fetch(`${ctx.url}/rest/v1/user_integrations?user_id=eq.${ctx.userId}&provider=eq.google&select=*`, {
        headers: { 'Content-Type': 'application/json', apikey: ctx.key, Authorization: `Bearer ${ctx.token}` }
      });
      if (!res.ok) throw new Error('Erro ao buscar integrações');
      const data = await res.json();
      return data[0] || null;
    },
    enabled: !!userId && !!token && config.ready,
  });

  const saveIntegration = useMutation({
    mutationFn: async ({ accessToken, refreshToken }: { accessToken: string, refreshToken?: string }) => {
      const ctx = getContext();
      const res = await fetch(`${ctx.url}/rest/v1/user_integrations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          apikey: ctx.key, 
          Authorization: `Bearer ${ctx.token}`,
          'Prefer': 'resolution=merge-duplicates' // Faz upsert por causa da constraint UNIQUE (user_id, provider)
        },
        body: JSON.stringify({
          user_id: ctx.userId,
          provider: 'google',
          access_token: accessToken,
          refresh_token: refreshToken,
        })
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google_integration'] });
      // Também invalida o unified_calendar para forçar a recarregar os eventos do Google
      queryClient.invalidateQueries({ queryKey: ['unified_calendar'] });
      toast.success('Google Agenda conectado com sucesso!');
    },
    onError: (e: any) => {
      toast.error('Erro ao salvar integração do Google', { description: e.message });
    }
  });

  return {
    integration: getIntegration.data,
    isLoading: getIntegration.isLoading,
    saveIntegration: saveIntegration.mutateAsync,
  };
}
