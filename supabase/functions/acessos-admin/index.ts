import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SUPABASE_URL') || '';
const SB_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const APP_ROLES = ['admin', 'gerente', 'operador'] as const;
const ACTIONS = ['perfil_upsert', 'perfil_delete', 'vinculo_upsert', 'vinculo_delete'] as const;

type AccessAction = (typeof ACTIONS)[number];

type RequestBody = {
  action?: string;
  alvo_user_id?: string;
  alvo_filial_id?: string | null;
  alvo_user_nome?: string | null;
  alvo_user_email?: string | null;
  papel?: string | null;
  detalhes?: Record<string, unknown> | null;
};

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

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim()
  );
}

function isAction(value: string): value is AccessAction {
  return (ACTIONS as readonly string[]).includes(value);
}

function normalizeDetalhes(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function normalizeEmail(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true }, 200);
  if (req.method !== 'POST') {
    return json({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } }, 405);
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

  const body = (await req.json().catch(() => null)) as RequestBody | null;
  const action = String(body?.action || '').trim();
  const alvoUserId = String(body?.alvo_user_id || '').trim();
  const alvoFilialId = String(body?.alvo_filial_id || '').trim();
  const alvoUserNome = String(body?.alvo_user_nome || '').trim() || null;
  const alvoUserEmail = normalizeEmail(body?.alvo_user_email || '') || null;
  const papel = String(body?.papel || '').trim();
  const detalhes = normalizeDetalhes(body?.detalhes);

  if (!isAction(action)) {
    return json(
      {
        ok: false,
        error: {
          code: 'INVALID_ACTION',
          message: `Acao invalida. Use uma das opcoes: ${ACTIONS.join(', ')}.`
        }
      },
      400
    );
  }

  if (!isUuid(alvoUserId)) {
    return json(
      {
        ok: false,
        error: { code: 'INVALID_USER_ID', message: 'alvo_user_id deve ser UUID valido.' }
      },
      400
    );
  }

  if (action === 'perfil_upsert' && !(APP_ROLES as readonly string[]).includes(papel)) {
    return json(
      {
        ok: false,
        error: { code: 'INVALID_ROLE', message: `papel invalido. Use: ${APP_ROLES.join(', ')}.` }
      },
      400
    );
  }

  if ((action === 'vinculo_upsert' || action === 'vinculo_delete') && !alvoFilialId) {
    return json(
      {
        ok: false,
        error: { code: 'INVALID_FILIAL_ID', message: 'alvo_filial_id obrigatorio para vinculos.' }
      },
      400
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
          message: 'Somente admin pode executar operacoes administrativas de acesso.'
        }
      },
      403
    );
  }

  if (action === 'perfil_delete' && alvoUserId === userData.user.id) {
    return json(
      {
        ok: false,
        error: {
          code: 'SELF_PROFILE_DELETE_FORBIDDEN',
          message: 'Nao e permitido remover o proprio perfil.'
        }
      },
      409
    );
  }

  if (action === 'vinculo_upsert') {
    const { data: filialRows, error: filialError } = await supabase
      .from('filiais')
      .select('id')
      .eq('id', alvoFilialId)
      .limit(1);

    if (filialError) {
      return json(
        {
          ok: false,
          error: {
            code: 'FILIAL_FETCH_FAILED',
            message: 'Falha ao validar filial alvo.',
            details: filialError.message
          }
        },
        500
      );
    }

    if (!filialRows?.[0]?.id) {
      return json(
        {
          ok: false,
          error: { code: 'FILIAL_NOT_FOUND', message: 'Filial alvo inexistente ou sem acesso.' }
        },
        404
      );
    }
  }

  let operationError: { message?: string } | null = null;
  let operationData: unknown = null;

  if (action === 'perfil_upsert') {
    const result = await supabase
      .from('user_perfis')
      .upsert(
        { user_id: alvoUserId, papel, user_nome: alvoUserNome, user_email: alvoUserEmail },
        { onConflict: 'user_id' }
      )
      .select('user_id,papel,user_nome,user_email,criado_em,atualizado_em')
      .limit(1);
    operationError = result.error;
    operationData = result.data?.[0] || null;
  }

  if (action === 'perfil_delete') {
    const result = await supabase.from('user_perfis').delete().eq('user_id', alvoUserId);
    operationError = result.error;
    operationData = { user_id: alvoUserId, deleted: !result.error };
  }

  if (action === 'vinculo_upsert') {
    const result = await supabase
      .from('user_filiais')
      .upsert(
        {
          user_id: alvoUserId,
          filial_id: alvoFilialId,
          user_nome: alvoUserNome,
          user_email: alvoUserEmail
        },
        { onConflict: 'user_id,filial_id' }
      )
      .select('user_id,filial_id,user_nome,user_email,criado_em')
      .limit(1);
    operationError = result.error;
    operationData = result.data?.[0] || null;
  }

  if (action === 'vinculo_delete') {
    const result = await supabase
      .from('user_filiais')
      .delete()
      .eq('user_id', alvoUserId)
      .eq('filial_id', alvoFilialId);
    operationError = result.error;
    operationData = { user_id: alvoUserId, filial_id: alvoFilialId, deleted: !result.error };
  }

  if (operationError) {
    return json(
      {
        ok: false,
        error: {
          code: 'ACCESS_OPERATION_FAILED',
          message: 'Falha ao executar operacao administrativa de acesso.',
          details: operationError.message
        }
      },
      500
    );
  }

  const recurso = action.startsWith('perfil_') ? 'user_perfis' : 'user_filiais';
  const auditPayload = {
    ator_user_id: userData.user.id,
    acao: action,
    recurso,
    alvo_user_id: alvoUserId,
    alvo_filial_id: alvoFilialId || null,
    detalhes: {
      ...detalhes,
      papel: papel || null,
      user_nome: alvoUserNome,
      user_email: alvoUserEmail,
      via: 'edge_function_acessos_admin_v1'
    }
  };

  const { error: auditError } = await supabase.from('acessos_auditoria').insert(auditPayload);

  if (auditError) {
    return json(
      {
        ok: false,
        error: {
          code: 'AUDIT_INSERT_FAILED',
          message:
            'Operacao executada, mas a auditoria administrativa falhou. Validar consistencia antes de repetir.',
          details: auditError.message
        }
      },
      500
    );
  }

  return json(
    {
      ok: true,
      data: {
        action,
        ator_user_id: userData.user.id,
        alvo_user_id: alvoUserId,
        alvo_filial_id: alvoFilialId || null,
        recurso,
        result: operationData
      }
    },
    200
  );
});
