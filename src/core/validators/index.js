// @ts-check

import { ValidationError } from '../errors/app-error.js';

/**
 * Validadores reutilizáveis de domínio.
 *
 * PROBLEMA ATUAL:
 *   Validações de negócio estão embutidas nos handlers de save (salvarProduto,
 *   salvarCliente, etc.) misturadas com lógica de UI. Isso:
 *   - Impede reuso entre módulos
 *   - Dificulta testes unitários
 *   - Oculta as regras de negócio no meio do código de apresentação
 *
 * SOLUÇÃO:
 *   Funções puras que recebem dados e lançam ValidationError se inválido,
 *   ou retornam os dados normalizados se válidos.
 *   Mesma API usada no frontend e pode ser portada para Edge Functions.
 */

// ── Helpers primitivos ────────────────────────────────────────────────────────

/**
 * @param {unknown} v
 * @returns {boolean}
 */
export function isPresent(v){
  if(v == null) return false;
  if(typeof v === 'string') return v.trim().length > 0;
  return true;
}

/**
 * @param {unknown} v
 * @param {number} [min]
 * @param {number} [max]
 * @returns {boolean}
 */
export function isNumberInRange(v, min, max){
  const n = Number(v);
  if(Number.isNaN(n)) return false;
  if(min !== undefined && n < min) return false;
  if(max !== undefined && n > max) return false;
  return true;
}

/**
 * @param {unknown} v
 * @returns {boolean}
 */
export function isValidEmail(v){
  if(!isPresent(v)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
}

// ── Validador de produto ──────────────────────────────────────────────────────

/**
 * @param {Record<string, unknown>} data
 * @returns {{ nome: string, custo: number, sku?: string }}
 */
export function validateProduto(data){
  if(!isPresent(data.nome)){
    throw new ValidationError({
      message: 'Nome do produto obrigatório',
      userMessage: 'Informe o nome do produto.',
      code: 'PRODUTO_NOME_REQUIRED',
      field: 'nome'
    });
  }

  const custo = Number(data.custo ?? 0);
  if(!isNumberInRange(custo, 0)){
    throw new ValidationError({
      message: `Custo inválido: ${data.custo}`,
      userMessage: 'O custo deve ser um número maior ou igual a zero.',
      code: 'PRODUTO_CUSTO_INVALID',
      field: 'custo'
    });
  }

  return {
    nome: String(data.nome).trim(),
    custo,
    sku: data.sku ? String(data.sku).trim() : undefined
  };
}

// ── Validador de cliente ──────────────────────────────────────────────────────

/**
 * @param {Record<string, unknown>} data
 * @returns {{ nome: string, email?: string, tel?: string, whatsapp?: string }}
 */
export function validateCliente(data){
  if(!isPresent(data.nome)){
    throw new ValidationError({
      message: 'Nome do cliente obrigatório',
      userMessage: 'Informe o nome do cliente.',
      code: 'CLIENTE_NOME_REQUIRED',
      field: 'nome'
    });
  }

  const email = data.email ? String(data.email).trim().toLowerCase() : undefined;
  if(email && !isValidEmail(email)){
    throw new ValidationError({
      message: `Email inválido: ${email}`,
      userMessage: 'O e-mail informado é inválido.',
      code: 'CLIENTE_EMAIL_INVALID',
      field: 'email'
    });
  }

  return {
    nome: String(data.nome).trim(),
    email,
    tel:      data.tel      ? String(data.tel).trim()      : undefined,
    whatsapp: data.whatsapp ? String(data.whatsapp).trim() : undefined
  };
}

// ── Validador de pedido ───────────────────────────────────────────────────────

/**
 * @param {Record<string, unknown>} data
 * @param {{ items: unknown[] }} deps
 * @returns {{ cliente_id?: string, itens: unknown[] }}
 */
export function validatePedido(data, deps){
  if(!deps.items || deps.items.length === 0){
    throw new ValidationError({
      message: 'Pedido sem itens',
      userMessage: 'Adicione pelo menos um item ao pedido.',
      code: 'PEDIDO_ITENS_REQUIRED'
    });
  }

  return {
    cliente_id: data.cliente_id ? String(data.cliente_id) : undefined,
    itens: deps.items
  };
}

// ── Validador de campanha ─────────────────────────────────────────────────────

/**
 * @param {Record<string, unknown>} data
 * @returns {{ nome: string, canal: string, mensagem: string }}
 */
export function validateCampanha(data){
  if(!isPresent(data.nome)){
    throw new ValidationError({
      message: 'Nome da campanha obrigatório',
      userMessage: 'Informe o nome da campanha.',
      code: 'CAMPANHA_NOME_REQUIRED',
      field: 'nome'
    });
  }

  if(!isPresent(data.canal)){
    throw new ValidationError({
      message: 'Canal da campanha obrigatório',
      userMessage: 'Selecione o canal de envio.',
      code: 'CAMPANHA_CANAL_REQUIRED',
      field: 'canal'
    });
  }

  if(!isPresent(data.mensagem)){
    throw new ValidationError({
      message: 'Mensagem da campanha obrigatória',
      userMessage: 'Defina a mensagem da campanha.',
      code: 'CAMPANHA_MENSAGEM_REQUIRED',
      field: 'mensagem'
    });
  }

  return {
    nome:     String(data.nome).trim(),
    canal:    String(data.canal).trim(),
    mensagem: String(data.mensagem).trim()
  };
}

// ── Validador de movimentação de estoque ─────────────────────────────────────

/**
 * @param {Record<string, unknown>} data
 * @returns {{ prod_id: string, tipo: string, qty?: number, saldo_real?: number }}
 */
export function validateMovimentacao(data){
  if(!isPresent(data.prod_id)){
    throw new ValidationError({
      message: 'Produto da movimentação obrigatório',
      userMessage: 'Selecione o produto.',
      code: 'MOV_PRODUTO_REQUIRED',
      field: 'prod_id'
    });
  }

  const tipo = String(data.tipo || '').trim();
  const tiposValidos = ['entrada', 'saida', 'ajuste', 'transf'];
  if(!tiposValidos.includes(tipo)){
    throw new ValidationError({
      message: `Tipo de movimentação inválido: ${tipo}`,
      userMessage: 'Selecione um tipo de movimentação válido.',
      code: 'MOV_TIPO_INVALID',
      field: 'tipo'
    });
  }

  if(tipo === 'ajuste'){
    const saldo = Number(data.saldo_real ?? data.saldoReal);
    if(Number.isNaN(saldo) || saldo < 0){
      throw new ValidationError({
        message: `Saldo real inválido para ajuste: ${data.saldo_real}`,
        userMessage: 'Informe um saldo real válido (maior ou igual a zero).',
        code: 'MOV_SALDO_INVALID',
        field: 'saldo_real'
      });
    }
    return { prod_id: String(data.prod_id), tipo, saldo_real: saldo };
  }

  const qty = Number(data.qty);
  if(Number.isNaN(qty) || qty <= 0){
    throw new ValidationError({
      message: `Quantidade inválida: ${data.qty}`,
      userMessage: 'Informe uma quantidade maior que zero.',
      code: 'MOV_QTY_INVALID',
      field: 'qty'
    });
  }

  return { prod_id: String(data.prod_id), tipo, qty };
}
