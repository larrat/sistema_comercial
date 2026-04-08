import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { filtrarClientesElegiveisCampanhaAniversario, montarMensagemCampanha } from '../_shared/campanhas-domain.ts';

const SB_URL = Deno.env.get('SUPABASE_URL') || '';
const SB_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function uid() {
  return crypto.randomUUID();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true }, 200);
  if (req.method !== 'POST') return json({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } }, 405);

  if (!SB_URL || !SB_ANON_KEY) {
    return json({
      ok: false,
      error: { code: 'CONFIG_MISSING', message: 'SUPABASE_URL/SUPABASE_ANON_KEY ausentes.' }
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

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return json({
      ok: false,
      error: { code: 'AUTH_INVALID', message: 'Sessao invalida ou expirada.', details: userError?.message || null }
    }, 401);
  }

  const body = await req.json().catch(() => null);
  const campanhaId = String(body?.campanha_id || '').trim();
  const dryRun = body?.dry_run === true;

  if (!campanhaId) {
    return json({
      ok: false,
      error: { code: 'INVALID_INPUT', message: 'campanha_id obrigatorio.' }
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

  const papel = String(perfilRows?.[0]?.papel || 'operador');
  if (!['admin', 'gerente'].includes(papel)) {
    return json({
      ok: false,
      error: { code: 'FORBIDDEN', message: 'Somente gerente/admin pode gerar fila de campanha.' }
    }, 403);
  }

  const { data: campanhaRows, error: campanhaError } = await supabase
    .from('campanhas')
    .select('*')
    .eq('id', campanhaId)
    .limit(1);

  if (campanhaError) {
    return json({
      ok: false,
      error: { code: 'CAMPANHA_FETCH_FAILED', message: 'Falha ao carregar campanha.', details: campanhaError.message }
    }, 500);
  }

  const campanha = campanhaRows?.[0];
  if (!campanha) {
    return json({
      ok: false,
      error: { code: 'CAMPANHA_NOT_FOUND', message: 'Campanha nao encontrada ou sem acesso.' }
    }, 404);
  }

  if (!campanha.ativo) {
    return json({
      ok: false,
      error: { code: 'CAMPANHA_INACTIVE', message: 'Campanha inativa.' }
    }, 409);
  }

  const { data: clientes, error: clientesError } = await supabase
    .from('clientes')
    .select('*')
    .eq('filial_id', campanha.filial_id)
    .not('data_aniversario', 'is', null)
    .order('nome');

  if (clientesError) {
    return json({
      ok: false,
      error: { code: 'CLIENTES_FETCH_FAILED', message: 'Falha ao consultar clientes elegiveis.', details: clientesError.message }
    }, 500);
  }

  const elegiveis = filtrarClientesElegiveisCampanhaAniversario(clientes || [], campanha, new Date());
  const dataRef = todayIso();

  if (!elegiveis.length) {
    return json({
      ok: true,
      data: {
        campanha_id: campanha.id,
        filial_id: campanha.filial_id,
        dry_run: dryRun,
        criados: 0,
        ignorados: 0,
        falhas: 0,
        total_elegiveis: 0
      }
    }, 200);
  }

  const clienteIds = elegiveis.map((c) => c.id);
  const { data: enviosExistentes, error: enviosError } = await supabase
    .from('campanha_envios')
    .select('cliente_id, canal, data_ref')
    .eq('campanha_id', campanha.id)
    .eq('canal', campanha.canal)
    .eq('data_ref', dataRef)
    .in('cliente_id', clienteIds);

  if (enviosError) {
    return json({
      ok: false,
      error: { code: 'ENVIOS_FETCH_FAILED', message: 'Falha ao consultar duplicidades de envio.', details: enviosError.message }
    }, 500);
  }

  const existingKeys = new Set(
    (enviosExistentes || []).map((e) => `${e.cliente_id}|${e.canal}|${e.data_ref}`)
  );

  const enviosParaInserir = [];
  let ignorados = 0;

  for (const cliente of elegiveis) {
    const destino =
      campanha.canal === 'email' ? (cliente.email || null) :
      campanha.canal === 'sms' ? (cliente.tel || null) :
      (cliente.whatsapp || cliente.tel || null);

    if (!destino) {
      ignorados++;
      continue;
    }

    const dupKey = `${cliente.id}|${campanha.canal}|${dataRef}`;
    if (existingKeys.has(dupKey)) {
      ignorados++;
      continue;
    }

    enviosParaInserir.push({
      id: uid(),
      filial_id: campanha.filial_id,
      campanha_id: campanha.id,
      cliente_id: cliente.id,
      canal: campanha.canal,
      destino,
      mensagem: montarMensagemCampanha({
        mensagem: campanha.mensagem,
        cliente,
        campanha
      }),
      status: campanha.canal === 'whatsapp_manual' ? 'manual' : 'pendente',
      data_ref: dataRef
    });
  }

  if (dryRun) {
    return json({
      ok: true,
      data: {
        campanha_id: campanha.id,
        filial_id: campanha.filial_id,
        dry_run: true,
        criados: enviosParaInserir.length,
        ignorados,
        falhas: 0,
        total_elegiveis: elegiveis.length
      }
    }, 200);
  }

  if (!enviosParaInserir.length) {
    return json({
      ok: true,
      data: {
        campanha_id: campanha.id,
        filial_id: campanha.filial_id,
        dry_run: false,
        criados: 0,
        ignorados,
        falhas: 0,
        total_elegiveis: elegiveis.length
      }
    }, 200);
  }

  const { error: insertError } = await supabase
    .from('campanha_envios')
    .insert(enviosParaInserir);

  if (insertError) {
    return json({
      ok: false,
      error: { code: 'ENVIOS_INSERT_FAILED', message: 'Falha ao persistir fila de campanha.', details: insertError.message }
    }, 500);
  }

  return json({
    ok: true,
    data: {
      campanha_id: campanha.id,
      filial_id: campanha.filial_id,
      dry_run: false,
      criados: enviosParaInserir.length,
      ignorados,
      falhas: 0,
      total_elegiveis: elegiveis.length
    }
  }, 200);
});
