import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SUPABASE_URL') || '';
const SB_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const DEFAULT_AUDIT_LIMIT = 100;
const MAX_AUDIT_LIMIT = 500;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
    }
  });
}

function clampLimit(value: string | null) {
  const parsed = Number(value || DEFAULT_AUDIT_LIMIT);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_AUDIT_LIMIT;
  return Math.min(MAX_AUDIT_LIMIT, Math.max(1, Math.floor(parsed)));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true }, 200);
  if (req.method !== 'GET') {
    return json({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' } }, 405);
  }

  if (!SB_URL || !SB_ANON_KEY) {
    return json(
      {
        ok: false,
        error: { code: 'CONFIG_MISSING', message: 'SUPABASE_URL/SUPABASE_ANON_KEY ausentes.' }
      },
      500
    );
  }

  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return json(
      {
        ok: false,
        error: { code: 'AUTH_MISSING', message: 'Authorization Bearer obrigatorio.' }
      },
      401
    );
  }

  const supabase = createClient(SB_URL, SB_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return json(
      {
        ok: false,
        error: {
          code: 'AUTH_INVALID',
          message: 'Sessao invalida ou expirada.',
          details: userError?.message || null
        }
      },
      401
    );
  }

  const { data: perfilRows, error: perfilError } = await supabase
    .from('user_perfis')
    .select('papel')
    .eq('user_id', userData.user.id)
    .limit(1);

  if (perfilError) {
    return json(
      {
        ok: false,
        error: {
          code: 'ROLE_FETCH_FAILED',
          message: 'Falha ao consultar perfil RBAC.',
          details: perfilError.message
        }
      },
      500
    );
  }

  const papelAtor = String(perfilRows?.[0]?.papel || 'operador');
  if (papelAtor !== 'admin') {
    return json(
      {
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Somente admin pode consultar a leitura administrativa agregada.'
        }
      },
      403
    );
  }

  const url = new URL(req.url);
  const auditoriaLimit = clampLimit(url.searchParams.get('auditoria_limit'));

  const [perfisResult, vinculosResult, filiaisResult, auditoriaResult] = await Promise.all([
    supabase
      .from('user_perfis')
      .select('user_id,papel,user_nome,user_email,criado_em,atualizado_em')
      .order('atualizado_em', { ascending: false }),
    supabase
      .from('user_filiais')
      .select('user_id,filial_id,user_nome,user_email,criado_em')
      .order('criado_em', { ascending: false }),
    supabase
      .from('filiais')
      .select('id,nome,cidade,estado,cor,criado_em')
      .order('criado_em', { ascending: true }),
    supabase
      .from('acessos_auditoria')
      .select('id,ator_user_id,acao,recurso,alvo_user_id,alvo_filial_id,detalhes,criado_em')
      .order('criado_em', { ascending: false })
      .limit(auditoriaLimit)
  ]);

  const failed = [
    ['perfis', perfisResult.error],
    ['vinculos', vinculosResult.error],
    ['filiais', filiaisResult.error],
    ['auditoria', auditoriaResult.error]
  ].find(([, err]) => !!err);

  if (failed) {
    return json(
      {
        ok: false,
        error: {
          code: 'ACCESS_READ_FAILED',
          message: `Falha ao consultar leitura administrativa agregada em ${failed[0]}.`,
          details: failed[1]?.message || null
        }
      },
      500
    );
  }

  return json(
    {
      ok: true,
      data: {
        ator_user_id: userData.user.id,
        papel: papelAtor,
        perfis: perfisResult.data || [],
        vinculos: vinculosResult.data || [],
        filiais: filiaisResult.data || [],
        auditoria: auditoriaResult.data || [],
        auditoria_limit: auditoriaLimit
      }
    },
    200
  );
});
