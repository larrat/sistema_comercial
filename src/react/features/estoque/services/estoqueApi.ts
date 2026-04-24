import type { Filial, MovimentoEstoque } from '../../../../types/domain';

export type EstoqueApiContext = {
  url: string;
  key: string;
  token: string;
  filialId: string;
};

export type EstoqueTransferInput = {
  originMovement: MovimentoEstoque;
  destinationMovement: MovimentoEstoque;
  destinationFilialId: string;
};

function createHeaders(key: string, token: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function ensureOk(res: Response, body: unknown, fallback: string): void {
  if (res.ok) return;
  if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
    throw new Error(body.message);
  }
  throw new Error(fallback);
}

export async function listMovimentacoes(
  context: EstoqueApiContext
): Promise<MovimentoEstoque[]> {
  const url = `${context.url}/rest/v1/movimentacoes?filial_id=eq.${encodeURIComponent(context.filialId)}&order=ts.asc`;
  const res = await fetch(url, {
    headers: createHeaders(context.key, context.token),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao carregar movimentações`);
  return Array.isArray(body) ? (body as MovimentoEstoque[]) : [];
}

export async function insertMovimentacao(
  context: EstoqueApiContext,
  input: MovimentoEstoque
): Promise<MovimentoEstoque | null> {
  const res = await fetch(`${context.url}/rest/v1/movimentacoes`, {
    method: 'POST',
    headers: {
      ...createHeaders(context.key, context.token),
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      ...input,
      filial_id: context.filialId
    }),
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao salvar movimentação`);
  if (Array.isArray(body) && body[0]) {
    return body[0] as MovimentoEstoque;
  }
  return null;
}

export async function deleteMovimentacao(
  context: EstoqueApiContext,
  movementId: string
): Promise<void> {
  const url = `${context.url}/rest/v1/movimentacoes?id=eq.${encodeURIComponent(movementId)}&filial_id=eq.${encodeURIComponent(context.filialId)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      ...createHeaders(context.key, context.token),
      Prefer: 'return=minimal'
    },
    signal: AbortSignal.timeout(12000)
  });
  const body = await readJson(res);
  ensureOk(res, body, `Erro ${res.status} ao excluir movimentação`);
}

export async function listTransferFiliais(
  context: EstoqueApiContext & { userId: string }
): Promise<Filial[]> {
  const vinculosRes = await fetch(
    `${context.url}/rest/v1/user_filiais?user_id=eq.${encodeURIComponent(context.userId)}&select=filial_id`,
    {
      headers: createHeaders(context.key, context.token),
      signal: AbortSignal.timeout(12000)
    }
  );
  const vinculosBody = await readJson(vinculosRes);
  ensureOk(vinculosRes, vinculosBody, `Erro ${vinculosRes.status} ao carregar vínculos de filial`);

  const ids = Array.isArray(vinculosBody)
    ? [...new Set(vinculosBody.map((item) => String(item?.filial_id || '').trim()).filter(Boolean))]
    : [];

  if (!ids.length) return [];

  const filiaisRes = await fetch(
    `${context.url}/rest/v1/filiais?id=in.(${ids.map((id) => encodeURIComponent(id)).join(',')})&order=criado_em`,
    {
      headers: createHeaders(context.key, context.token),
      signal: AbortSignal.timeout(12000)
    }
  );
  const filiaisBody = await readJson(filiaisRes);
  ensureOk(filiaisRes, filiaisBody, `Erro ${filiaisRes.status} ao carregar filiais`);

  return Array.isArray(filiaisBody) ? (filiaisBody as Filial[]) : [];
}

export async function transferMovimentacao(
  context: EstoqueApiContext,
  input: EstoqueTransferInput
): Promise<void> {
  const destinationContext: EstoqueApiContext = {
    ...context,
    filialId: input.destinationFilialId
  };

  const destinationInserted = await insertMovimentacao(destinationContext, input.destinationMovement);

  try {
    await insertMovimentacao(context, input.originMovement);
  } catch (error) {
    try {
      if (destinationInserted?.id) {
        await deleteMovimentacao(destinationContext, String(destinationInserted.id));
      }
    } catch {
      throw new Error(
        'Falha ao concluir a transferência e não foi possível reverter a entrada na filial destino.'
      );
    }

    if (error instanceof Error) {
      throw new Error(`Falha ao concluir a transferência: ${error.message}. Operação revertida no destino.`);
    }

    throw new Error('Falha ao concluir a transferência. Operação revertida no destino.');
  }
}
