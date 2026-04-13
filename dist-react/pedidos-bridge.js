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
function T() {
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
    let n = p[h(e.status)];
    if (!n || i.has(e.id)) return;
    let a = c();
    r(e.id, !0);
    try {
      (await w(a, e.id, n), t({ ...e, status: n }));
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
      r = { ...e, filial_id: n.filialId };
    (await C(n, r), t(r));
  }
  return { avancarStatus: l, cancelarPedido: u, reabrirPedido: d, submitPedido: f, inFlight: i };
}
var E = i(),
  D = {
    orcamento: `bdg bk`,
    confirmado: `bdg bb`,
    em_separacao: `bdg ba`,
    entregue: `bdg bg`,
    cancelado: `bdg br`
  },
  O = {
    orcamento: `Orçamento`,
    confirmado: `Confirmado`,
    em_separacao: `Em separação`,
    entregue: `Entregue`,
    cancelado: `Cancelado`
  };
function k(e) {
  return (e ?? 0).toLocaleString(`pt-BR`, { style: `currency`, currency: `BRL` });
}
function A({ pedido: e, inFlight: t, onAvancar: n, onCancelar: r, onReabrir: i, onDetalhe: a }) {
  let o = h(e.status),
    s = D[o] ?? `bdg bk`,
    c = O[o] ?? o,
    l = p[o],
    u = m[o];
  return (0, E.jsxs)(`div`, {
    className: `list-row`,
    'data-testid': `pedido-row-${e.id}`,
    children: [
      (0, E.jsxs)(`div`, {
        className: `list-row-main`,
        children: [
          (0, E.jsxs)(`button`, {
            className: `btn-link list-row-title`,
            onClick: () => a(e.id),
            'data-testid': `pedido-row-title-${e.id}`,
            children: [`#`, e.num, ` — `, e.cli || `—`]
          }),
          (0, E.jsx)(`span`, { className: s, children: c }),
          e.data && (0, E.jsx)(`span`, { className: `list-row-meta`, children: e.data }),
          (0, E.jsx)(`span`, { className: `list-row-meta`, children: k(e.total) })
        ]
      }),
      (0, E.jsxs)(`div`, {
        className: `list-row-actions`,
        children: [
          l &&
            u &&
            (0, E.jsx)(`button`, {
              className: `btn btn-sm`,
              disabled: t,
              onClick: n,
              'data-testid': `pedido-acao-avancar-${e.id}`,
              children: t ? `...` : u
            }),
          o !== `cancelado` &&
            o !== `entregue` &&
            (0, E.jsx)(`button`, {
              className: `btn btn-sm btn-danger`,
              disabled: t,
              onClick: r,
              'data-testid': `pedido-acao-cancelar-${e.id}`,
              children: `Cancelar`
            }),
          o === `cancelado` &&
            (0, E.jsx)(`button`, {
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
var j = [
    { id: `emaberto`, label: `Em Aberto` },
    { id: `entregues`, label: `Entregues` },
    { id: `cancelados`, label: `Cancelados` }
  ],
  M = [
    { value: ``, label: `Todos` },
    { value: `orcamento`, label: `Orçamento` },
    { value: `confirmado`, label: `Confirmado` },
    { value: `em_separacao`, label: `Em separação` }
  ];
function N({ onNovoPedido: e, onDetalhe: t }) {
  let n = v((e) => e.activeTab),
    r = v((e) => e.setActiveTab),
    i = v((e) => e.filtro),
    a = v((e) => e.setFiltro),
    o = v((e) => e.status),
    s = v((e) => e.error),
    c = v(l(_)),
    { avancarStatus: u, cancelarPedido: d, reabrirPedido: f, inFlight: p } = T();
  return (0, E.jsxs)(`div`, {
    className: `screen-content`,
    'data-testid': `pedido-list-view`,
    children: [
      (0, E.jsx)(`div`, {
        className: `tabs`,
        children: j.map((e) =>
          (0, E.jsx)(
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
      (0, E.jsxs)(`div`, {
        className: `card card-shell`,
        children: [
          (0, E.jsxs)(`div`, {
            className: `toolbar toolbar-shell toolbar-shell--section`,
            children: [
              (0, E.jsxs)(`div`, {
                className: `toolbar-main`,
                children: [
                  (0, E.jsx)(`input`, {
                    className: `inp input-w-sm`,
                    placeholder: `Cliente ou número...`,
                    value: i.q,
                    onChange: (e) => a({ q: e.target.value }),
                    'data-testid': `pedido-busca`
                  }),
                  n === `emaberto` &&
                    (0, E.jsx)(`select`, {
                      className: `inp sel select-w-sm`,
                      value: i.status,
                      onChange: (e) => a({ status: e.target.value }),
                      'data-testid': `pedido-filtro-status`,
                      children: M.map((e) =>
                        (0, E.jsx)(`option`, { value: e.value, children: e.label }, e.value)
                      )
                    })
                ]
              }),
              (0, E.jsx)(`div`, {
                className: `toolbar-actions`,
                children: (0, E.jsx)(`button`, {
                  className: `btn btn-sm btn-p`,
                  onClick: e,
                  'data-testid': `pedido-novo-btn`,
                  children: `+ Novo pedido`
                })
              })
            ]
          }),
          o === `loading` &&
            (0, E.jsx)(`div`, {
              className: `empty`,
              'data-testid': `pedido-loading`,
              children: (0, E.jsx)(`p`, { children: `Carregando pedidos...` })
            }),
          o === `error` &&
            (0, E.jsx)(`div`, {
              className: `empty`,
              'data-testid': `pedido-error`,
              children: (0, E.jsx)(`p`, { children: s })
            }),
          o === `ready` &&
            c.length === 0 &&
            (0, E.jsx)(`div`, {
              className: `empty`,
              'data-testid': `pedido-empty`,
              children: (0, E.jsx)(`p`, { children: `Nenhum pedido encontrado.` })
            }),
          o === `ready` &&
            c.length > 0 &&
            (0, E.jsx)(`div`, {
              className: `list`,
              'data-testid': `pedido-list`,
              children: c.map((e) =>
                (0, E.jsx)(
                  A,
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
async function P(e) {
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
function F(e, t) {
  let n = t.trim().toLowerCase();
  return n ? (e.find((e) => e.id === t.trim() || e.nome.trim().toLowerCase() === n) ?? null) : null;
}
async function I(e) {
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
async function L(e) {
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
var R = { produtos: [], clientes: [], rcas: [], loading: !1, error: null };
function z() {
  let [t, r] = (0, u.useState)({ ...R, loading: !0 }),
    i = (0, u.useRef)(!1),
    a = n((e) => e.session),
    s = o((e) => e.filialId);
  return (
    (0, u.useEffect)(() => {
      if (i.current) return;
      if (!a?.access_token || !s) {
        r({ ...R, error: `Sessão ou filial ausente.` });
        return;
      }
      let { url: t, key: n, ready: o } = e();
      if (!o) {
        r({ ...R, error: `Configuração do Supabase ausente.` });
        return;
      }
      i.current = !0;
      let c = { url: t, key: n, token: a.access_token, filialId: s };
      Promise.all([I(c), P(c), L(c)])
        .then(([e, t, n]) => {
          r({ produtos: e, clientes: t, rcas: n, loading: !1, error: null });
        })
        .catch((e) => {
          ((i.current = !1),
            r({
              ...R,
              loading: !1,
              error: e instanceof Error ? e.message : `Erro ao carregar dados do formulário.`
            }));
        });
    }, [a, s]),
    t
  );
}
function B(e, t) {
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
function V({ produtos: e, tipo: t, onAdd: n }) {
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
    let a = B(r, t);
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
      g = parseFloat(s) || B(u, t),
      _ = parseFloat(l) || u.custo || 0;
    (n({
      prodId: r,
      nome: u.nome,
      un: u.un,
      qty: m,
      preco: g,
      custo: _,
      custo_base: u.custo,
      preco_base: B(u, t),
      orig: f
    }),
      i(``),
      o(`1`),
      c(``),
      d(``),
      p(`estoque`),
      h(null));
  }
  return (0, E.jsxs)(`div`, {
    'data-testid': `pedido-item-add`,
    children: [
      m &&
        (0, E.jsx)(`div`, {
          className: `empty-inline`,
          style: { color: `var(--color-danger)` },
          children: m
        }),
      (0, E.jsxs)(`div`, {
        className: `fg c5 form-gap-bottom-xxs`,
        children: [
          (0, E.jsxs)(`div`, {
            children: [
              (0, E.jsx)(`div`, { className: `fl`, children: `Produto` }),
              (0, E.jsxs)(`select`, {
                className: `inp sel`,
                value: r,
                onChange: (e) => g(e.target.value),
                'data-testid': `pedido-item-prod`,
                children: [
                  (0, E.jsx)(`option`, { value: ``, children: `- selecione -` }),
                  e.map((e) => (0, E.jsx)(`option`, { value: e.id, children: e.nome }, e.id))
                ]
              })
            ]
          }),
          (0, E.jsxs)(`div`, {
            children: [
              (0, E.jsx)(`div`, { className: `fl`, children: `Quantidade` }),
              (0, E.jsx)(`input`, {
                className: `inp`,
                type: `number`,
                min: `1`,
                value: a,
                onChange: (e) => o(e.target.value),
                'data-testid': `pedido-item-qty`
              })
            ]
          }),
          (0, E.jsxs)(`div`, {
            children: [
              (0, E.jsx)(`div`, { className: `fl`, children: `Preço unit. (R$)` }),
              (0, E.jsx)(`input`, {
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
          (0, E.jsxs)(`div`, {
            children: [
              (0, E.jsx)(`div`, { className: `fl`, children: `Custo aplicado (R$)` }),
              (0, E.jsx)(`input`, {
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
          (0, E.jsxs)(`div`, {
            children: [
              (0, E.jsx)(`div`, { className: `fl`, children: `Origem` }),
              (0, E.jsxs)(`select`, {
                className: `inp sel`,
                value: f,
                onChange: (e) => p(e.target.value),
                'data-testid': `pedido-item-orig`,
                children: [
                  (0, E.jsx)(`option`, { value: `estoque`, children: `Estoque` }),
                  (0, E.jsx)(`option`, { value: `fornecedor`, children: `Fornecedor` })
                ]
              })
            ]
          })
        ]
      }),
      (0, E.jsx)(`div`, {
        className: `modal-actions modal-actions-inline`,
        children: (0, E.jsx)(`button`, {
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
function H(e) {
  return e.toLocaleString(`pt-BR`, { style: `currency`, currency: `BRL` });
}
function U({ item: e, index: t, readOnly: n, onRemove: r }) {
  let i = e.qty * e.preco,
    a = (e.preco - e.custo) * e.qty,
    o = e.preco > 0 ? ((e.preco - e.custo) / e.preco) * 100 : 0;
  return (0, E.jsxs)(`tr`, {
    'data-testid': `pedido-item-row-${t}`,
    children: [
      (0, E.jsx)(`td`, { className: `table-cell-strong`, children: e.nome }),
      (0, E.jsx)(`td`, {
        children: (0, E.jsx)(`span`, {
          className: `bdg ${e.orig === `estoque` ? `bg` : `bb`}`,
          children: e.orig === `estoque` ? `Estoque` : `Fornecedor`
        })
      }),
      (0, E.jsxs)(`td`, { children: [e.qty, ` `, e.un] }),
      (0, E.jsx)(`td`, { className: `table-cell-muted`, children: H(e.custo) }),
      (0, E.jsx)(`td`, { children: H(e.preco) }),
      (0, E.jsx)(`td`, { className: `table-cell-strong`, children: H(i) }),
      (0, E.jsx)(`td`, {
        className: `table-cell-strong ${a >= 0 ? `table-cell-success` : `table-cell-danger`}`,
        children: H(a)
      }),
      (0, E.jsxs)(`td`, { className: `table-cell-strong`, children: [o.toFixed(1), `%`] }),
      !n &&
        (0, E.jsx)(`td`, {
          children: (0, E.jsx)(`button`, {
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
function W(e) {
  return e.toLocaleString(`pt-BR`, { style: `currency`, currency: `BRL` });
}
function G({ itens: e, produtos: t, tipo: n, readOnly: r, onAdd: i, onRemove: a }) {
  let o = e.reduce((e, t) => e + t.qty * t.preco, 0),
    s = e.reduce((e, t) => e + (t.preco - t.custo) * t.qty, 0);
  return (0, E.jsxs)(`div`, {
    'data-testid': `pedido-items-section`,
    children: [
      (0, E.jsx)(`div`, { className: `div` }),
      (0, E.jsx)(`div`, { className: `ct`, children: `Itens do pedido` }),
      !r && i && (0, E.jsx)(V, { produtos: t, tipo: n, onAdd: i }),
      e.length === 0
        ? (0, E.jsx)(`div`, { className: `empty-inline`, children: `Nenhum item.` })
        : (0, E.jsxs)(E.Fragment, {
            children: [
              (0, E.jsx)(`div`, {
                className: `tw ped-items-wrap`,
                children: (0, E.jsxs)(`table`, {
                  className: `tbl ped-items-table`,
                  children: [
                    (0, E.jsx)(`thead`, {
                      children: (0, E.jsxs)(`tr`, {
                        children: [
                          (0, E.jsx)(`th`, { children: `Produto` }),
                          (0, E.jsx)(`th`, { children: `Origem` }),
                          (0, E.jsx)(`th`, { children: `Qtd` }),
                          (0, E.jsx)(`th`, { children: `Custo` }),
                          (0, E.jsx)(`th`, { children: `Preço` }),
                          (0, E.jsx)(`th`, { children: `Subtotal` }),
                          (0, E.jsx)(`th`, { children: `Lucro` }),
                          (0, E.jsx)(`th`, { children: `Margem` }),
                          !r && (0, E.jsx)(`th`, {})
                        ]
                      })
                    }),
                    (0, E.jsx)(`tbody`, {
                      children: e.map((e, t) =>
                        (0, E.jsx)(U, { item: e, index: t, readOnly: r, onRemove: a }, t)
                      )
                    })
                  ]
                })
              }),
              (0, E.jsx)(`div`, {
                className: `panel ped-total-panel`,
                children: (0, E.jsxs)(`div`, {
                  className: `fb`,
                  children: [
                    (0, E.jsx)(`span`, {
                      className: `ped-total-label`,
                      children: `Total do pedido`
                    }),
                    (0, E.jsxs)(`span`, {
                      className: `ped-total-value`,
                      children: [W(o), ` | Lucro `, W(s)]
                    })
                  ]
                })
              })
            ]
          })
    ]
  });
}
function K() {
  return new Date().toISOString().split(`T`)[0];
}
function q(e) {
  let t = e.map((e) => e.num).filter((e) => typeof e == `number` && !isNaN(e));
  return t.length ? Math.max(...t) + 1 : 1;
}
function J({ initialPedido: e, onSaved: t, onCancel: n }) {
  let r = v((e) => e.pedidos),
    { submitPedido: i } = T(),
    { produtos: a, clientes: o, rcas: s, loading: c, error: l } = z(),
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
    [_, y] = (0, u.useState)(e?.data ?? K()),
    [b, x] = (0, u.useState)(h(e?.status) || `orcamento`),
    [S, C] = (0, u.useState)(e?.pgto ?? `a_vista`),
    [w, D] = (0, u.useState)(e?.prazo ?? `imediato`),
    [O, k] = (0, u.useState)(e?.tipo ?? `varejo`),
    [A, j] = (0, u.useState)(e?.obs ?? ``),
    [M, N] = (0, u.useState)(d),
    [P, I] = (0, u.useState)(!1),
    [L, R] = (0, u.useState)(null);
  function B(e) {
    N((t) => [...t, e]);
  }
  function V(e) {
    N((t) => t.filter((t, n) => n !== e));
  }
  async function H(n) {
    (n.preventDefault(), R(null));
    let a = f.trim();
    if (!a) {
      R(`Cliente é obrigatório.`);
      return;
    }
    let c = F(o, a);
    if (!c) {
      R(`Cliente inválido. Escolha um cliente cadastrado na lista.`);
      return;
    }
    if (M.length === 0) {
      R(`Adicione ao menos 1 item ao pedido.`);
      return;
    }
    let l = s.find((e) => e.id === m)?.nome ?? c.rca_nome ?? ``,
      u = M.reduce((e, t) => e + t.qty * t.preco, 0),
      d = {
        id: e?.id ?? globalThis.crypto.randomUUID(),
        num: e?.num ?? q(r),
        cli: c.nome,
        cliente_id: c.id,
        rca_id: m || null,
        rca_nome: l || null,
        data: _,
        status: b,
        pgto: S,
        prazo: w,
        tipo: O,
        obs: A.trim(),
        itens: M,
        total: u
      };
    I(!0);
    try {
      (await i(d), t(d));
    } catch (e) {
      R(e instanceof Error ? e.message : `Erro ao salvar pedido.`);
    } finally {
      I(!1);
    }
  }
  return (0, E.jsxs)(`div`, {
    className: `card card-shell`,
    'data-testid': `pedido-form`,
    children: [
      (0, E.jsx)(`div`, {
        className: `modal-shell-head`,
        children: (0, E.jsx)(`div`, {
          className: `mt`,
          children: e ? `Editar pedido #${e.num}` : `Novo pedido`
        })
      }),
      c &&
        (0, E.jsx)(`div`, {
          className: `empty`,
          children: (0, E.jsx)(`p`, { children: `Carregando dados do formulário...` })
        }),
      l && (0, E.jsx)(`div`, { className: `empty`, children: (0, E.jsx)(`p`, { children: l }) }),
      !c &&
        !l &&
        (0, E.jsxs)(`form`, {
          onSubmit: (e) => void H(e),
          children: [
            (0, E.jsxs)(`div`, {
              className: `modal-shell-body`,
              children: [
                L &&
                  (0, E.jsx)(`div`, {
                    className: `empty-inline`,
                    style: { color: `var(--color-danger)`, marginBottom: `0.5rem` },
                    children: L
                  }),
                (0, E.jsxs)(`div`, {
                  className: `fg c3`,
                  children: [
                    (0, E.jsxs)(`div`, {
                      children: [
                        (0, E.jsx)(`div`, { className: `fl`, children: `Cliente *` }),
                        (0, E.jsx)(`input`, {
                          className: `inp`,
                          list: `ped-form-cli-dl`,
                          placeholder: `Nome do cliente`,
                          value: f,
                          onChange: (e) => p(e.target.value),
                          'data-testid': `pedido-form-cli`
                        }),
                        (0, E.jsx)(`datalist`, {
                          id: `ped-form-cli-dl`,
                          children: o.map((e) => (0, E.jsx)(`option`, { value: e.nome }, e.id))
                        })
                      ]
                    }),
                    (0, E.jsxs)(`div`, {
                      children: [
                        (0, E.jsx)(`div`, { className: `fl`, children: `RCA / Vendedor` }),
                        (0, E.jsxs)(`select`, {
                          className: `inp sel`,
                          value: m,
                          onChange: (e) => g(e.target.value),
                          'data-testid': `pedido-form-rca`,
                          children: [
                            (0, E.jsx)(`option`, { value: ``, children: `Sem RCA` }),
                            s.map((e) =>
                              (0, E.jsx)(`option`, { value: e.id, children: e.nome }, e.id)
                            )
                          ]
                        })
                      ]
                    }),
                    (0, E.jsxs)(`div`, {
                      children: [
                        (0, E.jsx)(`div`, { className: `fl`, children: `Data` }),
                        (0, E.jsx)(`input`, {
                          className: `inp`,
                          type: `date`,
                          value: _,
                          onChange: (e) => y(e.target.value),
                          'data-testid': `pedido-form-data`
                        })
                      ]
                    }),
                    (0, E.jsxs)(`div`, {
                      children: [
                        (0, E.jsx)(`div`, { className: `fl`, children: `Status` }),
                        (0, E.jsxs)(`select`, {
                          className: `inp sel`,
                          value: b,
                          onChange: (e) => x(e.target.value),
                          'data-testid': `pedido-form-status`,
                          children: [
                            (0, E.jsx)(`option`, { value: `orcamento`, children: `Orçamento` }),
                            (0, E.jsx)(`option`, { value: `confirmado`, children: `Confirmado` }),
                            (0, E.jsx)(`option`, {
                              value: `em_separacao`,
                              children: `Em separação`
                            }),
                            (0, E.jsx)(`option`, { value: `entregue`, children: `Entregue` }),
                            (0, E.jsx)(`option`, { value: `cancelado`, children: `Cancelado` })
                          ]
                        })
                      ]
                    })
                  ]
                }),
                (0, E.jsxs)(`div`, {
                  className: `fg c3`,
                  children: [
                    (0, E.jsxs)(`div`, {
                      children: [
                        (0, E.jsx)(`div`, { className: `fl`, children: `Pagamento` }),
                        (0, E.jsxs)(`select`, {
                          className: `inp sel`,
                          value: S,
                          onChange: (e) => C(e.target.value),
                          'data-testid': `pedido-form-pgto`,
                          children: [
                            (0, E.jsx)(`option`, { value: `a_vista`, children: `À vista` }),
                            (0, E.jsx)(`option`, { value: `pix`, children: `PIX` }),
                            (0, E.jsx)(`option`, { value: `boleto`, children: `Boleto` }),
                            (0, E.jsx)(`option`, { value: `cartao`, children: `Cartão` }),
                            (0, E.jsx)(`option`, { value: `cheque`, children: `Cheque` })
                          ]
                        })
                      ]
                    }),
                    (0, E.jsxs)(`div`, {
                      children: [
                        (0, E.jsx)(`div`, { className: `fl`, children: `Prazo` }),
                        (0, E.jsxs)(`select`, {
                          className: `inp sel`,
                          value: w,
                          onChange: (e) => D(e.target.value),
                          'data-testid': `pedido-form-prazo`,
                          children: [
                            (0, E.jsx)(`option`, { value: `imediato`, children: `Imediato` }),
                            (0, E.jsx)(`option`, { value: `7d`, children: `7 dias` }),
                            (0, E.jsx)(`option`, { value: `15d`, children: `15 dias` }),
                            (0, E.jsx)(`option`, { value: `30d`, children: `30 dias` }),
                            (0, E.jsx)(`option`, { value: `60d`, children: `60 dias` })
                          ]
                        })
                      ]
                    }),
                    (0, E.jsxs)(`div`, {
                      children: [
                        (0, E.jsx)(`div`, { className: `fl`, children: `Tipo de venda` }),
                        (0, E.jsxs)(`select`, {
                          className: `inp sel`,
                          value: O,
                          onChange: (e) => k(e.target.value),
                          'data-testid': `pedido-form-tipo`,
                          children: [
                            (0, E.jsx)(`option`, { value: `varejo`, children: `Varejo` }),
                            (0, E.jsx)(`option`, { value: `atacado`, children: `Atacado` })
                          ]
                        })
                      ]
                    })
                  ]
                }),
                (0, E.jsx)(G, { itens: M, produtos: a, tipo: O, onAdd: B, onRemove: V }),
                (0, E.jsx)(`div`, {
                  className: `fg form-gap-top`,
                  children: (0, E.jsxs)(`div`, {
                    children: [
                      (0, E.jsx)(`div`, { className: `fl`, children: `Observações` }),
                      (0, E.jsx)(`textarea`, {
                        className: `inp`,
                        rows: 2,
                        value: A,
                        onChange: (e) => j(e.target.value),
                        'data-testid': `pedido-form-obs`
                      })
                    ]
                  })
                })
              ]
            }),
            (0, E.jsx)(`div`, {
              className: `modal-shell-foot`,
              children: (0, E.jsxs)(`div`, {
                className: `modal-actions`,
                children: [
                  (0, E.jsx)(`button`, {
                    className: `btn`,
                    type: `button`,
                    onClick: n,
                    disabled: P,
                    children: `Cancelar`
                  }),
                  (0, E.jsx)(`button`, {
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
var Y = {
    orcamento: `Orçamento`,
    confirmado: `Confirmado`,
    em_separacao: `Em separação`,
    entregue: `Entregue`,
    cancelado: `Cancelado`
  },
  X = {
    orcamento: `bdg bk`,
    confirmado: `bdg bb`,
    em_separacao: `bdg ba`,
    entregue: `bdg bg`,
    cancelado: `bdg br`
  },
  Z = { a_vista: `À vista`, pix: `PIX`, boleto: `Boleto`, cartao: `Cartão`, cheque: `Cheque` },
  Q = {
    imediato: `Imediato`,
    '7d': `7 dias`,
    '15d': `15 dias`,
    '30d': `30 dias`,
    '60d': `60 dias`
  };
function ee(e) {
  return (e ?? 0).toLocaleString(`pt-BR`, { style: `currency`, currency: `BRL` });
}
function te(e) {
  if (Array.isArray(e.itens)) return e.itens;
  try {
    let t = JSON.parse(e.itens);
    return Array.isArray(t) ? t : [];
  } catch {
    return [];
  }
}
function ne({ pedido: e, onEditar: t, onClose: n }) {
  let { avancarStatus: r, cancelarPedido: i, reabrirPedido: a, inFlight: o } = T(),
    s = h(e.status),
    c = X[s] ?? `bdg bk`,
    l = Y[s] ?? s,
    u = p[s],
    d = m[s],
    f = o.has(e.id),
    g = te(e);
  return (0, E.jsxs)(`div`, {
    className: `card card-shell`,
    'data-testid': `pedido-detail-panel`,
    children: [
      (0, E.jsxs)(`div`, {
        className: `modal-shell-head`,
        children: [
          (0, E.jsxs)(`div`, {
            children: [
              (0, E.jsxs)(`div`, { className: `mt`, children: [`Pedido #`, e.num] }),
              (0, E.jsxs)(`div`, {
                className: `cli-react-shell__chips`,
                style: { marginTop: `0.25rem` },
                children: [
                  (0, E.jsx)(`span`, { className: c, children: l }),
                  e.data && (0, E.jsx)(`span`, { className: `bdg bk`, children: e.data }),
                  (0, E.jsx)(`span`, { className: `bdg bg`, children: ee(e.total) })
                ]
              })
            ]
          }),
          (0, E.jsxs)(`div`, {
            style: { display: `flex`, gap: `0.5rem`, alignItems: `flex-start` },
            children: [
              (0, E.jsx)(`button`, {
                className: `btn btn-sm`,
                onClick: () => t(e.id),
                'data-testid': `pedido-detail-editar`,
                children: `Editar`
              }),
              (0, E.jsx)(`button`, {
                className: `btn btn-sm`,
                onClick: n,
                'data-testid': `pedido-detail-close`,
                children: `Fechar`
              })
            ]
          })
        ]
      }),
      (0, E.jsxs)(`div`, {
        className: `modal-shell-body`,
        children: [
          (0, E.jsxs)(`div`, {
            className: `fg c3`,
            children: [
              (0, E.jsxs)(`div`, {
                children: [
                  (0, E.jsx)(`div`, { className: `fl`, children: `Cliente` }),
                  (0, E.jsx)(`div`, { className: `fv`, children: e.cli || `—` })
                ]
              }),
              e.rca_nome &&
                (0, E.jsxs)(`div`, {
                  children: [
                    (0, E.jsx)(`div`, { className: `fl`, children: `RCA` }),
                    (0, E.jsx)(`div`, { className: `fv`, children: e.rca_nome })
                  ]
                }),
              (0, E.jsxs)(`div`, {
                children: [
                  (0, E.jsx)(`div`, { className: `fl`, children: `Tipo` }),
                  (0, E.jsx)(`div`, {
                    className: `fv`,
                    children: e.tipo === `atacado` ? `Atacado` : `Varejo`
                  })
                ]
              }),
              (0, E.jsxs)(`div`, {
                children: [
                  (0, E.jsx)(`div`, { className: `fl`, children: `Pagamento` }),
                  (0, E.jsx)(`div`, { className: `fv`, children: Z[e.pgto ?? ``] ?? e.pgto ?? `—` })
                ]
              }),
              (0, E.jsxs)(`div`, {
                children: [
                  (0, E.jsx)(`div`, { className: `fl`, children: `Prazo` }),
                  (0, E.jsx)(`div`, {
                    className: `fv`,
                    children: Q[e.prazo ?? ``] ?? e.prazo ?? `—`
                  })
                ]
              }),
              e.obs &&
                (0, E.jsxs)(`div`, {
                  children: [
                    (0, E.jsx)(`div`, { className: `fl`, children: `Obs.` }),
                    (0, E.jsx)(`div`, { className: `fv`, children: e.obs })
                  ]
                })
            ]
          }),
          (0, E.jsx)(G, { itens: g, produtos: [], tipo: e.tipo ?? `varejo`, readOnly: !0 }),
          (0, E.jsxs)(`div`, {
            className: `modal-actions`,
            style: { marginTop: `1rem` },
            children: [
              u &&
                d &&
                (0, E.jsx)(`button`, {
                  className: `btn btn-sm`,
                  disabled: f,
                  onClick: () => void r(e),
                  'data-testid': `pedido-detail-avancar`,
                  children: f ? `...` : d
                }),
              s !== `cancelado` &&
                s !== `entregue` &&
                (0, E.jsx)(`button`, {
                  className: `btn btn-sm btn-danger`,
                  disabled: f,
                  onClick: () => void i(e),
                  'data-testid': `pedido-detail-cancelar`,
                  children: `Cancelar`
                }),
              s === `cancelado` &&
                (0, E.jsx)(`button`, {
                  className: `btn btn-sm`,
                  disabled: f,
                  onClick: () => void a(e),
                  'data-testid': `pedido-detail-reabrir`,
                  children: `Reabrir`
                })
            ]
          })
        ]
      })
    ]
  });
}
var re = `pedidos-react-pilot`,
  ie = `pedidos-legacy-shell`;
function ae() {
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
        if (!(!t || t.source !== ie)) {
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
          source: re,
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
    (0, E.jsxs)(`div`, {
      'data-testid': `pedidos-pilot-page`,
      children: [
        (0, E.jsx)(N, {
          onNovoPedido: () => {
            (p(null), d(`new`));
          },
          onDetalhe: (e) => {
            (d(null), p(e));
          }
        }),
        h &&
          !c &&
          (0, E.jsx)(ne, {
            pedido: h,
            onEditar: (e) => {
              (p(null), d(e));
            },
            onClose: () => p(null)
          }),
        c &&
          (0, E.jsx)(J, {
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
function oe(t = {}) {
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
function se() {
  return (oe(), (0, E.jsx)(ae, {}));
}
function ce(e) {
  (($ = (0, d.createRoot)(e)),
    $.render((0, E.jsx)(u.StrictMode, { children: (0, E.jsx)(se, {}) })));
}
function le() {
  $ &&= ($.unmount(), null);
}
window.__SC_PEDIDOS_DIRECT_BRIDGE__ = { mount: ce, unmount: le };
