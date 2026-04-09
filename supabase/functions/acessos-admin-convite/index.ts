import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SUPABASE_URL') || '';
const SB_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SB_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const APP_INVITE_REDIRECT_TO = Deno.env.get('APP_INVITE_REDIRECT_TO') || '';
const APP_ROLES = ['admin', 'gerente', 'operador'] as const;
const INVITE_ACTIONS = ['invite_and_assign', 'resend_invite'] as const;

type InviteAction = typeof INVITE_ACTIONS[number];

type RequestBody = {
  action?: string | null;
  email?: string;
  nome?: string | null;
  papel?: string | null;
  filial_id?: string | null;
  redirect_to?: string | null;
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

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function isEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function normalizeDetalhes(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function normalizeRedirectUrl(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return url.toString();
  } catch {
    return '';
  }
}

function normalizeInviteAction(value: unknown): InviteAction {
  const raw = String(value || '').trim().toLowerCase();
  return raw === 'resend_invite' ? 'resend_invite' : 'invite_and_assign';
}

async function lookupUserByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string
) {
  const { data, error } = await supabase.rpc('admin_lookup_user_by_email', {
    p_email: email
  });

  if (error) {
    return { data: null, error };
  }

  return {
    data: Array.isArray(data) && data[0] ? data[0] : null,
    error: null
  };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return json({ ok: true }, 200);
  if (req.method !== 'POST') {
    return json({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } }, 405);
  }

  if (!SB_URL || !SB_ANON_KEY || !SB_SERVICE_ROLE_KEY) {
    return json({
      ok: false,
      error: {
        code: 'CONFIG_MISSING',
        message: 'SUPABASE_URL/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY ausentes.'
      }
    }, 500);
  }

  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({
      ok: false,
      error: { code: 'AUTH_MISSING', message: 'Authorization Bearer obrigatorio.' }
    }, 401);
  }

  const supabase = createClient(SB_URL, SB_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });

  const admin = createClient(SB_URL, SB_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return json({
      ok: false,
      error: {
        code: 'AUTH_INVALID',
        message: 'Sessao invalida ou expirada.',
        details: userError?.message || null
      }
    }, 401);
  }

  const body = await req.json().catch(() => null) as RequestBody | null;
  const action = normalizeInviteAction(body?.action);
  const email = normalizeEmail(body?.email);
  const nome = String(body?.nome || '').trim();
  const papel = String(body?.papel || '').trim();
  const filialId = String(body?.filial_id || '').trim();
  const redirectTo = normalizeRedirectUrl(APP_INVITE_REDIRECT_TO) || normalizeRedirectUrl(body?.redirect_to);
  const detalhes = normalizeDetalhes(body?.detalhes);

  if (!isEmail(email)) {
    return json({
      ok: false,
      error: { code: 'INVALID_EMAIL', message: 'Informe um e-mail valido.' }
    }, 400);
  }

  if (!(APP_ROLES as readonly string[]).includes(papel)) {
    return json({
      ok: false,
      error: { code: 'INVALID_ROLE', message: `papel invalido. Use: ${APP_ROLES.join(', ')}.` }
    }, 400);
  }

  const { data: perfilRows, error: perfilError } = await supabase
    .from('user_perfis')
    .select('papel')
    .eq('user_id', userData.user.id)
    .limit(1);

  if (perfilError) {
    return json({
      ok: false,
      error: { code: 'ROLE_FETCH_FAILED', message: 'Falha ao consultar perfil RBAC.', details: perfilError.message }
    }, 500);
  }

  const papelAtor = String(perfilRows?.[0]?.papel || 'operador');
  if (papelAtor !== 'admin') {
    return json({
      ok: false,
      error: { code: 'FORBIDDEN', message: 'Somente admin pode convidar usuarios e configurar acessos.' }
    }, 403);
  }

  if (filialId) {
    const { data: filialRows, error: filialError } = await supabase
      .from('filiais')
      .select('id')
      .eq('id', filialId)
      .limit(1);

    if (filialError) {
      return json({
        ok: false,
        error: { code: 'FILIAL_FETCH_FAILED', message: 'Falha ao validar filial alvo.', details: filialError.message }
      }, 500);
    }

    if (!filialRows?.[0]?.id) {
      return json({
        ok: false,
        error: { code: 'FILIAL_NOT_FOUND', message: 'Filial alvo inexistente ou sem acesso.' }
      }, 404);
    }
  }

  const lookupBefore = await lookupUserByEmail(supabase, email);
  if (lookupBefore.error) {
    return json({
      ok: false,
      error: {
        code: 'USER_LOOKUP_FAILED',
        message: 'Falha ao consultar usuario por e-mail.',
        details: lookupBefore.error.message
      }
    }, 500);
  }

  let invited = false;
  let created = false;
  let invitedUserId = String(lookupBefore.data?.user_id || '').trim();
  const invitePayload = {
    data: nome ? { full_name: nome, name: nome, nome } : {},
    redirectTo: redirectTo || undefined
  };
  const shouldSendInvite = action === 'resend_invite' || !invitedUserId;

  if (shouldSendInvite) {
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      email,
      invitePayload
    );

    if (inviteError) {
      const inviteMessage = String(inviteError.message || '').toLowerCase();
      const alreadyAccepted =
        inviteMessage.includes('already been registered') ||
        inviteMessage.includes('already registered') ||
        inviteMessage.includes('already exists');

      if (alreadyAccepted) {
        return json({
          ok: false,
          error: {
            code: 'INVITE_ALREADY_ACCEPTED',
            message: 'Esse e-mail ja possui uma conta ativa. O convite nao pode ser reenviado; oriente o usuario a entrar normalmente ou redefinir a senha.',
            details: inviteError.message
          }
        }, 409);
      }

      return json({
        ok: false,
        error: {
          code: 'INVITE_FAILED',
          message: action === 'resend_invite'
            ? 'Falha ao reenviar convite por e-mail.'
            : 'Falha ao enviar convite por e-mail.',
          details: inviteError.message
        }
      }, 500);
    }

    invited = true;
    created = !invitedUserId;
    invitedUserId = String(inviteData?.user?.id || invitedUserId || '').trim();
  }

  const lookupAfter = invitedUserId
    ? { data: { user_id: invitedUserId, email, nome: nome || null }, error: null }
    : await lookupUserByEmail(supabase, email);

  if (lookupAfter.error) {
    return json({
      ok: false,
      error: {
        code: 'INVITE_RESOLVE_FAILED',
        message: 'Convite enviado, mas falhou ao resolver o usuario criado.',
        details: lookupAfter.error.message
      }
    }, 500);
  }

  const alvoUserId = String(lookupAfter.data?.user_id || '').trim();
  if (!alvoUserId) {
    return json({
      ok: false,
      error: {
        code: 'USER_ID_MISSING',
        message: 'Nao foi possivel determinar o user_id apos o convite.'
      }
    }, 500);
  }

  const { error: perfilUpsertError } = await supabase
    .from('user_perfis')
    .upsert({
      user_id: alvoUserId,
      papel,
      user_nome: nome || lookupBefore.data?.nome || null,
      user_email: email
    }, { onConflict: 'user_id' });

  if (perfilUpsertError) {
    return json({
      ok: false,
      error: {
        code: 'PROFILE_UPSERT_FAILED',
        message: 'Falha ao salvar perfil do usuario convidado.',
        details: perfilUpsertError.message
      }
    }, 500);
  }

  if (filialId) {
    const { error: vinculoUpsertError } = await supabase
      .from('user_filiais')
      .upsert({
        user_id: alvoUserId,
        filial_id: filialId,
        user_nome: nome || lookupBefore.data?.nome || null,
        user_email: email
      }, { onConflict: 'user_id,filial_id' });

    if (vinculoUpsertError) {
      return json({
        ok: false,
        error: {
          code: 'LINK_UPSERT_FAILED',
          message: 'Falha ao vincular usuario convidado a filial.',
          details: vinculoUpsertError.message
        }
      }, 500);
    }
  }

  const auditPayload = [
    {
      ator_user_id: userData.user.id,
      acao: 'usuario_convite',
      recurso: 'auth.users',
      alvo_user_id: alvoUserId,
      alvo_filial_id: filialId || null,
      detalhes: {
        ...detalhes,
        email,
        nome: nome || null,
        papel,
        action,
        convite_enviado: invited,
        user_created: created,
        via: 'edge_function_acessos_admin_convite_v3'
      }
    },
    {
      ator_user_id: userData.user.id,
      acao: 'perfil_upsert',
      recurso: 'user_perfis',
      alvo_user_id: alvoUserId,
      alvo_filial_id: filialId || null,
      detalhes: {
        email,
        nome: nome || null,
        papel,
        action,
        via: 'edge_function_acessos_admin_convite_v3'
      }
    },
    ...(filialId ? [{
      ator_user_id: userData.user.id,
      acao: 'vinculo_upsert',
      recurso: 'user_filiais',
      alvo_user_id: alvoUserId,
      alvo_filial_id: filialId,
      detalhes: {
        email,
        nome: nome || null,
        papel,
        action,
        via: 'edge_function_acessos_admin_convite_v3'
      }
    }] : [])
  ];

  const { error: auditError } = await supabase
    .from('acessos_auditoria')
    .insert(auditPayload);

  if (auditError) {
    return json({
      ok: false,
      error: {
        code: 'AUDIT_INSERT_FAILED',
        message: 'Convite executado, mas a auditoria administrativa falhou. Validar consistencia antes de repetir.',
        details: auditError.message
      }
    }, 500);
  }

  return json({
    ok: true,
    data: {
      ator_user_id: userData.user.id,
      alvo_user_id: alvoUserId,
      email,
      action,
      nome: nome || lookupBefore.data?.nome || null,
      papel,
      filial_id: filialId || null,
      user_created: created,
      convite_enviado: invited,
      perfil_salvo: true,
      vinculo_salvo: !!filialId
    }
  }, 200);
});
