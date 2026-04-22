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
import { a as u, n as d, r as f } from './contasReceberApi-B1L-rMBw.js';
var p = r(t(), 1),
  m = s(),
  h = {
    emaberto: [`orcamento`, `confirmado`, `em_separacao`],
    entregues: [`entregue`],
    cancelados: [`cancelado`]
  },
  g = { orcamento: `confirmado`, confirmado: `em_separacao`, em_separacao: `entregue` },
  _ = { orcamento: `Confirmar`, confirmado: `Separar`, em_separacao: `Entregar` };
function v(e) {
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
var y = { q: ``, status: `` };
function b(e) {
  let t = h[e.activeTab],
    n = e.pedidos.filter((e) => t.includes(v(e.status)));
  if (e.filtro.q) {
    let t = e.filtro.q.toLowerCase();
    n = n.filter(
      (e) =>
        String(e.cli ?? ``)
          .toLowerCase()
          .includes(t) || String(e.num ?? ``).includes(t)
    );
  }
  return (e.filtro.status && (n = n.filter((t) => v(t.status) === e.filtro.status)), n);
}
var x = a((e) => ({
  pedidos: [],
  status: `idle`,
  error: null,
  activeTab: `emaberto`,
  filtro: { ...y },
  inFlight: new Set(),
  setPedidos: (t) => e({ pedidos: t, status: `ready`, error: null }),
  setStatus: (t, n) => e({ status: t, error: n ?? null }),
  setActiveTab: (t) => e({ activeTab: t, filtro: { ...y } }),
  setFiltro: (t) => e((e) => ({ filtro: { ...e.filtro, ...t } })),
  clearFiltro: () => e({ filtro: { ...y } }),
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
function S(e, t) {
  return { apikey: e, Authorization: `Bearer ${t}`, 'Content-Type': `application/json` };
}
async function C(e) {
  let t = await e.text().catch(() => ``);
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}
function w(e, t, n) {
  if (!e.ok)
    throw t && typeof t == `object` && `message` in t && typeof t.message == `string`
      ? Error(t.message)
      : Error(n);
}
async function T(e) {
  let t = await fetch(
      `${e.url}/rest/v1/pedidos?filial_id=eq.${encodeURIComponent(e.filialId)}&order=num.desc`,
      { headers: S(e.key, e.token), signal: AbortSignal.timeout(12e3) }
    ),
    n = await C(t);
  return (w(t, n, `Erro ${t.status} ao carregar pedidos`), Array.isArray(n) ? n : []);
}
async function E(e, t) {
  let n = { ...t, itens: JSON.stringify(t.itens) },
    r = await fetch(`${e.url}/rest/v1/pedidos`, {
      method: `POST`,
      headers: { ...S(e.key, e.token), Prefer: `resolution=merge-duplicates` },
      body: JSON.stringify(n),
      signal: AbortSignal.timeout(12e3)
    });
  w(r, await C(r), `Erro ${r.status} ao salvar pedido`);
}
async function D(e, t, n) {
  let r = await fetch(
    `${e.url}/rest/v1/pedidos?id=eq.${encodeURIComponent(t)}&filial_id=eq.${encodeURIComponent(e.filialId)}`,
    {
      method: `PATCH`,
      headers: S(e.key, e.token),
      body: JSON.stringify({ status: n }),
      signal: AbortSignal.timeout(12e3)
    }
  );
  w(r, await C(r), `Erro ${r.status} ao atualizar status do pedido`);
}
var O = {
    filiais: [],
    produtos: {},
    clientes: {},
    pedidos: {},
    rcas: {},
    fornecedores: {},
    cotPrecos: {},
    cotConfig: {},
    movs: {},
    jogos: {},
    contasReceber: {},
    contasReceberBaixas: {},
    userPerfis: [],
    userFiliais: [],
    acessosAudit: [],
    accessUsers: []
  },
  k = { '7d': 7, '15d': 15, '30d': 30, '60d': 60 };
function A(e, t) {
  let n = k[t ?? ``];
  if (!n) return null;
  let r = e ? new Date(e + `T00:00:00`) : new Date();
  return (r.setDate(r.getDate() + n), r.toISOString().split(`T`)[0]);
}
async function j(e, t) {
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
  O.contasReceber ||= {};
  let r = O.contasReceber[e.filialId] || [],
    i = t;
  ((O.contasReceber[e.filialId] = r.some((e) => e.id === i.id)
    ? r.map((e) => (e.id === i.id ? { ...e, ...i } : e))
    : [i, ...r]),
    window.dispatchEvent(new CustomEvent(`sc:conta-receber-criada`, { detail: t })),
    window.dispatchEvent(new CustomEvent(`sc:contas-receber-sync`)));
}
async function M(e, t) {
  let n = A(t.data, t.prazo);
  if (!n)
    throw Error(
      `Prazo "${t.prazo || `não definido`}" não gera conta a receber. Use prazo de 7d, 15d, 30d ou 60d no pedido.`
    );
  await j(e, {
    id: globalThis.crypto.randomUUID(),
    filial_id: e.filialId,
    pedido_id: t.pedido_id,
    pedido_num: t.pedido_num ?? null,
    cliente_id: t.cliente_id ?? null,
    cliente: t.cliente,
    valor: t.valor,
    valor_recebido: 0,
    valor_em_aberto: t.valor,
    vencimento: n,
    status: `pendente`,
    recebido_em: null,
    ultimo_recebimento_em: null
  });
}
async function N(e, t, n, r) {
  if (v(n) !== `entregue` || v(r) === `entregue`) return;
  let i = A(t.data, t.prazo);
  if (i)
    try {
      await j(e, {
        id: globalThis.crypto.randomUUID(),
        filial_id: e.filialId,
        pedido_id: t.pedido_id,
        pedido_num: t.pedido_num ?? null,
        cliente_id: t.cliente_id ?? null,
        cliente: t.cliente,
        valor: t.valor,
        valor_recebido: 0,
        valor_em_aberto: t.valor,
        vencimento: i,
        status: `pendente`,
        recebido_em: null,
        ultimo_recebimento_em: null
      });
    } catch (e) {
      console.error(
        `[pedidos-react] Falha ao gerar conta a receber para pedido #${t.pedido_num}:`,
        e
      );
    }
}
function P() {
  let t = x((e) => e.upsertPedido),
    r = x((e) => e.setInFlight),
    i = x((e) => e.inFlight),
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
    let n = v(e.status),
      a = g[n];
    if (!a || i.has(e.id)) return;
    let o = c();
    r(e.id, !0);
    try {
      (await D(o, e.id, a),
        t({ ...e, status: a }),
        a === `entregue` &&
          N(
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
    let n = v(e.status);
    if (n === `cancelado` || n === `entregue` || i.has(e.id)) return;
    let a = c();
    r(e.id, !0);
    try {
      (await D(a, e.id, `cancelado`), t({ ...e, status: `cancelado` }));
    } finally {
      r(e.id, !1);
    }
  }
  async function d(e) {
    if (v(e.status) !== `cancelado` || i.has(e.id)) return;
    let n = c();
    r(e.id, !0);
    try {
      (await D(n, e.id, `orcamento`), t({ ...e, status: `orcamento` }));
    } finally {
      r(e.id, !1);
    }
  }
  async function f(e) {
    let n = c(),
      r = x.getState().pedidos.find((t) => t.id === e.id),
      i = r ? v(r.status) : ``,
      a = { ...e, filial_id: n.filialId };
    (await E(n, a),
      t(a),
      N(
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
  async function p(e) {
    let t = c();
    if (i.has(e.id)) return `Operação em andamento...`;
    r(e.id, !0);
    try {
      return (
        await M(t, {
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
    gerarContaManual: p,
    inFlight: i
  };
}
var F = i(),
  I = {
    orcamento: `bdg bk`,
    confirmado: `bdg bb`,
    em_separacao: `bdg ba`,
    entregue: `bdg bg`,
    cancelado: `bdg br`
  },
  L = {
    orcamento: `Orçamento`,
    confirmado: `Confirmado`,
    em_separacao: `Em separação`,
    entregue: `Entregue`,
    cancelado: `Cancelado`
  };
function R(e) {
  return (e ?? 0).toLocaleString(`pt-BR`, { style: `currency`, currency: `BRL` });
}
function z({ pedido: e, inFlight: t, onAvancar: n, onCancelar: r, onReabrir: i, onDetalhe: a }) {
  let [o, s] = (0, p.useState)(!1),
    [c, l] = (0, p.useState)(!1),
    u = (0, p.useRef)(e.status);
  (0, p.useEffect)(() => {
    if (u.current !== e.status) {
      ((u.current = e.status), l(!0));
      let t = setTimeout(() => l(!1), 1500);
      return () => clearTimeout(t);
    }
  }, [e.status]);
  let d = v(e.status),
    f = I[d] ?? `bdg bk`,
    m = L[d] ?? d,
    h = g[d],
    y = _[d];
  return (0, F.jsxs)(`div`, {
    className: `list-row`,
    'data-testid': `pedido-row-${e.id}`,
    children: [
      (0, F.jsxs)(`div`, {
        className: `list-row-main`,
        children: [
          (0, F.jsxs)(`button`, {
            className: `btn-link list-row-title`,
            onClick: () => a(e.id),
            'data-testid': `pedido-row-title-${e.id}`,
            children: [`#`, e.num, ` — `, e.cli || `—`]
          }),
          (0, F.jsx)(`span`, { className: f, children: m }),
          c &&
            (0, F.jsx)(`span`, {
              className: `bdg bg`,
              style: { transition: `opacity 0.3s` },
              children: `✓`
            }),
          e.data && (0, F.jsx)(`span`, { className: `list-row-meta`, children: e.data }),
          (0, F.jsx)(`span`, { className: `list-row-meta`, children: R(e.total) })
        ]
      }),
      (0, F.jsxs)(`div`, {
        className: `list-row-actions`,
        children: [
          h &&
            y &&
            (0, F.jsx)(`button`, {
              className: `btn btn-sm`,
              disabled: t,
              onClick: n,
              'data-testid': `pedido-acao-avancar-${e.id}`,
              children: t ? `...` : y
            }),
          d !== `cancelado` &&
            d !== `entregue` &&
            !o &&
            (0, F.jsx)(`button`, {
              className: `btn btn-sm btn-danger`,
              disabled: t,
              onClick: () => s(!0),
              'data-testid': `pedido-acao-cancelar-${e.id}`,
              children: `Cancelar`
            }),
          o &&
            (0, F.jsxs)(F.Fragment, {
              children: [
                (0, F.jsx)(`span`, {
                  className: `list-row-meta`,
                  style: { color: `var(--c-danger, #c0392b)` },
                  children: `Cancelar pedido?`
                }),
                (0, F.jsx)(`button`, {
                  className: `btn btn-sm btn-danger`,
                  disabled: t,
                  onClick: () => {
                    (s(!1), r());
                  },
                  'data-testid': `pedido-acao-cancelar-confirm-${e.id}`,
                  children: `Sim`
                }),
                (0, F.jsx)(`button`, {
                  className: `btn btn-sm`,
                  disabled: t,
                  onClick: () => s(!1),
                  'data-testid': `pedido-acao-cancelar-abort-${e.id}`,
                  children: `Não`
                })
              ]
            }),
          d === `cancelado` &&
            (0, F.jsx)(`button`, {
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
var B = 400,
  V = [
    { id: `emaberto`, label: `Em Aberto` },
    { id: `entregues`, label: `Entregues` },
    { id: `cancelados`, label: `Cancelados` }
  ],
  H = [
    { value: ``, label: `Todos` },
    { value: `orcamento`, label: `Orçamento` },
    { value: `confirmado`, label: `Confirmado` },
    { value: `em_separacao`, label: `Em separação` }
  ];
function U({ onNovoPedido: e, onDetalhe: t }) {
  let n = x((e) => e.activeTab),
    r = x((e) => e.setActiveTab),
    i = x((e) => e.filtro),
    a = x((e) => e.setFiltro),
    o = x((e) => e.status),
    s = x((e) => e.error),
    c = x(l(b)),
    { avancarStatus: u, cancelarPedido: d, reabrirPedido: f, inFlight: m } = P(),
    h = (0, p.useRef)(new Map()),
    g = (0, p.useRef)(new Set()),
    [_, v] = (0, p.useState)(new Set());
  return (
    (0, p.useEffect)(() => {
      c.forEach((e) => h.current.set(e.id, e));
      let e = new Set(c.map((e) => e.id)),
        t = [...g.current].filter((t) => !e.has(t));
      (t.length > 0 &&
        (v((e) => new Set([...e, ...t])),
        setTimeout(() => {
          v((e) => {
            let n = new Set(e);
            return (
              t.forEach((e) => {
                (n.delete(e), h.current.delete(e));
              }),
              n
            );
          });
        }, B)),
        (g.current = e));
    }, [c]),
    (0, F.jsxs)(`div`, {
      className: `screen-content`,
      'data-testid': `pedido-list-view`,
      children: [
        (0, F.jsx)(`div`, {
          className: `tabs`,
          children: V.map((e) =>
            (0, F.jsx)(
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
        (0, F.jsxs)(`div`, {
          className: `card card-shell`,
          children: [
            (0, F.jsxs)(`div`, {
              className: `toolbar toolbar-shell toolbar-shell--section`,
              children: [
                (0, F.jsxs)(`div`, {
                  className: `toolbar-main`,
                  children: [
                    (0, F.jsx)(`input`, {
                      className: `inp input-w-sm`,
                      placeholder: `Cliente ou número...`,
                      value: i.q,
                      onChange: (e) => a({ q: e.target.value }),
                      'data-testid': `pedido-busca`
                    }),
                    n === `emaberto` &&
                      (0, F.jsx)(`select`, {
                        className: `inp sel select-w-sm`,
                        value: i.status,
                        onChange: (e) => a({ status: e.target.value }),
                        'data-testid': `pedido-filtro-status`,
                        children: H.map((e) =>
                          (0, F.jsx)(`option`, { value: e.value, children: e.label }, e.value)
                        )
                      })
                  ]
                }),
                (0, F.jsx)(`div`, {
                  className: `toolbar-actions`,
                  children: (0, F.jsx)(`button`, {
                    className: `btn btn-sm btn-p`,
                    onClick: e,
                    'data-testid': `pedido-novo-btn`,
                    children: `+ Novo pedido`
                  })
                })
              ]
            }),
            o === `loading` &&
              (0, F.jsx)(`div`, {
                className: `empty`,
                'data-testid': `pedido-loading`,
                children: (0, F.jsx)(`p`, { children: `Carregando pedidos...` })
              }),
            o === `error` &&
              (0, F.jsx)(`div`, {
                className: `empty`,
                'data-testid': `pedido-error`,
                children: (0, F.jsx)(`p`, { children: s })
              }),
            o === `ready` &&
              c.length === 0 &&
              _.size === 0 &&
              (0, F.jsx)(`div`, {
                className: `empty`,
                'data-testid': `pedido-empty`,
                children: (0, F.jsx)(`p`, { children: `Nenhum pedido encontrado.` })
              }),
            o === `ready` &&
              (c.length > 0 || _.size > 0) &&
              (0, F.jsxs)(`div`, {
                className: `list`,
                'data-testid': `pedido-list`,
                children: [
                  c.map((e) =>
                    (0, F.jsx)(
                      z,
                      {
                        pedido: e,
                        inFlight: m.has(e.id),
                        onAvancar: () => void u(e),
                        onCancelar: () => void d(e),
                        onReabrir: () => void f(e),
                        onDetalhe: t
                      },
                      e.id
                    )
                  ),
                  [..._].map((e) => {
                    let t = h.current.get(e);
                    return t
                      ? (0, F.jsx)(
                          `div`,
                          {
                            className: `list-row--exiting`,
                            children: (0, F.jsx)(z, {
                              pedido: t,
                              inFlight: !1,
                              onAvancar: () => void 0,
                              onCancelar: () => void 0,
                              onReabrir: () => void 0,
                              onDetalhe: () => void 0
                            })
                          },
                          e
                        )
                      : null;
                  })
                ]
              })
          ]
        })
      ]
    })
  );
}
async function W(e) {
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
function G(e, t) {
  let n = t.trim().toLowerCase();
  return n ? (e.find((e) => e.id === t.trim() || e.nome.trim().toLowerCase() === n) ?? null) : null;
}
async function K(e) {
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
async function q(e) {
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
var J = { produtos: [], clientes: [], rcas: [], loading: !1, error: null };
function ee() {
  let [t, r] = (0, p.useState)({ ...J, loading: !0 }),
    i = (0, p.useRef)(!1),
    a = n((e) => e.session),
    s = o((e) => e.filialId);
  return (
    (0, p.useEffect)(() => {
      if (i.current) return;
      if (!a?.access_token || !s) {
        r({ ...J, error: `Sessão ou filial ausente.` });
        return;
      }
      let { url: t, key: n, ready: o } = e();
      if (!o) {
        r({ ...J, error: `Configuração do Supabase ausente.` });
        return;
      }
      i.current = !0;
      let c = { url: t, key: n, token: a.access_token, filialId: s };
      Promise.all([K(c), W(c), q(c)])
        .then(([e, t, n]) => {
          r({ produtos: e, clientes: t, rcas: n, loading: !1, error: null });
        })
        .catch((e) => {
          ((i.current = !1),
            r({
              ...J,
              loading: !1,
              error: e instanceof Error ? e.message : `Erro ao carregar dados do formulário.`
            }));
        });
    }, [a, s]),
    t
  );
}
function Y(e, t) {
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
function te({ produtos: e, tipo: t, onAdd: n }) {
  let [r, i] = (0, p.useState)(``),
    [a, o] = (0, p.useState)(`1`),
    [s, c] = (0, p.useState)(``),
    [l, u] = (0, p.useState)(``),
    [d, f] = (0, p.useState)(`estoque`),
    [m, h] = (0, p.useState)(null);
  function g(n) {
    if ((i(n), h(null), !n)) {
      (c(``), u(``));
      return;
    }
    let r = e.find((e) => e.id === n);
    if (!r) return;
    let a = Y(r, t);
    (s || c(String(a > 0 ? a.toFixed(2) : ``)),
      l || u(String(r.custo > 0 ? r.custo.toFixed(2) : ``)));
  }
  function _() {
    if (!r) {
      h(`Selecione um produto.`);
      return;
    }
    let p = e.find((e) => e.id === r);
    if (!p) return;
    let m = parseFloat(a) || 1,
      g = parseFloat(s) || Y(p, t),
      _ = parseFloat(l) || p.custo || 0;
    (n({
      prodId: r,
      nome: p.nome,
      un: p.un,
      qty: m,
      preco: g,
      custo: _,
      custo_base: p.custo,
      preco_base: Y(p, t),
      orig: d
    }),
      i(``),
      o(`1`),
      c(``),
      u(``),
      f(`estoque`),
      h(null));
  }
  return (0, F.jsxs)(`div`, {
    'data-testid': `pedido-item-add`,
    children: [
      m &&
        (0, F.jsx)(`div`, {
          className: `empty-inline`,
          style: { color: `var(--color-danger)` },
          children: m
        }),
      (0, F.jsxs)(`div`, {
        className: `fg c5 form-gap-bottom-xxs`,
        children: [
          (0, F.jsxs)(`div`, {
            children: [
              (0, F.jsx)(`div`, { className: `fl`, children: `Produto` }),
              (0, F.jsxs)(`select`, {
                className: `inp sel`,
                value: r,
                onChange: (e) => g(e.target.value),
                'data-testid': `pedido-item-prod`,
                children: [
                  (0, F.jsx)(`option`, { value: ``, children: `- selecione -` }),
                  e.map((e) => (0, F.jsx)(`option`, { value: e.id, children: e.nome }, e.id))
                ]
              })
            ]
          }),
          (0, F.jsxs)(`div`, {
            children: [
              (0, F.jsx)(`div`, { className: `fl`, children: `Quantidade` }),
              (0, F.jsx)(`input`, {
                className: `inp`,
                type: `number`,
                min: `1`,
                value: a,
                onChange: (e) => o(e.target.value),
                'data-testid': `pedido-item-qty`
              })
            ]
          }),
          (0, F.jsxs)(`div`, {
            children: [
              (0, F.jsx)(`div`, { className: `fl`, children: `Preço unit. (R$)` }),
              (0, F.jsx)(`input`, {
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
          (0, F.jsxs)(`div`, {
            children: [
              (0, F.jsx)(`div`, { className: `fl`, children: `Custo aplicado (R$)` }),
              (0, F.jsx)(`input`, {
                className: `inp`,
                type: `number`,
                step: `0.01`,
                placeholder: `custo do produto`,
                value: l,
                onChange: (e) => u(e.target.value),
                'data-testid': `pedido-item-custo`
              })
            ]
          }),
          (0, F.jsxs)(`div`, {
            children: [
              (0, F.jsx)(`div`, { className: `fl`, children: `Origem` }),
              (0, F.jsxs)(`select`, {
                className: `inp sel`,
                value: d,
                onChange: (e) => f(e.target.value),
                'data-testid': `pedido-item-orig`,
                children: [
                  (0, F.jsx)(`option`, { value: `estoque`, children: `Estoque` }),
                  (0, F.jsx)(`option`, { value: `fornecedor`, children: `Fornecedor` })
                ]
              })
            ]
          })
        ]
      }),
      (0, F.jsx)(`div`, {
        className: `modal-actions modal-actions-inline`,
        children: (0, F.jsx)(`button`, {
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
function X(e) {
  return e.toLocaleString(`pt-BR`, { style: `currency`, currency: `BRL` });
}
function ne({ item: e, index: t, readOnly: n, onRemove: r }) {
  let i = e.qty * e.preco,
    a = (e.preco - e.custo) * e.qty,
    o = e.preco > 0 ? ((e.preco - e.custo) / e.preco) * 100 : 0;
  return (0, F.jsxs)(`tr`, {
    'data-testid': `pedido-item-row-${t}`,
    children: [
      (0, F.jsx)(`td`, { className: `table-cell-strong`, children: e.nome }),
      (0, F.jsx)(`td`, {
        children: (0, F.jsx)(`span`, {
          className: `bdg ${e.orig === `estoque` ? `bg` : `bb`}`,
          children: e.orig === `estoque` ? `Estoque` : `Fornecedor`
        })
      }),
      (0, F.jsxs)(`td`, { children: [e.qty, ` `, e.un] }),
      (0, F.jsx)(`td`, { className: `table-cell-muted`, children: X(e.custo) }),
      (0, F.jsx)(`td`, { children: X(e.preco) }),
      (0, F.jsx)(`td`, { className: `table-cell-strong`, children: X(i) }),
      (0, F.jsx)(`td`, {
        className: `table-cell-strong ${a >= 0 ? `table-cell-success` : `table-cell-danger`}`,
        children: X(a)
      }),
      (0, F.jsxs)(`td`, { className: `table-cell-strong`, children: [o.toFixed(1), `%`] }),
      !n &&
        (0, F.jsx)(`td`, {
          children: (0, F.jsx)(`button`, {
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
function re(e) {
  return e.toLocaleString(`pt-BR`, { style: `currency`, currency: `BRL` });
}
function ie({ itens: e, produtos: t, tipo: n, readOnly: r, onAdd: i, onRemove: a }) {
  let o = e.reduce((e, t) => e + t.qty * t.preco, 0),
    s = e.reduce((e, t) => e + (t.preco - t.custo) * t.qty, 0);
  return (0, F.jsxs)(`div`, {
    'data-testid': `pedido-items-section`,
    children: [
      (0, F.jsx)(`div`, { className: `div` }),
      (0, F.jsx)(`div`, { className: `ct`, children: `Itens do pedido` }),
      !r && i && (0, F.jsx)(te, { produtos: t, tipo: n, onAdd: i }),
      e.length === 0
        ? (0, F.jsx)(`div`, { className: `empty-inline`, children: `Nenhum item.` })
        : (0, F.jsxs)(F.Fragment, {
            children: [
              (0, F.jsx)(`div`, {
                className: `tw ped-items-wrap`,
                children: (0, F.jsxs)(`table`, {
                  className: `tbl ped-items-table`,
                  children: [
                    (0, F.jsx)(`thead`, {
                      children: (0, F.jsxs)(`tr`, {
                        children: [
                          (0, F.jsx)(`th`, { children: `Produto` }),
                          (0, F.jsx)(`th`, { children: `Origem` }),
                          (0, F.jsx)(`th`, { children: `Qtd` }),
                          (0, F.jsx)(`th`, { children: `Custo` }),
                          (0, F.jsx)(`th`, { children: `Preço` }),
                          (0, F.jsx)(`th`, { children: `Subtotal` }),
                          (0, F.jsx)(`th`, { children: `Lucro` }),
                          (0, F.jsx)(`th`, { children: `Margem` }),
                          !r && (0, F.jsx)(`th`, {})
                        ]
                      })
                    }),
                    (0, F.jsx)(`tbody`, {
                      children: e.map((e, t) =>
                        (0, F.jsx)(ne, { item: e, index: t, readOnly: r, onRemove: a }, t)
                      )
                    })
                  ]
                })
              }),
              (0, F.jsx)(`div`, {
                className: `panel ped-total-panel`,
                children: (0, F.jsxs)(`div`, {
                  className: `fb`,
                  children: [
                    (0, F.jsx)(`span`, {
                      className: `ped-total-label`,
                      children: `Total do pedido`
                    }),
                    (0, F.jsxs)(`span`, {
                      className: `ped-total-value`,
                      children: [re(o), ` | Lucro `, re(s)]
                    })
                  ]
                })
              })
            ]
          })
    ]
  });
}
function ae() {
  return new Date().toISOString().split(`T`)[0];
}
function oe(e) {
  let t = e.map((e) => e.num).filter((e) => typeof e == `number` && !isNaN(e));
  return t.length ? Math.max(...t) + 1 : 1;
}
function se(e) {
  return e.toLocaleString(`pt-BR`, { style: `currency`, currency: `BRL` });
}
function ce({ initialPedido: e, onSaved: t, onCancel: n }) {
  let r = x((e) => e.pedidos),
    { submitPedido: i } = P(),
    { produtos: a, clientes: o, rcas: s, loading: c, error: l } = ee(),
    u = e
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
    [d, f] = (0, p.useState)(e?.cli ?? ``),
    [m, h] = (0, p.useState)(e?.rca_id ?? ``),
    [g, _] = (0, p.useState)(e?.data ?? ae()),
    [y, b] = (0, p.useState)(v(e?.status) || `orcamento`),
    [S, C] = (0, p.useState)(e?.pgto ?? `a_vista`),
    [w, T] = (0, p.useState)(e?.prazo ?? `imediato`),
    [E, D] = (0, p.useState)(e?.tipo ?? `varejo`),
    [O, k] = (0, p.useState)(e?.obs ?? ``),
    [A, j] = (0, p.useState)(u),
    [M, N] = (0, p.useState)(!1),
    [I, L] = (0, p.useState)(null),
    [R, z] = (0, p.useState)(!!e?.obs),
    B = (0, p.useMemo)(() => G(o, d.trim()), [o, d]),
    V = (0, p.useMemo)(() => A.reduce((e, t) => e + t.qty * t.preco, 0), [A]);
  function H(e) {
    j((t) => [...t, e]);
  }
  function U(e) {
    j((t) => t.filter((t, n) => n !== e));
  }
  function W(e) {
    f(e);
    let t = G(o, e.trim());
    t?.rca_id && !m && h(t.rca_id);
  }
  async function K(n) {
    (n.preventDefault(), L(null));
    let a = d.trim();
    if (!a) {
      L(`Cliente e obrigatorio.`);
      return;
    }
    let c = G(o, a);
    if (!c) {
      L(`Cliente invalido. Escolha um cliente cadastrado na lista.`);
      return;
    }
    if (A.length === 0) {
      L(`Adicione ao menos 1 item ao pedido.`);
      return;
    }
    let l = s.find((e) => e.id === m)?.nome ?? c.rca_nome ?? ``,
      u = {
        id: e?.id ?? globalThis.crypto.randomUUID(),
        num: e?.num ?? oe(r),
        cli: c.nome,
        cliente_id: c.id,
        rca_id: m || null,
        rca_nome: l || null,
        data: g,
        status: y,
        pgto: S,
        prazo: w,
        tipo: E,
        obs: O.trim(),
        itens: A,
        total: V
      };
    N(!0);
    try {
      (await i(u), t(u));
    } catch (e) {
      L(e instanceof Error ? e.message : `Erro ao salvar pedido.`);
    } finally {
      N(!1);
    }
  }
  let q = e ? `Editar pedido #${e.num}` : `Novo pedido`;
  return (0, F.jsxs)(`div`, {
    className: `card card-shell`,
    'data-testid': `pedido-form`,
    children: [
      (0, F.jsxs)(`div`, {
        className: `form-shell-head`,
        children: [
          (0, F.jsx)(`div`, { className: `form-shell-kicker`, children: `Operacao` }),
          (0, F.jsxs)(`div`, {
            className: `modal-shell-head`,
            children: [
              (0, F.jsx)(`div`, { className: `mt`, children: q }),
              (0, F.jsx)(`p`, {
                className: `form-shell-copy`,
                children: `Comece pelo cliente e pelos itens. Condicoes e observacoes ficam organizadas logo abaixo.`
              })
            ]
          })
        ]
      }),
      c &&
        (0, F.jsx)(`div`, {
          className: `empty`,
          children: (0, F.jsx)(`p`, { children: `Carregando dados do formulario...` })
        }),
      l && (0, F.jsx)(`div`, { className: `empty`, children: (0, F.jsx)(`p`, { children: l }) }),
      !c &&
        !l &&
        (0, F.jsxs)(`form`, {
          onSubmit: (e) => void K(e),
          children: [
            (0, F.jsxs)(`div`, {
              className: `modal-shell-body`,
              children: [
                I &&
                  (0, F.jsx)(`div`, {
                    className: `empty-inline form-error-inline`,
                    'data-testid': `pedido-form-error`,
                    children: I
                  }),
                (0, F.jsxs)(`section`, {
                  className: `form-section-card`,
                  children: [
                    (0, F.jsx)(`div`, {
                      className: `form-section-head`,
                      children: (0, F.jsxs)(`div`, {
                        children: [
                          (0, F.jsx)(`div`, {
                            className: `form-section-title`,
                            children: `Resumo rapido`
                          }),
                          (0, F.jsx)(`p`, {
                            className: `form-section-copy`,
                            children: `Acompanhe o tamanho do pedido enquanto preenche.`
                          })
                        ]
                      })
                    }),
                    (0, F.jsxs)(`div`, {
                      className: `form-summary-grid`,
                      children: [
                        (0, F.jsxs)(`div`, {
                          className: `form-summary-item`,
                          children: [
                            (0, F.jsx)(`span`, {
                              className: `table-cell-caption table-cell-muted`,
                              children: `Numero`
                            }),
                            (0, F.jsx)(`strong`, { children: e?.num ?? oe(r) })
                          ]
                        }),
                        (0, F.jsxs)(`div`, {
                          className: `form-summary-item`,
                          children: [
                            (0, F.jsx)(`span`, {
                              className: `table-cell-caption table-cell-muted`,
                              children: `Itens`
                            }),
                            (0, F.jsx)(`strong`, { children: A.length })
                          ]
                        }),
                        (0, F.jsxs)(`div`, {
                          className: `form-summary-item`,
                          children: [
                            (0, F.jsx)(`span`, {
                              className: `table-cell-caption table-cell-muted`,
                              children: `Total estimado`
                            }),
                            (0, F.jsx)(`strong`, { children: se(V) })
                          ]
                        }),
                        (0, F.jsxs)(`div`, {
                          className: `form-summary-item`,
                          children: [
                            (0, F.jsx)(`span`, {
                              className: `table-cell-caption table-cell-muted`,
                              children: `Cliente`
                            }),
                            (0, F.jsx)(`strong`, { children: B?.nome || `Nao selecionado` })
                          ]
                        })
                      ]
                    })
                  ]
                }),
                (0, F.jsxs)(`section`, {
                  className: `form-section-card`,
                  children: [
                    (0, F.jsxs)(`div`, {
                      className: `form-section-head`,
                      children: [
                        (0, F.jsxs)(`div`, {
                          children: [
                            (0, F.jsx)(`div`, {
                              className: `form-section-title`,
                              children: `Essencial`
                            }),
                            (0, F.jsx)(`p`, {
                              className: `form-section-copy`,
                              children: `Defina quem compra, quando o pedido foi criado e quais itens entram.`
                            })
                          ]
                        }),
                        (0, F.jsx)(`span`, { className: `bdg bb`, children: `Prioridade` })
                      ]
                    }),
                    (0, F.jsxs)(`div`, {
                      className: `grid grid-3`,
                      children: [
                        (0, F.jsxs)(`label`, {
                          className: `form-field`,
                          children: [
                            (0, F.jsx)(`span`, { children: `Cliente *` }),
                            (0, F.jsx)(`input`, {
                              className: `inp`,
                              list: `ped-form-cli-dl`,
                              placeholder: `Nome do cliente`,
                              value: d,
                              onChange: (e) => W(e.target.value),
                              'data-testid': `pedido-form-cli`
                            }),
                            (0, F.jsx)(`datalist`, {
                              id: `ped-form-cli-dl`,
                              children: o.map((e) => (0, F.jsx)(`option`, { value: e.nome }, e.id))
                            })
                          ]
                        }),
                        (0, F.jsxs)(`label`, {
                          className: `form-field`,
                          children: [
                            (0, F.jsx)(`span`, { children: `Data` }),
                            (0, F.jsx)(`input`, {
                              className: `inp`,
                              type: `date`,
                              value: g,
                              onChange: (e) => _(e.target.value),
                              'data-testid': `pedido-form-data`
                            })
                          ]
                        }),
                        (0, F.jsxs)(`label`, {
                          className: `form-field`,
                          children: [
                            (0, F.jsx)(`span`, { children: `RCA / Vendedor` }),
                            (0, F.jsxs)(`select`, {
                              className: `inp sel`,
                              value: m,
                              onChange: (e) => h(e.target.value),
                              'data-testid': `pedido-form-rca`,
                              children: [
                                (0, F.jsx)(`option`, { value: ``, children: `Sem RCA` }),
                                s.map((e) =>
                                  (0, F.jsx)(`option`, { value: e.id, children: e.nome }, e.id)
                                )
                              ]
                            })
                          ]
                        })
                      ]
                    }),
                    (0, F.jsx)(ie, { itens: A, produtos: a, tipo: E, onAdd: H, onRemove: U })
                  ]
                }),
                (0, F.jsxs)(`section`, {
                  className: `form-section-card`,
                  children: [
                    (0, F.jsx)(`div`, {
                      className: `form-section-head`,
                      children: (0, F.jsxs)(`div`, {
                        children: [
                          (0, F.jsx)(`div`, {
                            className: `form-section-title`,
                            children: `Condicoes do pedido`
                          }),
                          (0, F.jsx)(`p`, {
                            className: `form-section-copy`,
                            children: `Ajuste status, pagamento, prazo e tipo de venda sem disputar espaco com os itens.`
                          })
                        ]
                      })
                    }),
                    (0, F.jsxs)(`div`, {
                      className: `grid grid-4`,
                      children: [
                        (0, F.jsxs)(`label`, {
                          className: `form-field`,
                          children: [
                            (0, F.jsx)(`span`, { children: `Status` }),
                            (0, F.jsxs)(`select`, {
                              className: `inp sel`,
                              value: y,
                              onChange: (e) => b(e.target.value),
                              'data-testid': `pedido-form-status`,
                              children: [
                                (0, F.jsx)(`option`, { value: `orcamento`, children: `Orcamento` }),
                                (0, F.jsx)(`option`, {
                                  value: `confirmado`,
                                  children: `Confirmado`
                                }),
                                (0, F.jsx)(`option`, {
                                  value: `em_separacao`,
                                  children: `Em separacao`
                                }),
                                (0, F.jsx)(`option`, { value: `entregue`, children: `Entregue` }),
                                (0, F.jsx)(`option`, { value: `cancelado`, children: `Cancelado` })
                              ]
                            })
                          ]
                        }),
                        (0, F.jsxs)(`label`, {
                          className: `form-field`,
                          children: [
                            (0, F.jsx)(`span`, { children: `Pagamento` }),
                            (0, F.jsxs)(`select`, {
                              className: `inp sel`,
                              value: S,
                              onChange: (e) => C(e.target.value),
                              'data-testid': `pedido-form-pgto`,
                              children: [
                                (0, F.jsx)(`option`, { value: `a_vista`, children: `A vista` }),
                                (0, F.jsx)(`option`, { value: `pix`, children: `PIX` }),
                                (0, F.jsx)(`option`, { value: `boleto`, children: `Boleto` }),
                                (0, F.jsx)(`option`, { value: `cartao`, children: `Cartao` }),
                                (0, F.jsx)(`option`, { value: `cheque`, children: `Cheque` })
                              ]
                            })
                          ]
                        }),
                        (0, F.jsxs)(`label`, {
                          className: `form-field`,
                          children: [
                            (0, F.jsx)(`span`, { children: `Prazo` }),
                            (0, F.jsxs)(`select`, {
                              className: `inp sel`,
                              value: w,
                              onChange: (e) => T(e.target.value),
                              'data-testid': `pedido-form-prazo`,
                              children: [
                                (0, F.jsx)(`option`, { value: `imediato`, children: `Imediato` }),
                                (0, F.jsx)(`option`, { value: `7d`, children: `7 dias` }),
                                (0, F.jsx)(`option`, { value: `15d`, children: `15 dias` }),
                                (0, F.jsx)(`option`, { value: `30d`, children: `30 dias` }),
                                (0, F.jsx)(`option`, { value: `60d`, children: `60 dias` })
                              ]
                            })
                          ]
                        }),
                        (0, F.jsxs)(`label`, {
                          className: `form-field`,
                          children: [
                            (0, F.jsx)(`span`, { children: `Tipo de venda` }),
                            (0, F.jsxs)(`select`, {
                              className: `inp sel`,
                              value: E,
                              onChange: (e) => D(e.target.value),
                              'data-testid': `pedido-form-tipo`,
                              children: [
                                (0, F.jsx)(`option`, { value: `varejo`, children: `Varejo` }),
                                (0, F.jsx)(`option`, { value: `atacado`, children: `Atacado` })
                              ]
                            })
                          ]
                        })
                      ]
                    })
                  ]
                }),
                (0, F.jsxs)(`details`, {
                  className: `form-advanced-block`,
                  open: R,
                  onToggle: (e) => z(e.currentTarget.open),
                  children: [
                    (0, F.jsxs)(`summary`, {
                      className: `form-advanced-summary`,
                      children: [
                        (0, F.jsx)(`span`, { children: `Observacoes e detalhes extras` }),
                        (0, F.jsx)(`span`, {
                          className: `table-cell-caption table-cell-muted`,
                          children: `Use quando precisar orientar separacao, entrega ou atendimento`
                        })
                      ]
                    }),
                    (0, F.jsx)(`div`, {
                      className: `form-advanced-body`,
                      children: (0, F.jsxs)(`label`, {
                        className: `form-field`,
                        children: [
                          (0, F.jsx)(`span`, { children: `Observacoes` }),
                          (0, F.jsx)(`textarea`, {
                            className: `inp`,
                            rows: 3,
                            value: O,
                            onChange: (e) => k(e.target.value),
                            'data-testid': `pedido-form-obs`
                          })
                        ]
                      })
                    })
                  ]
                })
              ]
            }),
            (0, F.jsx)(`div`, {
              className: `form-sticky-actions`,
              children: (0, F.jsxs)(`div`, {
                className: `modal-actions`,
                children: [
                  (0, F.jsx)(`button`, {
                    className: `btn`,
                    type: `button`,
                    onClick: n,
                    disabled: M,
                    children: `Cancelar`
                  }),
                  (0, F.jsx)(`button`, {
                    className: `btn btn-p`,
                    type: `submit`,
                    disabled: M,
                    'data-testid': `pedido-form-submit`,
                    children: M ? `Salvando...` : `Salvar pedido`
                  })
                ]
              })
            })
          ]
        })
    ]
  });
}
var le = {
    orcamento: `Orçamento`,
    confirmado: `Confirmado`,
    em_separacao: `Em separação`,
    entregue: `Entregue`,
    cancelado: `Cancelado`
  },
  ue = {
    orcamento: `bdg bk`,
    confirmado: `bdg bb`,
    em_separacao: `bdg ba`,
    entregue: `bdg bg`,
    cancelado: `bdg br`
  },
  de = { a_vista: `À vista`, pix: `PIX`, boleto: `Boleto`, cartao: `Cartão`, cheque: `Cheque` },
  fe = {
    imediato: `Imediato`,
    '7d': `7 dias`,
    '15d': `15 dias`,
    '30d': `30 dias`,
    '60d': `60 dias`
  };
function Z(e) {
  return (e ?? 0).toLocaleString(`pt-BR`, { style: `currency`, currency: `BRL` });
}
function pe(e) {
  if (Array.isArray(e.itens)) return e.itens;
  try {
    let t = JSON.parse(e.itens);
    return Array.isArray(t) ? t : [];
  } catch {
    return [];
  }
}
function me(e) {
  return e
    ? Number.isFinite(Number(e.valor_recebido))
      ? Number(e.valor_recebido)
      : e.status === `recebido`
        ? Number(e.valor || 0)
        : 0
    : 0;
}
function he(e) {
  return e
    ? Number.isFinite(Number(e.valor_em_aberto))
      ? Number(e.valor_em_aberto)
      : Math.max(0, Number(e.valor || 0) - me(e))
    : 0;
}
function ge(e) {
  if (!e) return `-`;
  let t = new Date(e);
  return Number.isNaN(t.getTime()) ? String(e) : t.toLocaleString(`pt-BR`);
}
function _e(e) {
  return e
    ? he(e) <= 0 || e.status === `recebido`
      ? `Recebido`
      : me(e) > 0 || e.status === `parcial`
        ? `Parcial`
        : `Pendente`
    : `Sem conta`;
}
function ve(e) {
  let t = _e(e);
  return t === `Recebido` ? `bdg bg` : t === `Parcial` ? `bdg ba` : `bdg bk`;
}
function Q(e, t) {
  if (!e) return { conta: null, baixas: [] };
  let n = (O.contasReceber?.[e] || []).find((e) => e.pedido_id === t) || null;
  return {
    conta: n,
    baixas: n
      ? (O.contasReceberBaixas?.[e] || [])
          .filter((e) => e.conta_receber_id === n.id)
          .sort((e, t) => String(t.recebido_em || ``).localeCompare(String(e.recebido_em || ``)))
      : []
  };
}
function ye({ pedido: t, onEditar: r, onClose: i }) {
  let {
      avancarStatus: a,
      cancelarPedido: s,
      reabrirPedido: c,
      gerarContaManual: l,
      inFlight: m
    } = P(),
    h = o((e) => e.filialId),
    y = n((e) => e.session),
    [b, x] = (0, p.useState)(null),
    [S, C] = (0, p.useState)(!1),
    [w, T] = (0, p.useState)(``),
    [E, D] = (0, p.useState)(!1),
    [k, A] = (0, p.useState)(null),
    j = (0, p.useRef)(null),
    [M, N] = (0, p.useState)(() => Q(h, t.id)),
    I = v(t.status),
    L = ue[I] ?? `bdg bk`,
    R = le[I] ?? I,
    z = g[I],
    B = _[I],
    V = m.has(t.id),
    H = pe(t),
    U = M.conta,
    W = M.baixas,
    G = me(U),
    K = he(U);
  async function q() {
    if (!h || !y?.access_token) {
      N(Q(h, t.id));
      return;
    }
    try {
      let e = J(),
        [n, r] = await Promise.all([f(e), d(e)]);
      ((O.contasReceber ||= {}),
        (O.contasReceberBaixas ||= {}),
        (O.contasReceber[h] = n),
        (O.contasReceberBaixas[h] = r),
        N(Q(h, t.id)));
    } catch {
      N(Q(h, t.id));
    }
  }
  (0, p.useEffect)(() => {
    let e = () => {
      q();
    };
    return (
      q(),
      window.addEventListener(`sc:contas-receber-sync`, e),
      window.addEventListener(`sc:conta-receber-criada`, e),
      () => {
        (window.removeEventListener(`sc:contas-receber-sync`, e),
          window.removeEventListener(`sc:conta-receber-criada`, e));
      }
    );
  }, [h, t.id, y?.access_token]);
  function J() {
    let t = e();
    return { url: t.url, key: t.key, token: y?.access_token ?? ``, filialId: h ?? `` };
  }
  async function ee(e, t) {
    (D(!0), A(null));
    try {
      (await u(J(), {
        baixaId: `ped-det-${Date.now()}`,
        contaId: e,
        valor: t,
        recebidoEm: new Date().toISOString(),
        observacao: null
      }),
        await q(),
        window.dispatchEvent(new CustomEvent(`sc:contas-receber-sync`)));
    } catch (e) {
      A(e instanceof Error ? e.message : `Erro ao registrar recebimento`);
    } finally {
      D(!1);
    }
  }
  async function Y(e) {
    let t = parseFloat(w.replace(`,`, `.`));
    if (!t || t <= 0) {
      (A(`Informe um valor válido`), j.current?.focus());
      return;
    }
    (D(!0), A(null));
    try {
      (await u(J(), {
        baixaId: `ped-det-${Date.now()}`,
        contaId: e,
        valor: t,
        recebidoEm: new Date().toISOString(),
        observacao: null
      }),
        C(!1),
        T(``),
        await q(),
        window.dispatchEvent(new CustomEvent(`sc:contas-receber-sync`)));
    } catch (e) {
      A(e instanceof Error ? e.message : `Erro ao registrar baixa`);
    } finally {
      D(!1);
    }
  }
  return (0, F.jsxs)(`div`, {
    className: `card card-shell`,
    'data-testid': `pedido-detail-panel`,
    children: [
      (0, F.jsxs)(`div`, {
        className: `modal-shell-head`,
        children: [
          (0, F.jsxs)(`div`, {
            children: [
              (0, F.jsxs)(`div`, { className: `mt`, children: [`Pedido #`, t.num] }),
              (0, F.jsxs)(`div`, {
                className: `cli-react-shell__chips`,
                style: { marginTop: `0.25rem` },
                children: [
                  (0, F.jsx)(`span`, { className: L, children: R }),
                  t.data && (0, F.jsx)(`span`, { className: `bdg bk`, children: t.data }),
                  (0, F.jsx)(`span`, { className: `bdg bg`, children: Z(t.total) })
                ]
              })
            ]
          }),
          (0, F.jsxs)(`div`, {
            style: { display: `flex`, gap: `0.5rem`, alignItems: `flex-start` },
            children: [
              (0, F.jsx)(`button`, {
                className: `btn btn-sm`,
                onClick: () => r(t.id),
                'data-testid': `pedido-detail-editar`,
                children: `Editar`
              }),
              (0, F.jsx)(`button`, {
                className: `btn btn-sm`,
                onClick: i,
                'data-testid': `pedido-detail-close`,
                children: `Fechar`
              })
            ]
          })
        ]
      }),
      (0, F.jsxs)(`div`, {
        className: `modal-shell-body`,
        children: [
          (0, F.jsxs)(`div`, {
            className: `fg c3`,
            children: [
              (0, F.jsxs)(`div`, {
                children: [
                  (0, F.jsx)(`div`, { className: `fl`, children: `Cliente` }),
                  (0, F.jsx)(`div`, { className: `fv`, children: t.cli || `—` })
                ]
              }),
              t.rca_nome &&
                (0, F.jsxs)(`div`, {
                  children: [
                    (0, F.jsx)(`div`, { className: `fl`, children: `RCA` }),
                    (0, F.jsx)(`div`, { className: `fv`, children: t.rca_nome })
                  ]
                }),
              (0, F.jsxs)(`div`, {
                children: [
                  (0, F.jsx)(`div`, { className: `fl`, children: `Tipo` }),
                  (0, F.jsx)(`div`, {
                    className: `fv`,
                    children: t.tipo === `atacado` ? `Atacado` : `Varejo`
                  })
                ]
              }),
              (0, F.jsxs)(`div`, {
                children: [
                  (0, F.jsx)(`div`, { className: `fl`, children: `Pagamento` }),
                  (0, F.jsx)(`div`, {
                    className: `fv`,
                    children: de[t.pgto ?? ``] ?? t.pgto ?? `—`
                  })
                ]
              }),
              (0, F.jsxs)(`div`, {
                children: [
                  (0, F.jsx)(`div`, { className: `fl`, children: `Prazo` }),
                  (0, F.jsx)(`div`, {
                    className: `fv`,
                    children: fe[t.prazo ?? ``] ?? t.prazo ?? `—`
                  })
                ]
              }),
              t.obs &&
                (0, F.jsxs)(`div`, {
                  children: [
                    (0, F.jsx)(`div`, { className: `fl`, children: `Obs.` }),
                    (0, F.jsx)(`div`, { className: `fv`, children: t.obs })
                  ]
                })
            ]
          }),
          (0, F.jsx)(ie, { itens: H, produtos: [], tipo: t.tipo ?? `varejo`, readOnly: !0 }),
          (0, F.jsxs)(`div`, {
            className: `panel`,
            style: { marginTop: `1rem` },
            children: [
              (0, F.jsx)(`div`, { className: `pt`, children: `Financeiro do pedido` }),
              U
                ? (0, F.jsxs)(F.Fragment, {
                    children: [
                      (0, F.jsxs)(`div`, {
                        className: `cli-react-shell__chips`,
                        style: { marginTop: `0.5rem` },
                        children: [
                          (0, F.jsx)(`span`, { className: ve(U), children: _e(U) }),
                          (0, F.jsxs)(`span`, {
                            className: `bdg bk`,
                            children: [`Vencimento `, U.vencimento]
                          }),
                          (0, F.jsxs)(`span`, {
                            className: `bdg bg`,
                            children: [`Total `, Z(U.valor)]
                          })
                        ]
                      }),
                      (0, F.jsxs)(`div`, {
                        className: `fg c3`,
                        style: { marginTop: `0.75rem` },
                        children: [
                          (0, F.jsxs)(`div`, {
                            children: [
                              (0, F.jsx)(`div`, { className: `fl`, children: `Recebido` }),
                              (0, F.jsx)(`div`, { className: `fv tone-success`, children: Z(G) })
                            ]
                          }),
                          (0, F.jsxs)(`div`, {
                            children: [
                              (0, F.jsx)(`div`, { className: `fl`, children: `Em aberto` }),
                              (0, F.jsx)(`div`, {
                                className: `fv ${K > 0 ? `tone-warning` : `tone-success`}`,
                                children: Z(K)
                              })
                            ]
                          }),
                          (0, F.jsxs)(`div`, {
                            children: [
                              (0, F.jsx)(`div`, { className: `fl`, children: `Ultima baixa` }),
                              (0, F.jsx)(`div`, {
                                className: `fv`,
                                children: ge(U.ultimo_recebimento_em || U.recebido_em)
                              })
                            ]
                          })
                        ]
                      }),
                      K > 0 &&
                        (0, F.jsx)(`div`, {
                          style: { marginTop: `0.75rem` },
                          children: S
                            ? (0, F.jsxs)(`div`, {
                                className: `panel`,
                                style: { padding: `0.75rem` },
                                children: [
                                  (0, F.jsx)(`div`, {
                                    className: `fl`,
                                    style: { marginBottom: `0.35rem` },
                                    children: `Valor da baixa`
                                  }),
                                  (0, F.jsxs)(`div`, {
                                    style: { display: `flex`, gap: `0.5rem`, alignItems: `center` },
                                    children: [
                                      (0, F.jsx)(`input`, {
                                        ref: j,
                                        className: `inp`,
                                        type: `number`,
                                        min: `0.01`,
                                        step: `0.01`,
                                        placeholder: `0,00`,
                                        value: w,
                                        onChange: (e) => T(e.target.value),
                                        style: { width: `120px` }
                                      }),
                                      (0, F.jsx)(`button`, {
                                        className: `btn btn-sm btn-p`,
                                        disabled: E,
                                        onClick: () => void Y(U.id),
                                        'data-testid': `pedido-detail-confirmar-baixa`,
                                        children: E ? `...` : `Confirmar`
                                      }),
                                      (0, F.jsx)(`button`, {
                                        className: `btn btn-sm`,
                                        disabled: E,
                                        onClick: () => {
                                          (C(!1), T(``), A(null));
                                        },
                                        children: `Cancelar`
                                      })
                                    ]
                                  }),
                                  k &&
                                    (0, F.jsx)(`div`, {
                                      className: `bdg br`,
                                      style: { marginTop: `0.4rem`, display: `block` },
                                      children: k
                                    })
                                ]
                              })
                            : (0, F.jsxs)(F.Fragment, {
                                children: [
                                  (0, F.jsxs)(`div`, {
                                    className: `modal-actions`,
                                    children: [
                                      (0, F.jsx)(`button`, {
                                        className: `btn btn-sm`,
                                        disabled: E,
                                        onClick: () => {
                                          (A(null),
                                            C(!0),
                                            setTimeout(() => j.current?.focus(), 50));
                                        },
                                        'data-testid': `pedido-detail-baixa-parcial`,
                                        children: `Baixa parcial`
                                      }),
                                      (0, F.jsx)(`button`, {
                                        className: `btn btn-sm btn-p`,
                                        disabled: E,
                                        onClick: () => void ee(U.id, K),
                                        'data-testid': `pedido-detail-receber-tudo`,
                                        children: E ? `...` : `Receber tudo`
                                      })
                                    ]
                                  }),
                                  k &&
                                    (0, F.jsx)(`div`, {
                                      className: `bdg br`,
                                      style: { marginTop: `0.4rem`, display: `block` },
                                      'data-testid': `pedido-detail-baixa-error`,
                                      children: k
                                    })
                                ]
                              })
                        }),
                      (0, F.jsxs)(`div`, {
                        style: { marginTop: `0.75rem` },
                        children: [
                          (0, F.jsx)(`div`, { className: `fl`, children: `Ultimas baixas` }),
                          W.length
                            ? (0, F.jsx)(`div`, {
                                style: { display: `grid`, gap: `0.4rem`, marginTop: `0.4rem` },
                                children: W.slice(0, 4).map((e) =>
                                  (0, F.jsxs)(
                                    `div`,
                                    {
                                      className: `panel`,
                                      style: { padding: `0.6rem 0.8rem` },
                                      children: [
                                        (0, F.jsxs)(`div`, {
                                          className: `panel-inline-metrics`,
                                          children: [
                                            (0, F.jsx)(`span`, {
                                              children: (0, F.jsx)(`b`, { children: Z(e.valor) })
                                            }),
                                            (0, F.jsx)(`span`, { children: ge(e.recebido_em) })
                                          ]
                                        }),
                                        e.observacao &&
                                          (0, F.jsx)(`div`, {
                                            className: `table-cell-caption`,
                                            style: { marginTop: `0.35rem` },
                                            children: e.observacao
                                          })
                                      ]
                                    },
                                    e.id
                                  )
                                )
                              })
                            : (0, F.jsx)(`p`, {
                                className: `table-cell-muted`,
                                style: { marginTop: `0.4rem` },
                                children: `Nenhuma baixa registrada ainda.`
                              })
                        ]
                      })
                    ]
                  })
                : (0, F.jsx)(`p`, {
                    className: `table-cell-muted`,
                    style: { marginTop: `0.5rem` },
                    children: `Nenhuma conta a receber vinculada a este pedido no momento.`
                  })
            ]
          }),
          (0, F.jsxs)(`div`, {
            className: `modal-actions`,
            style: { marginTop: `1rem` },
            children: [
              z &&
                B &&
                (0, F.jsx)(`button`, {
                  className: `btn btn-sm`,
                  disabled: V,
                  onClick: () => void a(t),
                  'data-testid': `pedido-detail-avancar`,
                  children: V ? `...` : B
                }),
              I !== `cancelado` &&
                I !== `entregue` &&
                (0, F.jsx)(`button`, {
                  className: `btn btn-sm btn-danger`,
                  disabled: V,
                  onClick: () => void s(t),
                  'data-testid': `pedido-detail-cancelar`,
                  children: `Cancelar`
                }),
              I === `cancelado` &&
                (0, F.jsx)(`button`, {
                  className: `btn btn-sm`,
                  disabled: V,
                  onClick: () => void c(t),
                  'data-testid': `pedido-detail-reabrir`,
                  children: `Reabrir`
                }),
              I === `entregue` &&
                !U &&
                (0, F.jsx)(`button`, {
                  className: `btn btn-sm`,
                  disabled: V,
                  onClick: () => {
                    (x(null), l(t).then((e) => x(e)));
                  },
                  'data-testid': `pedido-detail-gerar-conta`,
                  children: V ? `...` : `Gerar A Receber`
                })
            ]
          }),
          b &&
            (0, F.jsx)(`div`, {
              className: `bdg ${b.startsWith(`Conta`) ? `bg` : `br`}`,
              style: { marginTop: `0.5rem`, display: `block`, padding: `0.5rem` },
              children: b
            })
        ]
      })
    ]
  });
}
var be = `pedidos-react-pilot`,
  xe = `pedidos-legacy-shell`;
function Se() {
  let e = x(l((e) => e.pedidos)),
    t = x((e) => e.activeTab),
    n = x((e) => e.setActiveTab),
    r = x((e) => e.filtro),
    i = x((e) => e.clearFiltro),
    a = x((e) => e.status),
    o = x((e) => e.error),
    s = x(l(b)),
    [c, u] = (0, p.useState)(null),
    [d, f] = (0, p.useState)(null),
    m = (0, p.useMemo)(
      () => (c && c !== `new` ? (e.find((e) => e.id === c) ?? null) : null),
      [e, c]
    ),
    h = (0, p.useMemo)(() => (d ? (e.find((e) => e.id === d) ?? null) : null), [e, d]);
  return (
    (0, p.useEffect)(() => {
      function e(e) {
        if (e.origin !== window.location.origin) return;
        let t = e.data;
        if (!(!t || t.source !== xe)) {
          if (t.type === `pedidos:set-tab` && t.tab) {
            n(t.tab);
            return;
          }
          if (t.type === `pedidos:limpar-filtros`) {
            i();
            return;
          }
          if (t.type === `pedidos:novo`) {
            (f(null), u(`new`));
            return;
          }
          if (t.type === `pedidos:editar` && t.id) {
            (f(null), u(String(t.id)));
            return;
          }
          if (t.type === `pedidos:detalhe` && t.id) {
            (u(null), f(String(t.id)));
            return;
          }
        }
      }
      return (
        window.addEventListener(`message`, e),
        () => window.removeEventListener(`message`, e)
      );
    }, [n, i]),
    (0, p.useEffect)(() => {
      let n = [r.q, r.status].filter(Boolean).length,
        i = c ? `form` : d ? `detail` : `list`;
      window.postMessage(
        {
          source: be,
          type: `pedidos:state`,
          state: {
            tab: t,
            view: i,
            status: a === `loading` ? `loading` : o ? `error` : `ready`,
            count: s.length,
            filtersActive: n,
            totalPedidos: e.length,
            selectedId: c === `new` ? `` : c || d || ``,
            selectedNum: m?.num ?? h?.num ?? null
          }
        },
        window.location.origin
      );
    }, [t, a, o, r.q, r.status, s.length, e.length, c, d, m?.num, h?.num]),
    (0, F.jsxs)(`div`, {
      'data-testid': `pedidos-pilot-page`,
      children: [
        (0, F.jsx)(U, {
          onNovoPedido: () => {
            (f(null), u(`new`));
          },
          onDetalhe: (e) => {
            (u(null), f(e));
          }
        }),
        h &&
          !c &&
          (0, F.jsx)(ye, {
            pedido: h,
            onEditar: (e) => {
              (f(null), u(e));
            },
            onClose: () => f(null)
          }),
        c &&
          (0, F.jsx)(ce, {
            initialPedido: c === `new` ? null : m,
            onSaved: (e) => {
              (u(null), f(e.id));
            },
            onCancel: () => {
              u(null);
            }
          })
      ]
    })
  );
}
function Ce(t = {}) {
  let { skip: r = !1 } = t,
    i = x((e) => e.setPedidos),
    a = x((e) => e.setStatus),
    s = n((e) => e.session),
    c = n((e) => e.status),
    l = o((e) => e.filialId),
    u = (0, p.useRef)(!1);
  (0, p.useEffect)(() => {
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
    u.current ||
      ((u.current = !0),
      a(`loading`),
      T({ url: t, key: n, token: s.access_token, filialId: l })
        .then((e) => i(e))
        .catch((e) => {
          ((u.current = !1),
            a(`error`, e instanceof Error ? e.message : `Erro ao carregar pedidos.`));
        }));
  }, [r, c, s, l, i, a]);
  function d() {
    if (((u.current = !1), a(`loading`), !s?.access_token || !l)) return;
    let { url: t, key: n, ready: r } = e();
    r &&
      ((u.current = !0),
      T({ url: t, key: n, token: s.access_token, filialId: l })
        .then((e) => i(e))
        .catch((e) => {
          ((u.current = !1),
            a(`error`, e instanceof Error ? e.message : `Erro ao recarregar pedidos.`));
        }));
  }
  return { reload: d };
}
c();
var $ = null;
function we() {
  let e = n((e) => e.hydrate),
    t = o((e) => e.hydrate);
  return (
    (0, p.useEffect)(() => {
      (t(), e());
    }, [e, t]),
    Ce(),
    (0, F.jsx)(Se, {})
  );
}
function Te(e) {
  (c(),
    ($ = (0, m.createRoot)(e)),
    $.render((0, F.jsx)(p.StrictMode, { children: (0, F.jsx)(we, {}) })));
}
function Ee() {
  $ &&= ($.unmount(), null);
}
window.__SC_PEDIDOS_DIRECT_BRIDGE__ = { mount: Te, unmount: Ee };
