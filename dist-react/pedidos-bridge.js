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
async function C(e, t, n) {
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
function w() {
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
      (await C(a, e.id, n), t({ ...e, status: n }));
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
      (await C(a, e.id, `cancelado`), t({ ...e, status: `cancelado` }));
    } finally {
      r(e.id, !1);
    }
  }
  async function d(e) {
    if (h(e.status) !== `cancelado` || i.has(e.id)) return;
    let n = c();
    r(e.id, !0);
    try {
      (await C(n, e.id, `orcamento`), t({ ...e, status: `orcamento` }));
    } finally {
      r(e.id, !1);
    }
  }
  return { avancarStatus: l, cancelarPedido: u, reabrirPedido: d, inFlight: i };
}
var T = i(),
  E = {
    orcamento: `bdg bk`,
    confirmado: `bdg bb`,
    em_separacao: `bdg ba`,
    entregue: `bdg bg`,
    cancelado: `bdg br`
  },
  D = {
    orcamento: `Orçamento`,
    confirmado: `Confirmado`,
    em_separacao: `Em separação`,
    entregue: `Entregue`,
    cancelado: `Cancelado`
  };
function O(e) {
  return (e ?? 0).toLocaleString(`pt-BR`, { style: `currency`, currency: `BRL` });
}
function k({ pedido: e, inFlight: t, onAvancar: n, onCancelar: r, onReabrir: i }) {
  let a = h(e.status),
    o = E[a] ?? `bdg bk`,
    s = D[a] ?? a,
    c = p[a],
    l = m[a];
  return (0, T.jsxs)(`div`, {
    className: `list-row`,
    'data-testid': `pedido-row-${e.id}`,
    children: [
      (0, T.jsxs)(`div`, {
        className: `list-row-main`,
        children: [
          (0, T.jsxs)(`span`, {
            className: `list-row-title`,
            children: [`#`, e.num, ` — `, e.cli || `—`]
          }),
          (0, T.jsx)(`span`, { className: o, children: s }),
          e.data && (0, T.jsx)(`span`, { className: `list-row-meta`, children: e.data }),
          (0, T.jsx)(`span`, { className: `list-row-meta`, children: O(e.total) })
        ]
      }),
      (0, T.jsxs)(`div`, {
        className: `list-row-actions`,
        children: [
          c &&
            l &&
            (0, T.jsx)(`button`, {
              className: `btn btn-sm`,
              disabled: t,
              onClick: n,
              'data-testid': `pedido-acao-avancar-${e.id}`,
              children: t ? `...` : l
            }),
          a !== `cancelado` &&
            a !== `entregue` &&
            (0, T.jsx)(`button`, {
              className: `btn btn-sm btn-danger`,
              disabled: t,
              onClick: r,
              'data-testid': `pedido-acao-cancelar-${e.id}`,
              children: `Cancelar`
            }),
          a === `cancelado` &&
            (0, T.jsx)(`button`, {
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
var A = [
    { id: `emaberto`, label: `Em Aberto` },
    { id: `entregues`, label: `Entregues` },
    { id: `cancelados`, label: `Cancelados` }
  ],
  j = [
    { value: ``, label: `Todos` },
    { value: `orcamento`, label: `Orçamento` },
    { value: `confirmado`, label: `Confirmado` },
    { value: `em_separacao`, label: `Em separação` }
  ];
function M() {
  let e = v((e) => e.activeTab),
    t = v((e) => e.setActiveTab),
    n = v((e) => e.filtro),
    r = v((e) => e.setFiltro),
    i = v((e) => e.status),
    a = v((e) => e.error),
    o = v(l(_)),
    { avancarStatus: s, cancelarPedido: c, reabrirPedido: u, inFlight: d } = w();
  return (0, T.jsxs)(`div`, {
    className: `screen-content`,
    'data-testid': `pedido-list-view`,
    children: [
      (0, T.jsx)(`div`, {
        className: `tabs`,
        children: A.map((n) =>
          (0, T.jsx)(
            `button`,
            {
              className: `tb${e === n.id ? ` on` : ``}`,
              onClick: () => t(n.id),
              children: n.label
            },
            n.id
          )
        )
      }),
      (0, T.jsxs)(`div`, {
        className: `card card-shell`,
        children: [
          (0, T.jsx)(`div`, {
            className: `toolbar toolbar-shell toolbar-shell--section`,
            children: (0, T.jsxs)(`div`, {
              className: `toolbar-main`,
              children: [
                (0, T.jsx)(`input`, {
                  className: `inp input-w-sm`,
                  placeholder: `Cliente ou número...`,
                  value: n.q,
                  onChange: (e) => r({ q: e.target.value }),
                  'data-testid': `pedido-busca`
                }),
                e === `emaberto` &&
                  (0, T.jsx)(`select`, {
                    className: `inp sel select-w-sm`,
                    value: n.status,
                    onChange: (e) => r({ status: e.target.value }),
                    'data-testid': `pedido-filtro-status`,
                    children: j.map((e) =>
                      (0, T.jsx)(`option`, { value: e.value, children: e.label }, e.value)
                    )
                  })
              ]
            })
          }),
          i === `loading` &&
            (0, T.jsx)(`div`, {
              className: `empty`,
              'data-testid': `pedido-loading`,
              children: (0, T.jsx)(`p`, { children: `Carregando pedidos...` })
            }),
          i === `error` &&
            (0, T.jsx)(`div`, {
              className: `empty`,
              'data-testid': `pedido-error`,
              children: (0, T.jsx)(`p`, { children: a })
            }),
          i === `ready` &&
            o.length === 0 &&
            (0, T.jsx)(`div`, {
              className: `empty`,
              'data-testid': `pedido-empty`,
              children: (0, T.jsx)(`p`, { children: `Nenhum pedido encontrado.` })
            }),
          i === `ready` &&
            o.length > 0 &&
            (0, T.jsx)(`div`, {
              className: `list`,
              'data-testid': `pedido-list`,
              children: o.map((e) =>
                (0, T.jsx)(
                  k,
                  {
                    pedido: e,
                    inFlight: d.has(e.id),
                    onAvancar: () => void s(e),
                    onCancelar: () => void c(e),
                    onReabrir: () => void u(e)
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
var N = `pedidos-react-pilot`,
  P = `pedidos-legacy-shell`;
function F() {
  let e = v(l((e) => e.pedidos)),
    t = v((e) => e.activeTab),
    n = v((e) => e.setActiveTab),
    r = v((e) => e.filtro),
    i = v((e) => e.clearFiltro),
    a = v((e) => e.status),
    o = v((e) => e.error),
    s = v(l(_));
  return (
    (0, u.useEffect)(() => {
      function e(e) {
        if (e.origin !== window.location.origin) return;
        let t = e.data;
        if (!(!t || t.source !== P)) {
          if (t.type === `pedidos:set-tab` && t.tab) {
            n(t.tab);
            return;
          }
          if (t.type === `pedidos:limpar-filtros`) {
            i();
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
      let n = [r.q, r.status].filter(Boolean).length;
      window.postMessage(
        {
          source: N,
          type: `pedidos:state`,
          state: {
            tab: t,
            status: a === `loading` ? `loading` : o ? `error` : `ready`,
            count: s.length,
            filtersActive: n,
            totalPedidos: e.length
          }
        },
        window.location.origin
      );
    }, [t, a, o, r.q, r.status, s.length, e.length]),
    (0, T.jsx)(`div`, { 'data-testid': `pedidos-pilot-page`, children: (0, T.jsx)(M, {}) })
  );
}
function I(t = {}) {
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
var L = null;
function R() {
  return (I(), (0, T.jsx)(F, {}));
}
function z(e) {
  ((L = (0, d.createRoot)(e)), L.render((0, T.jsx)(u.StrictMode, { children: (0, T.jsx)(R, {}) })));
}
function B() {
  L &&= (L.unmount(), null);
}
window.__SC_PEDIDOS_DIRECT_BRIDGE__ = { mount: z, unmount: B };
