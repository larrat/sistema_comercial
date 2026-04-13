import {
  a as e,
  c as t,
  i as n,
  l as r,
  n as i,
  o as a,
  r as o,
  s,
  t as c
} from './bridgeHydration-sFKrWIzA.js';
import { t as l } from './shallow-JxRR1cF2.js';
var u = r(t(), 1),
  d = s(),
  f = {
    emaberto: [`orcamento`, `confirmado`, `em_separacao`],
    entregues: [`entregue`],
    cancelados: [`cancelado`]
  },
  p = { orcamento: `confirmado`, confirmado: `em_separacao`, em_separacao: `entregue` },
  m = { orcamento: `Confirmar`, confirmado: `Separar`, em_separacao: `Entregar` };
function h(e) {
  let t = String(e ?? ``)
    .trim()
    .toLowerCase();
  return t
    ? t === `entregues`
      ? `entregue`
      : t === `cancelados`
        ? `cancelado`
        : t === `em separacao` || t === `em separação`
          ? `em_separacao`
          : t === `orcamento` || t === `orçamento`
            ? `orcamento`
            : t
    : ``;
}
var g = { q: ``, status: `` };
function _(e) {
  let t = f[e.activeTab],
    n = e.pedidos.filter((e) => t.includes(h(e.status)));
  if (e.filtro.q) {
    let t = e.filtro.q.toLowerCase();
    n = n.filter(
      (e) =>
        String(e.cli ?? ``)
          .toLowerCase()
          .includes(t) || String(e.num ?? ``).includes(t)
    );
  }
  return (e.filtro.status && (n = n.filter((t) => h(t.status) === e.filtro.status)), n);
}
var v = a((e) => ({
  pedidos: [],
  status: `idle`,
  error: null,
  activeTab: `emaberto`,
  filtro: { ...g },
  inFlight: new Set(),
  setPedidos: (t) => e({ pedidos: t, status: `ready`, error: null }),
  setStatus: (t, n) => e({ status: t, error: n ?? null }),
  setActiveTab: (t) => e({ activeTab: t, filtro: { ...g } }),
  setFiltro: (t) => e((e) => ({ filtro: { ...e.filtro, ...t } })),
  clearFiltro: () => e({ filtro: { ...g } }),
  upsertPedido: (t) =>
    e((e) => ({
      pedidos: e.pedidos.some((e) => e.id === t.id)
        ? e.pedidos.map((e) => (e.id === t.id ? t : e))
        : [t, ...e.pedidos]
    })),
  setInFlight: (t, n) =>
    e((e) => {
      let r = new Set(e.inFlight);
      return (n ? r.add(t) : r.delete(t), { inFlight: r });
    })
}));
function y(e, t) {
  return { apikey: e, Authorization: `Bearer ${t}`, 'Content-Type': `application/json` };
}
async function b(e) {
  let t = await e.text().catch(() => ``);
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}
function x(e, t, n) {
  if (!e.ok)
    throw t && typeof t == `object` && `message` in t && typeof t.message == `string`
      ? Error(t.message)
      : Error(n);
}
async function S(e) {
  let t = await fetch(
      `${e.url}/rest/v1/pedidos?filial_id=eq.${encodeURIComponent(e.filialId)}&order=num.desc`,
      { headers: y(e.key, e.token), signal: AbortSignal.timeout(12e3) }
    ),
    n = await b(t);
  return (x(t, n, `Erro ${t.status} ao carregar pedidos`), Array.isArray(n) ? n : []);
}
async function C(e, t) {
  let n = { ...t, itens: JSON.stringify(t.itens) },
    r = await fetch(`${e.url}/rest/v1/pedidos`, {
      method: `POST`,
      headers: { ...y(e.key, e.token), Prefer: `resolution=merge-duplicates` },
      body: JSON.stringify(n),
      signal: AbortSignal.timeout(12e3)
    });
  x(r, await b(r), `Erro ${r.status} ao salvar pedido`);
}
async function w(e, t, n) {
  let r = await fetch(
    `${e.url}/rest/v1/pedidos?id=eq.${encodeURIComponent(t)}&filial_id=eq.${encodeURIComponent(e.filialId)}`,
    {
      method: `PATCH`,
      headers: y(e.key, e.token),
      body: JSON.stringify({ status: n }),
      signal: AbortSignal.timeout(12e3)
    }
  );
  x(r, await b(r), `Erro ${r.status} ao atualizar status do pedido`);
}
var T = { '7d': 7, '15d': 15, '30d': 30, '60d': 60 };
function E(e, t) {
  let n = T[t ?? ``];
  if (!n) return null;
  let r = e ? new Date(e + `T00:00:00`) : new Date();
  return (r.setDate(r.getDate() + n), r.toISOString().split(`T`)[0]);
}
async function D(e, t) {
  let n = await fetch(`${e.url}/rest/v1/contas_receber`, {
    method: `POST`,
    headers: {
      apikey: e.key,
      Authorization: `Bearer ${e.token}`,
      'Content-Type': `application/json`,
      Prefer: `resolution=merge-duplicates`
    },
    body: JSON.stringify(t),
    signal: AbortSignal.timeout(12e3)
  });
  if (!n.ok) {
    let e = await n.text().catch(() => ``);
    throw Error(`Falha ao salvar conta a receber: ${n.status} ${e}`);
  }
  window.dispatchEvent(new CustomEvent(`sc:conta-receber-criada`, { detail: t }));
}
async function O(e, t) {
  let n = E(t.data, t.prazo);
  if (!n)
    throw Error(
      `Prazo "${t.prazo || `não definido`}" não gera conta a receber. Use prazo de 7d, 15d, 30d ou 60d no pedido.`
    );
  await D(e, {
    id: globalThis.crypto.randomUUID(),
    filial_id: e.filialId,
    pedido_id: t.pedido_id,
    pedido_num: t.pedido_num ?? null,
    cliente_id: t.cliente_id ?? null,
    cliente: t.cliente,
    valor: t.valor,
    vencimento: n,
    status: `pendente`
  });
}
async function k(e, t, n, r) {
  if (h(n) !== `entregue` || h(r) === `entregue`) return;
  let i = E(t.data, t.prazo);
  if (i)
    try {
      await D(e, {
        id: globalThis.crypto.randomUUID(),
        filial_id: e.filialId,
        pedido_id: t.pedido_id,
        pedido_num: t.pedido_num ?? null,
        cliente_id: t.cliente_id ?? null,
        cliente: t.cliente,
        valor: t.valor,
        vencimento: i,
        status: `pendente`
      });
    } catch (e) {
      console.error(
        `[pedidos-react] Falha ao gerar conta a receber para pedido #${t.pedido_num}:`,
        e
      );
    }
}
function A() {
  let t = v((e) => e.upsertPedido),
    r = v((e) => e.setInFlight),
    i = v((e) => e.inFlight),
    a = n((e) => e.session),
    s = o((e) => e.filialId);
  function c() {
    if (!a?.access_token) throw Error(`Sessão expirada. Faça login novamente.`);
    if (!s) throw Error(`Nenhuma filial selecionada.`);
    let { url: t, key: n, ready: r } = e();
    if (!r) throw Error(`Configuração do Supabase ausente.`);
    return { url: t, key: n, token: a.access_token, filialId: s };
  }
  async function l(e) {
    let n = h(e.status),
      a = p[n];
    if (!a || i.has(e.id)) return;
    let o = c();
    r(e.id, !0);
    try {
      (await w(o, e.id, a),
        t({ ...e, status: a }),
        a === `entregue` &&
          k(
            o,
            {
              pedido_id: e.id,
              pedido_num: e.num ?? 0,
              cliente_id: e.cliente_id ?? null,
              cliente: e.cli ?? ``,
              valor: e.total ?? 0,
              data: e.data,
              prazo: e.prazo
            },
            a,
            n
          ).catch(() => void 0));
    } finally {
      r(e.id, !1);
    }
  }
  async function u(e) {
    let n = h(e.status);
    if (n === `cancelado` || n === `entregue` || i.has(e.id)) return;
    let a = c();
    r(e.id, !0);
    try {
      (await w(a, e.id, `cancelado`), t({ ...e, status: `cancelado` }));
    } finally {
      r(e.id, !1);
    }
  }
  async function d(e) {
    if (h(e.status) !== `cancelado` || i.has(e.id)) return;
    let n = c();
    r(e.id, !0);
    try {
      (await w(n, e.id, `orcamento`), t({ ...e, status: `orcamento` }));
    } finally {
      r(e.id, !1);
    }
  }
  async function f(e) {
    let n = c(),
      r = v.getState().pedidos.find((t) => t.id === e.id),
      i = r ? h(r.status) : ``,
      a = { ...e, filial_id: n.filialId };
    (await C(n, a),
      t(a),
      k(
        n,
        {
          pedido_id: a.id,
          pedido_num: a.num,
          cliente_id: a.cliente_id,
          cliente: a.cli,
          valor: a.total,
          data: a.data,
          prazo: a.prazo
        },
        a.status,
        i
      ).catch(() => void 0));
  }
  async function m(e) {
    let t = c();
    if (i.has(e.id)) return `Operação em andamento...`;
    r(e.id, !0);
    try {
      return (
        await O(t, {
          pedido_id: e.id,
          pedido_num: e.num ?? 0,
          cliente_id: e.cliente_id ?? null,
          cliente: e.cli ?? ``,
          valor: e.total ?? 0,
          data: e.data,
          prazo: e.prazo
        }),
        `Conta a receber gerada com sucesso.`
      );
    } catch (e) {
      return e instanceof Error ? e.message : `Erro ao gerar conta a receber.`;
    } finally {
      r(e.id, !1);
    }
  }
  return {
    avancarStatus: l,
    cancelarPedido: u,
    reabrirPedido: d,
    submitPedido: f,
    gerarContaManual: m,
    inFlight: i
  };
}
var j = i(),
  M = {
    orcamento: `bdg bk`,
    confirmado: `bdg bb`,
    em_separacao: `bdg ba`,
    entregue: `bdg bg`,
    cancelado: `bdg br`
  },
  N = {
    orcamento: `Orçamento`,
    confirmado: `Confirmado`,
    em_separacao: `Em separação`,
    entregue: `Entregue`,
    cancelado: `Cancelado`
  };
function P(e) {
  return (e ?? 0).toLocaleString(`pt-BR`, { style: `currency`, currency: `BRL` });
}
function F({ pedido: e, inFlight: t, onAvancar: n, onCancelar: r, onReabrir: i, onDetalhe: a }) {
  let o = h(e.status),
    s = M[o] ?? `bdg bk`,
    c = N[o] ?? o,
    l = p[o],
    u = m[o];
  return (0, j.jsxs)(`div`, {
    className: `list-row`,
    'data-testid': `pedido-row-${e.id}`,
    children: [
      (0, j.jsxs)(`div`, {
        className: `list-row-main`,
        children: [
          (0, j.jsxs)(`button`, {
            className: `btn-link list-row-title`,
            onClick: () => a(e.id),
            'data-testid': `pedido-row-title-${e.id}`,
            children: [`#`, e.num, ` — `, e.cli || `—`]
          }),
          (0, j.jsx)(`span`, { className: s, children: c }),
          e.data && (0, j.jsx)(`span`, { className: `list-row-meta`, children: e.data }),
          (0, j.jsx)(`span`, { className: `list-row-meta`, children: P(e.total) })
        ]
      }),
      (0, j.jsxs)(`div`, {
        className: `list-row-actions`,
        children: [
          l &&
            u &&
            (0, j.jsx)(`button`, {
              className: `btn btn-sm`,
              disabled: t,
              onClick: n,
              'data-testid': `pedido-acao-avancar-${e.id}`,
              children: t ? `...` : u
            }),
          o !== `cancelado` &&
            o !== `entregue` &&
            (0, j.jsx)(`button`, {
              className: `btn btn-sm btn-danger`,
              disabled: t,
              onClick: r,
              'data-testid': `pedido-acao-cancelar-${e.id}`,
              children: `Cancelar`
            }),
          o === `cancelado` &&
            (0, j.jsx)(`button`, {
              className: `btn btn-sm`,
              disabled: t,
              onClick: i,
              'data-testid': `pedido-acao-reabrir-${e.id}`,
              children: `Reabrir`
            })
        ]
      })
    ]
  });
}
var I = [
    { id: `emaberto`, label: `Em Aberto` },
    { id: `entregues`, label: `Entregues` },
    { id: `cancelados`, label: `Cancelados` }
  ],
  L = [
    { value: ``, label: `Todos` },
    { value: `orcamento`, label: `Orçamento` },
    { value: `confirmado`, label: `Confirmado` },
    { value: `em_separacao`, label: `Em separação` }
  ];
function R({ onNovoPedido: e, onDetalhe: t }) {
  let n = v((e) => e.activeTab),
    r = v((e) => e.setActiveTab),
    i = v((e) => e.filtro),
    a = v((e) => e.setFiltro),
    o = v((e) => e.status),
    s = v((e) => e.error),
    c = v(l(_)),
    { avancarStatus: u, cancelarPedido: d, reabrirPedido: f, inFlight: p } = A();
  return (0, j.jsxs)(`div`, {
    className: `screen-content`,
    'data-testid': `pedido-list-view`,
    children: [
      (0, j.jsx)(`div`, {
        className: `tabs`,
        children: I.map((e) =>
          (0, j.jsx)(
            `button`,
            {
              className: `tb${n === e.id ? ` on` : ``}`,
              onClick: () => r(e.id),
              children: e.label
            },
            e.id
          )
        )
      }),
      (0, j.jsxs)(`div`, {
        className: `card card-shell`,
        children: [
          (0, j.jsxs)(`div`, {
            className: `toolbar toolbar-shell toolbar-shell--section`,
            children: [
              (0, j.jsxs)(`div`, {
                className: `toolbar-main`,
                children: [
                  (0, j.jsx)(`input`, {
                    className: `inp input-w-sm`,
                    placeholder: `Cliente ou número...`,
                    value: i.q,
                    onChange: (e) => a({ q: e.target.value }),
                    'data-testid': `pedido-busca`
                  }),
                  n === `emaberto` &&
                    (0, j.jsx)(`select`, {
                      className: `inp sel select-w-sm`,
                      value: i.status,
                      onChange: (e) => a({ status: e.target.value }),
                      'data-testid': `pedido-filtro-status`,
                      children: L.map((e) =>
                        (0, j.jsx)(`option`, { value: e.value, children: e.label }, e.value)
                      )
                    })
                ]
              }),
              (0, j.jsx)(`div`, {
                className: `toolbar-actions`,
                children: (0, j.jsx)(`button`, {
                  className: `btn btn-sm btn-p`,
                  onClick: e,
                  'data-testid': `pedido-novo-btn`,
                  children: `+ Novo pedido`
                })
              })
            ]
          }),
          o === `loading` &&
            (0, j.jsx)(`div`, {
              className: `empty`,
              'data-testid': `pedido-loading`,
              children: (0, j.jsx)(`p`, { children: `Carregando pedidos...` })
            }),
          o === `error` &&
            (0, j.jsx)(`div`, {
              className: `empty`,
              'data-testid': `pedido-error`,
              children: (0, j.jsx)(`p`, { children: s })
            }),
          o === `ready` &&
            c.length === 0 &&
            (0, j.jsx)(`div`, {
              className: `empty`,
              'data-testid': `pedido-empty`,
              children: (0, j.jsx)(`p`, { children: `Nenhum pedido encontrado.` })
            }),
          o === `ready` &&
            c.length > 0 &&
            (0, j.jsx)(`div`, {
              className: `list`,
              'data-testid': `pedido-list`,
              children: c.map((e) =>
                (0, j.jsx)(
                  F,
                  {
                    pedido: e,
                    inFlight: p.has(e.id),
                    onAvancar: () => void u(e),
                    onCancelar: () => void d(e),
                    onReabrir: () => void f(e),
                    onDetalhe: t
                  },
                  e.id
                )
              )
            })
        ]
      })
    ]
  });
}
async function z(e) {
  let t = await fetch(
      `${e.url}/rest/v1/clientes?filial_id=eq.${encodeURIComponent(e.filialId)}&select=id,nome,rca_id,rca_nome&order=nome`,
      {
        headers: {
          apikey: e.key,
          Authorization: `Bearer ${e.token}`,
          'Content-Type': `application/json`
        },
        signal: AbortSignal.timeout(12e3)
      }
    ),
    n = await t.text().catch(() => ``),
    r = n ? JSON.parse(n) : null;
  if (!t.ok) throw Error(`Erro ${t.status} ao carregar clientes`);
  return Array.isArray(r) ? r : [];
}
function B(e, t) {
  let n = t.trim().toLowerCase();
  return n ? (e.find((e) => e.id === t.trim() || e.nome.trim().toLowerCase() === n) ?? null) : null;
}
async function V(e) {
  let t = await fetch(
      `${e.url}/rest/v1/produtos?filial_id=eq.${encodeURIComponent(e.filialId)}&order=nome`,
      {
        headers: {
          apikey: e.key,
          Authorization: `Bearer ${e.token}`,
          'Content-Type': `application/json`
        },
        signal: AbortSignal.timeout(12e3)
      }
    ),
    n = await t.text().catch(() => ``),
    r = n ? JSON.parse(n) : null;
  if (!t.ok) throw Error(`Erro ${t.status} ao carregar produtos`);
  return Array.isArray(r) ? r : [];
}
async function H(e) {
  let t = await fetch(
      `${e.url}/rest/v1/rcas?filial_id=eq.${encodeURIComponent(e.filialId)}&order=nome`,
      {
        headers: {
          apikey: e.key,
          Authorization: `Bearer ${e.token}`,
          'Content-Type': `application/json`
        },
        signal: AbortSignal.timeout(12e3)
      }
    ),
    n = await t.text().catch(() => ``),
    r = n ? JSON.parse(n) : null;
  if (!t.ok) throw Error(`Erro ${t.status} ao carregar RCAs`);
  return Array.isArray(r) ? r : [];
}
var U = { produtos: [], clientes: [], rcas: [], loading: !1, error: null };
function W() {
  let [t, r] = (0, u.useState)({ ...U, loading: !0 }),
    i = (0, u.useRef)(!1),
    a = n((e) => e.session),
    s = o((e) => e.filialId);
  return (
    (0, u.useEffect)(() => {
      if (i.current) return;
      if (!a?.access_token || !s) {
        r({ ...U, error: `Sessão ou filial ausente.` });
        return;
      }
      let { url: t, key: n, ready: o } = e();
      if (!o) {
        r({ ...U, error: `Configuração do Supabase ausente.` });
        return;
      }
      i.current = !0;
      let c = { url: t, key: n, token: a.access_token, filialId: s };
      Promise.all([V(c), z(c), H(c)])
        .then(([e, t, n]) => {
          r({ produtos: e, clientes: t, rcas: n, loading: !1, error: null });
        })
        .catch((e) => {
          ((i.current = !1),
            r({
              ...U,
              loading: !1,
              error: e instanceof Error ? e.message : `Erro ao carregar dados do formulário.`
            }));
        });
    }, [a, s]),
    t
  );
}
function G(e, t) {
  let n = e.mkv ?? 0,
    r = e.mka ?? 0,
    i = e.pfa ?? 0,
    a = e.custo ?? 0;
  return t === `atacado` && (r > 0 || i > 0)
    ? i > 0
      ? i
      : a * (1 + r / 100)
    : n > 0
      ? a * (1 + n / 100)
      : a;
}
function K({ produtos: e, tipo: t, onAdd: n }) {
  let [r, i] = (0, u.useState)(``),
    [a, o] = (0, u.useState)(`1`),
    [s, c] = (0, u.useState)(``),
    [l, d] = (0, u.useState)(``),
    [f, p] = (0, u.useState)(`estoque`),
    [m, h] = (0, u.useState)(null);
  function g(n) {
    if ((i(n), h(null), !n)) {
      (c(``), d(``));
      return;
    }
    let r = e.find((e) => e.id === n);
    if (!r) return;
    let a = G(r, t);
    (s || c(String(a > 0 ? a.toFixed(2) : ``)),
      l || d(String(r.custo > 0 ? r.custo.toFixed(2) : ``)));
  }
  function _() {
    if (!r) {
      h(`Selecione um produto.`);
      return;
    }
    let u = e.find((e) => e.id === r);
    if (!u) return;
    let m = parseFloat(a) || 1,
      g = parseFloat(s) || G(u, t),
      _ = parseFloat(l) || u.custo || 0;
    (n({
      prodId: r,
      nome: u.nome,
      un: u.un,
      qty: m,
      preco: g,
      custo: _,
      custo_base: u.custo,
      preco_base: G(u, t),
      orig: f
    }),
      i(``),
      o(`1`),
      c(``),
      d(``),
      p(`estoque`),
      h(null));
  }
  return (0, j.jsxs)(`div`, {
    'data-testid': `pedido-item-add`,
    children: [
      m &&
        (0, j.jsx)(`div`, {
          className: `empty-inline`,
          style: { color: `var(--color-danger)` },
          children: m
        }),
      (0, j.jsxs)(`div`, {
        className: `fg c5 form-gap-bottom-xxs`,
        children: [
          (0, j.jsxs)(`div`, {
            children: [
              (0, j.jsx)(`div`, { className: `fl`, children: `Produto` }),
              (0, j.jsxs)(`select`, {
                className: `inp sel`,
                value: r,
                onChange: (e) => g(e.target.value),
                'data-testid': `pedido-item-prod`,
                children: [
                  (0, j.jsx)(`option`, { value: ``, children: `- selecione -` }),
                  e.map((e) => (0, j.jsx)(`option`, { value: e.id, children: e.nome }, e.id))
                ]
              })
            ]
          }),
          (0, j.jsxs)(`div`, {
            children: [
              (0, j.jsx)(`div`, { className: `fl`, children: `Quantidade` }),
              (0, j.jsx)(`input`, {
                className: `inp`,
                type: `number`,
                min: `1`,
                value: a,
                onChange: (e) => o(e.target.value),
                'data-testid': `pedido-item-qty`
              })
            ]
          }),
          (0, j.jsxs)(`div`, {
            children: [
              (0, j.jsx)(`div`, { className: `fl`, children: `Preço unit. (R$)` }),
              (0, j.jsx)(`input`, {
                className: `inp`,
                type: `number`,
                step: `0.01`,
                placeholder: `auto`,
                value: s,
                onChange: (e) => c(e.target.value),
                'data-testid': `pedido-item-preco`
              })
            ]
          }),
          (0, j.jsxs)(`div`, {
            children: [
              (0, j.jsx)(`div`, { className: `fl`, children: `Custo aplicado (R$)` }),
              (0, j.jsx)(`input`, {
                className: `inp`,
                type: `number`,
                step: `0.01`,
                placeholder: `custo do produto`,
                value: l,
                onChange: (e) => d(e.target.value),
                'data-testid': `pedido-item-custo`
              })
            ]
          }),
          (0, j.jsxs)(`div`, {
            children: [
              (0, j.jsx)(`div`, { className: `fl`, children: `Origem` }),
              (0, j.jsxs)(`select`, {
                className: `inp sel`,
                value: f,
                onChange: (e) => p(e.target.value),
                'data-testid': `pedido-item-orig`,
                children: [
                  (0, j.jsx)(`option`, { value: `estoque`, children: `Estoque` }),
                  (0, j.jsx)(`option`, { value: `fornecedor`, children: `Fornecedor` })
                ]
              })
            ]
          })
        ]
      }),
      (0, j.jsx)(`div`, {
        className: `modal-actions modal-actions-inline`,
        children: (0, j.jsx)(`button`, {
          className: `btn btn-sm`,
          type: `button`,
          onClick: _,
          'data-testid': `pedido-item-add-btn`,
          children: `+ Adicionar item`
        })
      })
    ]
  });
}
function q(e) {
  return e.toLocaleString(`pt-BR`, { style: `currency`, currency: `BRL` });
}
function J({ item: e, index: t, readOnly: n, onRemove: r }) {
  let i = e.qty * e.preco,
    a = (e.preco - e.custo) * e.qty,
    o = e.preco > 0 ? ((e.preco - e.custo) / e.preco) * 100 : 0;
  return (0, j.jsxs)(`tr`, {
    'data-testid': `pedido-item-row-${t}`,
    children: [
      (0, j.jsx)(`td`, { className: `table-cell-strong`, children: e.nome }),
      (0, j.jsx)(`td`, {
        children: (0, j.jsx)(`span`, {
          className: `bdg ${e.orig === `estoque` ? `bg` : `bb`}`,
          children: e.orig === `estoque` ? `Estoque` : `Fornecedor`
        })
      }),
      (0, j.jsxs)(`td`, { children: [e.qty, ` `, e.un] }),
      (0, j.jsx)(`td`, { className: `table-cell-muted`, children: q(e.custo) }),
      (0, j.jsx)(`td`, { children: q(e.preco) }),
      (0, j.jsx)(`td`, { className: `table-cell-strong`, children: q(i) }),
      (0, j.jsx)(`td`, {
        className: `table-cell-strong ${a >= 0 ? `table-cell-success` : `table-cell-danger`}`,
        children: q(a)
      }),
      (0, j.jsxs)(`td`, { className: `table-cell-strong`, children: [o.toFixed(1), `%`] }),
      !n &&
        (0, j.jsx)(`td`, {
          children: (0, j.jsx)(`button`, {
            className: `btn btn-sm`,
            type: `button`,
            onClick: () => r?.(t),
            'data-testid': `pedido-item-remove-${t}`,
            children: `Excluir`
          })
        })
    ]
  });
}
function Y(e) {
  return e.toLocaleString(`pt-BR`, { style: `currency`, currency: `BRL` });
}
function X({ itens: e, produtos: t, tipo: n, readOnly: r, onAdd: i, onRemove: a }) {
  let o = e.reduce((e, t) => e + t.qty * t.preco, 0),
    s = e.reduce((e, t) => e + (t.preco - t.custo) * t.qty, 0);
  return (0, j.jsxs)(`div`, {
    'data-testid': `pedido-items-section`,
    children: [
      (0, j.jsx)(`div`, { className: `div` }),
      (0, j.jsx)(`div`, { className: `ct`, children: `Itens do pedido` }),
      !r && i && (0, j.jsx)(K, { produtos: t, tipo: n, onAdd: i }),
      e.length === 0
        ? (0, j.jsx)(`div`, { className: `empty-inline`, children: `Nenhum item.` })
        : (0, j.jsxs)(j.Fragment, {
            children: [
              (0, j.jsx)(`div`, {
                className: `tw ped-items-wrap`,
                children: (0, j.jsxs)(`table`, {
                  className: `tbl ped-items-table`,
                  children: [
                    (0, j.jsx)(`thead`, {
                      children: (0, j.jsxs)(`tr`, {
                        children: [
                          (0, j.jsx)(`th`, { children: `Produto` }),
                          (0, j.jsx)(`th`, { children: `Origem` }),
                          (0, j.jsx)(`th`, { children: `Qtd` }),
                          (0, j.jsx)(`th`, { children: `Custo` }),
                          (0, j.jsx)(`th`, { children: `Preço` }),
                          (0, j.jsx)(`th`, { children: `Subtotal` }),
                          (0, j.jsx)(`th`, { children: `Lucro` }),
                          (0, j.jsx)(`th`, { children: `Margem` }),
                          !r && (0, j.jsx)(`th`, {})
                        ]
                      })
                    }),
                    (0, j.jsx)(`tbody`, {
                      children: e.map((e, t) =>
                        (0, j.jsx)(J, { item: e, index: t, readOnly: r, onRemove: a }, t)
                      )
                    })
                  ]
                })
              }),
              (0, j.jsx)(`div`, {
                className: `panel ped-total-panel`,
                children: (0, j.jsxs)(`div`, {
                  className: `fb`,
                  children: [
                    (0, j.jsx)(`span`, {
                      className: `ped-total-label`,
                      children: `Total do pedido`
                    }),
                    (0, j.jsxs)(`span`, {
                      className: `ped-total-value`,
                      children: [Y(o), ` | Lucro `, Y(s)]
                    })
                  ]
                })
              })
            ]
          })
    ]
  });
}
function Z() {
  return new Date().toISOString().split(`T`)[0];
}
function Q(e) {
  let t = e.map((e) => e.num).filter((e) => typeof e == `number` && !isNaN(e));
  return t.length ? Math.max(...t) + 1 : 1;
}
function ee({ initialPedido: e, onSaved: t, onCancel: n }) {
  let r = v((e) => e.pedidos),
    { submitPedido: i } = A(),
    { produtos: a, clientes: o, rcas: s, loading: c, error: l } = W(),
    d = e
      ? Array.isArray(e.itens)
        ? e.itens
        : (() => {
            try {
              return JSON.parse(e.itens);
            } catch {
              return [];
            }
          })()
      : [],
    [f, p] = (0, u.useState)(e?.cli ?? ``),
    [m, g] = (0, u.useState)(e?.rca_id ?? ``),
    [_, y] = (0, u.useState)(e?.data ?? Z()),
    [b, x] = (0, u.useState)(h(e?.status) || `orcamento`),
    [S, C] = (0, u.useState)(e?.pgto ?? `a_vista`),
    [w, T] = (0, u.useState)(e?.prazo ?? `imediato`),
    [E, D] = (0, u.useState)(e?.tipo ?? `varejo`),
    [O, k] = (0, u.useState)(e?.obs ?? ``),
    [M, N] = (0, u.useState)(d),
    [P, F] = (0, u.useState)(!1),
    [I, L] = (0, u.useState)(null);
  function R(e) {
    N((t) => [...t, e]);
  }
  function z(e) {
    N((t) => t.filter((t, n) => n !== e));
  }
  async function V(n) {
    (n.preventDefault(), L(null));
    let a = f.trim();
    if (!a) {
      L(`Cliente é obrigatório.`);
      return;
    }
    let c = B(o, a);
    if (!c) {
      L(`Cliente inválido. Escolha um cliente cadastrado na lista.`);
      return;
    }
    if (M.length === 0) {
      L(`Adicione ao menos 1 item ao pedido.`);
      return;
    }
    let l = s.find((e) => e.id === m)?.nome ?? c.rca_nome ?? ``,
      u = M.reduce((e, t) => e + t.qty * t.preco, 0),
      d = {
        id: e?.id ?? globalThis.crypto.randomUUID(),
        num: e?.num ?? Q(r),
        cli: c.nome,
        cliente_id: c.id,
        rca_id: m || null,
        rca_nome: l || null,
        data: _,
        status: b,
        pgto: S,
        prazo: w,
        tipo: E,
        obs: O.trim(),
        itens: M,
        total: u
      };
    F(!0);
    try {
      (await i(d), t(d));
    } catch (e) {
      L(e instanceof Error ? e.message : `Erro ao salvar pedido.`);
    } finally {
      F(!1);
    }
  }
  return (0, j.jsxs)(`div`, {
    className: `card card-shell`,
    'data-testid': `pedido-form`,
    children: [
      (0, j.jsx)(`div`, {
        className: `modal-shell-head`,
        children: (0, j.jsx)(`div`, {
          className: `mt`,
          children: e ? `Editar pedido #${e.num}` : `Novo pedido`
        })
      }),
      c &&
        (0, j.jsx)(`div`, {
          className: `empty`,
          children: (0, j.jsx)(`p`, { children: `Carregando dados do formulário...` })
        }),
      l && (0, j.jsx)(`div`, { className: `empty`, children: (0, j.jsx)(`p`, { children: l }) }),
      !c &&
        !l &&
        (0, j.jsxs)(`form`, {
          onSubmit: (e) => void V(e),
          children: [
            (0, j.jsxs)(`div`, {
              className: `modal-shell-body`,
              children: [
                I &&
                  (0, j.jsx)(`div`, {
                    className: `empty-inline`,
                    style: { color: `var(--color-danger)`, marginBottom: `0.5rem` },
                    children: I
                  }),
                (0, j.jsxs)(`div`, {
                  className: `fg c3`,
                  children: [
                    (0, j.jsxs)(`div`, {
                      children: [
                        (0, j.jsx)(`div`, { className: `fl`, children: `Cliente *` }),
                        (0, j.jsx)(`input`, {
                          className: `inp`,
                          list: `ped-form-cli-dl`,
                          placeholder: `Nome do cliente`,
                          value: f,
                          onChange: (e) => p(e.target.value),
                          'data-testid': `pedido-form-cli`
                        }),
                        (0, j.jsx)(`datalist`, {
                          id: `ped-form-cli-dl`,
                          children: o.map((e) => (0, j.jsx)(`option`, { value: e.nome }, e.id))
                        })
                      ]
                    }),
                    (0, j.jsxs)(`div`, {
                      children: [
                        (0, j.jsx)(`div`, { className: `fl`, children: `RCA / Vendedor` }),
                        (0, j.jsxs)(`select`, {
                          className: `inp sel`,
                          value: m,
                          onChange: (e) => g(e.target.value),
                          'data-testid': `pedido-form-rca`,
                          children: [
                            (0, j.jsx)(`option`, { value: ``, children: `Sem RCA` }),
                            s.map((e) =>
                              (0, j.jsx)(`option`, { value: e.id, children: e.nome }, e.id)
                            )
                          ]
                        })
                      ]
                    }),
                    (0, j.jsxs)(`div`, {
                      children: [
                        (0, j.jsx)(`div`, { className: `fl`, children: `Data` }),
                        (0, j.jsx)(`input`, {
                          className: `inp`,
                          type: `date`,
                          value: _,
                          onChange: (e) => y(e.target.value),
                          'data-testid': `pedido-form-data`
                        })
                      ]
                    }),
                    (0, j.jsxs)(`div`, {
                      children: [
                        (0, j.jsx)(`div`, { className: `fl`, children: `Status` }),
                        (0, j.jsxs)(`select`, {
                          className: `inp sel`,
                          value: b,
                          onChange: (e) => x(e.target.value),
                          'data-testid': `pedido-form-status`,
                          children: [
                            (0, j.jsx)(`option`, { value: `orcamento`, children: `Orçamento` }),
                            (0, j.jsx)(`option`, { value: `confirmado`, children: `Confirmado` }),
                            (0, j.jsx)(`option`, {
                              value: `em_separacao`,
                              children: `Em separação`
                            }),
                            (0, j.jsx)(`option`, { value: `entregue`, children: `Entregue` }),
                            (0, j.jsx)(`option`, { value: `cancelado`, children: `Cancelado` })
                          ]
                        })
                      ]
                    })
                  ]
                }),
                (0, j.jsxs)(`div`, {
                  className: `fg c3`,
                  children: [
                    (0, j.jsxs)(`div`, {
                      children: [
                        (0, j.jsx)(`div`, { className: `fl`, children: `Pagamento` }),
                        (0, j.jsxs)(`select`, {
                          className: `inp sel`,
                          value: S,
                          onChange: (e) => C(e.target.value),
                          'data-testid': `pedido-form-pgto`,
                          children: [
                            (0, j.jsx)(`option`, { value: `a_vista`, children: `À vista` }),
                            (0, j.jsx)(`option`, { value: `pix`, children: `PIX` }),
                            (0, j.jsx)(`option`, { value: `boleto`, children: `Boleto` }),
                            (0, j.jsx)(`option`, { value: `cartao`, children: `Cartão` }),
                            (0, j.jsx)(`option`, { value: `cheque`, children: `Cheque` })
                          ]
                        })
                      ]
                    }),
                    (0, j.jsxs)(`div`, {
                      children: [
                        (0, j.jsx)(`div`, { className: `fl`, children: `Prazo` }),
                        (0, j.jsxs)(`select`, {
                          className: `inp sel`,
                          value: w,
                          onChange: (e) => T(e.target.value),
                          'data-testid': `pedido-form-prazo`,
                          children: [
                            (0, j.jsx)(`option`, { value: `imediato`, children: `Imediato` }),
                            (0, j.jsx)(`option`, { value: `7d`, children: `7 dias` }),
                            (0, j.jsx)(`option`, { value: `15d`, children: `15 dias` }),
                            (0, j.jsx)(`option`, { value: `30d`, children: `30 dias` }),
                            (0, j.jsx)(`option`, { value: `60d`, children: `60 dias` })
                          ]
                        })
                      ]
                    }),
                    (0, j.jsxs)(`div`, {
                      children: [
                        (0, j.jsx)(`div`, { className: `fl`, children: `Tipo de venda` }),
                        (0, j.jsxs)(`select`, {
                          className: `inp sel`,
                          value: E,
                          onChange: (e) => D(e.target.value),
                          'data-testid': `pedido-form-tipo`,
                          children: [
                            (0, j.jsx)(`option`, { value: `varejo`, children: `Varejo` }),
                            (0, j.jsx)(`option`, { value: `atacado`, children: `Atacado` })
                          ]
                        })
                      ]
                    })
                  ]
                }),
                (0, j.jsx)(X, { itens: M, produtos: a, tipo: E, onAdd: R, onRemove: z }),
                (0, j.jsx)(`div`, {
                  className: `fg form-gap-top`,
                  children: (0, j.jsxs)(`div`, {
                    children: [
                      (0, j.jsx)(`div`, { className: `fl`, children: `Observações` }),
                      (0, j.jsx)(`textarea`, {
                        className: `inp`,
                        rows: 2,
                        value: O,
                        onChange: (e) => k(e.target.value),
                        'data-testid': `pedido-form-obs`
                      })
                    ]
                  })
                })
              ]
            }),
            (0, j.jsx)(`div`, {
              className: `modal-shell-foot`,
              children: (0, j.jsxs)(`div`, {
                className: `modal-actions`,
                children: [
                  (0, j.jsx)(`button`, {
                    className: `btn`,
                    type: `button`,
                    onClick: n,
                    disabled: P,
                    children: `Cancelar`
                  }),
                  (0, j.jsx)(`button`, {
                    className: `btn btn-p`,
                    type: `submit`,
                    disabled: P,
                    'data-testid': `pedido-form-submit`,
                    children: P ? `Salvando...` : `Salvar pedido`
                  })
                ]
              })
            })
          ]
        })
    ]
  });
}
var te = {
    orcamento: `Orçamento`,
    confirmado: `Confirmado`,
    em_separacao: `Em separação`,
    entregue: `Entregue`,
    cancelado: `Cancelado`
  },
  ne = {
    orcamento: `bdg bk`,
    confirmado: `bdg bb`,
    em_separacao: `bdg ba`,
    entregue: `bdg bg`,
    cancelado: `bdg br`
  },
  re = { a_vista: `À vista`, pix: `PIX`, boleto: `Boleto`, cartao: `Cartão`, cheque: `Cheque` },
  ie = {
    imediato: `Imediato`,
    '7d': `7 dias`,
    '15d': `15 dias`,
    '30d': `30 dias`,
    '60d': `60 dias`
  };
function ae(e) {
  return (e ?? 0).toLocaleString(`pt-BR`, { style: `currency`, currency: `BRL` });
}
function oe(e) {
  if (Array.isArray(e.itens)) return e.itens;
  try {
    let t = JSON.parse(e.itens);
    return Array.isArray(t) ? t : [];
  } catch {
    return [];
  }
}
function se({ pedido: e, onEditar: t, onClose: n }) {
  let {
      avancarStatus: r,
      cancelarPedido: i,
      reabrirPedido: a,
      gerarContaManual: o,
      inFlight: s
    } = A(),
    [c, l] = (0, u.useState)(null),
    d = h(e.status),
    f = ne[d] ?? `bdg bk`,
    g = te[d] ?? d,
    _ = p[d],
    v = m[d],
    y = s.has(e.id),
    b = oe(e);
  return (0, j.jsxs)(`div`, {
    className: `card card-shell`,
    'data-testid': `pedido-detail-panel`,
    children: [
      (0, j.jsxs)(`div`, {
        className: `modal-shell-head`,
        children: [
          (0, j.jsxs)(`div`, {
            children: [
              (0, j.jsxs)(`div`, { className: `mt`, children: [`Pedido #`, e.num] }),
              (0, j.jsxs)(`div`, {
                className: `cli-react-shell__chips`,
                style: { marginTop: `0.25rem` },
                children: [
                  (0, j.jsx)(`span`, { className: f, children: g }),
                  e.data && (0, j.jsx)(`span`, { className: `bdg bk`, children: e.data }),
                  (0, j.jsx)(`span`, { className: `bdg bg`, children: ae(e.total) })
                ]
              })
            ]
          }),
          (0, j.jsxs)(`div`, {
            style: { display: `flex`, gap: `0.5rem`, alignItems: `flex-start` },
            children: [
              (0, j.jsx)(`button`, {
                className: `btn btn-sm`,
                onClick: () => t(e.id),
                'data-testid': `pedido-detail-editar`,
                children: `Editar`
              }),
              (0, j.jsx)(`button`, {
                className: `btn btn-sm`,
                onClick: n,
                'data-testid': `pedido-detail-close`,
                children: `Fechar`
              })
            ]
          })
        ]
      }),
      (0, j.jsxs)(`div`, {
        className: `modal-shell-body`,
        children: [
          (0, j.jsxs)(`div`, {
            className: `fg c3`,
            children: [
              (0, j.jsxs)(`div`, {
                children: [
                  (0, j.jsx)(`div`, { className: `fl`, children: `Cliente` }),
                  (0, j.jsx)(`div`, { className: `fv`, children: e.cli || `—` })
                ]
              }),
              e.rca_nome &&
                (0, j.jsxs)(`div`, {
                  children: [
                    (0, j.jsx)(`div`, { className: `fl`, children: `RCA` }),
                    (0, j.jsx)(`div`, { className: `fv`, children: e.rca_nome })
                  ]
                }),
              (0, j.jsxs)(`div`, {
                children: [
                  (0, j.jsx)(`div`, { className: `fl`, children: `Tipo` }),
                  (0, j.jsx)(`div`, {
                    className: `fv`,
                    children: e.tipo === `atacado` ? `Atacado` : `Varejo`
                  })
                ]
              }),
              (0, j.jsxs)(`div`, {
                children: [
                  (0, j.jsx)(`div`, { className: `fl`, children: `Pagamento` }),
                  (0, j.jsx)(`div`, {
                    className: `fv`,
                    children: re[e.pgto ?? ``] ?? e.pgto ?? `—`
                  })
                ]
              }),
              (0, j.jsxs)(`div`, {
                children: [
                  (0, j.jsx)(`div`, { className: `fl`, children: `Prazo` }),
                  (0, j.jsx)(`div`, {
                    className: `fv`,
                    children: ie[e.prazo ?? ``] ?? e.prazo ?? `—`
                  })
                ]
              }),
              e.obs &&
                (0, j.jsxs)(`div`, {
                  children: [
                    (0, j.jsx)(`div`, { className: `fl`, children: `Obs.` }),
                    (0, j.jsx)(`div`, { className: `fv`, children: e.obs })
                  ]
                })
            ]
          }),
          (0, j.jsx)(X, { itens: b, produtos: [], tipo: e.tipo ?? `varejo`, readOnly: !0 }),
          (0, j.jsxs)(`div`, {
            className: `modal-actions`,
            style: { marginTop: `1rem` },
            children: [
              _ &&
                v &&
                (0, j.jsx)(`button`, {
                  className: `btn btn-sm`,
                  disabled: y,
                  onClick: () => void r(e),
                  'data-testid': `pedido-detail-avancar`,
                  children: y ? `...` : v
                }),
              d !== `cancelado` &&
                d !== `entregue` &&
                (0, j.jsx)(`button`, {
                  className: `btn btn-sm btn-danger`,
                  disabled: y,
                  onClick: () => void i(e),
                  'data-testid': `pedido-detail-cancelar`,
                  children: `Cancelar`
                }),
              d === `cancelado` &&
                (0, j.jsx)(`button`, {
                  className: `btn btn-sm`,
                  disabled: y,
                  onClick: () => void a(e),
                  'data-testid': `pedido-detail-reabrir`,
                  children: `Reabrir`
                }),
              d === `entregue` &&
                (0, j.jsx)(`button`, {
                  className: `btn btn-sm`,
                  disabled: y,
                  onClick: () => {
                    (l(null), o(e).then((e) => l(e)));
                  },
                  'data-testid': `pedido-detail-gerar-conta`,
                  children: y ? `...` : `Gerar A Receber`
                })
            ]
          }),
          c &&
            (0, j.jsx)(`div`, {
              className: `bdg ${c.startsWith(`Conta`) ? `bg` : `br`}`,
              style: { marginTop: `0.5rem`, display: `block`, padding: `0.5rem` },
              children: c
            })
        ]
      })
    ]
  });
}
var ce = `pedidos-react-pilot`,
  le = `pedidos-legacy-shell`;
function ue() {
  let e = v(l((e) => e.pedidos)),
    t = v((e) => e.activeTab),
    n = v((e) => e.setActiveTab),
    r = v((e) => e.filtro),
    i = v((e) => e.clearFiltro),
    a = v((e) => e.status),
    o = v((e) => e.error),
    s = v(l(_)),
    [c, d] = (0, u.useState)(null),
    [f, p] = (0, u.useState)(null),
    m = (0, u.useMemo)(
      () => (c && c !== `new` ? (e.find((e) => e.id === c) ?? null) : null),
      [e, c]
    ),
    h = (0, u.useMemo)(() => (f ? (e.find((e) => e.id === f) ?? null) : null), [e, f]);
  return (
    (0, u.useEffect)(() => {
      function e(e) {
        if (e.origin !== window.location.origin) return;
        let t = e.data;
        if (!(!t || t.source !== le)) {
          if (t.type === `pedidos:set-tab` && t.tab) {
            n(t.tab);
            return;
          }
          if (t.type === `pedidos:limpar-filtros`) {
            i();
            return;
          }
          if (t.type === `pedidos:novo`) {
            (p(null), d(`new`));
            return;
          }
          if (t.type === `pedidos:editar` && t.id) {
            (p(null), d(String(t.id)));
            return;
          }
          if (t.type === `pedidos:detalhe` && t.id) {
            (d(null), p(String(t.id)));
            return;
          }
        }
      }
      return (
        window.addEventListener(`message`, e),
        () => window.removeEventListener(`message`, e)
      );
    }, [n, i]),
    (0, u.useEffect)(() => {
      let n = [r.q, r.status].filter(Boolean).length,
        i = c ? `form` : f ? `detail` : `list`;
      window.postMessage(
        {
          source: ce,
          type: `pedidos:state`,
          state: {
            tab: t,
            view: i,
            status: a === `loading` ? `loading` : o ? `error` : `ready`,
            count: s.length,
            filtersActive: n,
            totalPedidos: e.length,
            selectedId: c === `new` ? `` : c || f || ``,
            selectedNum: m?.num ?? h?.num ?? null
          }
        },
        window.location.origin
      );
    }, [t, a, o, r.q, r.status, s.length, e.length, c, f, m?.num, h?.num]),
    (0, j.jsxs)(`div`, {
      'data-testid': `pedidos-pilot-page`,
      children: [
        (0, j.jsx)(R, {
          onNovoPedido: () => {
            (p(null), d(`new`));
          },
          onDetalhe: (e) => {
            (d(null), p(e));
          }
        }),
        h &&
          !c &&
          (0, j.jsx)(se, {
            pedido: h,
            onEditar: (e) => {
              (p(null), d(e));
            },
            onClose: () => p(null)
          }),
        c &&
          (0, j.jsx)(ee, {
            initialPedido: c === `new` ? null : m,
            onSaved: (e) => {
              (d(null), p(e.id));
            },
            onCancel: () => {
              d(null);
            }
          })
      ]
    })
  );
}
function de(t = {}) {
  let { skip: r = !1 } = t,
    i = v((e) => e.setPedidos),
    a = v((e) => e.setStatus),
    s = n((e) => e.session),
    c = n((e) => e.status),
    l = o((e) => e.filialId),
    d = (0, u.useRef)(!1);
  (0, u.useEffect)(() => {
    if (r || c === `unknown`) return;
    if (c === `unauthenticated` || !s?.access_token) {
      a(`error`, `Sessão expirada. Faça login novamente.`);
      return;
    }
    if (!l) {
      a(`error`, `Nenhuma filial selecionada.`);
      return;
    }
    let { url: t, key: n, ready: o } = e();
    if (!o) {
      a(`error`, `Configuração do Supabase ausente.`);
      return;
    }
    d.current ||
      ((d.current = !0),
      a(`loading`),
      S({ url: t, key: n, token: s.access_token, filialId: l })
        .then((e) => i(e))
        .catch((e) => {
          ((d.current = !1),
            a(`error`, e instanceof Error ? e.message : `Erro ao carregar pedidos.`));
        }));
  }, [r, c, s, l, i, a]);
  function f() {
    if (((d.current = !1), a(`loading`), !s?.access_token || !l)) return;
    let { url: t, key: n, ready: r } = e();
    r &&
      ((d.current = !0),
      S({ url: t, key: n, token: s.access_token, filialId: l })
        .then((e) => i(e))
        .catch((e) => {
          ((d.current = !1),
            a(`error`, e instanceof Error ? e.message : `Erro ao recarregar pedidos.`));
        }));
  }
  return { reload: f };
}
c();
var $ = null;
function fe() {
  let e = n((e) => e.hydrate),
    t = o((e) => e.hydrate);
  return (
    (0, u.useEffect)(() => {
      (t(), e());
    }, [e, t]),
    de(),
    (0, j.jsx)(ue, {})
  );
}
function pe(e) {
  (c(),
    ($ = (0, d.createRoot)(e)),
    $.render((0, j.jsx)(u.StrictMode, { children: (0, j.jsx)(fe, {}) })));
}
function me() {
  $ &&= ($.unmount(), null);
}
window.__SC_PEDIDOS_DIRECT_BRIDGE__ = { mount: pe, unmount: me };
