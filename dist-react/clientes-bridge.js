import {
  a as e,
  c as t,
  i as n,
  n as r,
  o as i,
  r as a,
  s as o,
  t as s
} from './jsx-runtime-CBjllbA9.js';
var c = (e) => Symbol.iterator in e,
  l = (e) => `entries` in e,
  u = (e, t) => {
    let n = e instanceof Map ? e : new Map(e.entries()),
      r = t instanceof Map ? t : new Map(t.entries());
    if (n.size !== r.size) return !1;
    for (let [e, t] of n) if (!r.has(e) || !Object.is(t, r.get(e))) return !1;
    return !0;
  },
  d = (e, t) => {
    let n = e[Symbol.iterator](),
      r = t[Symbol.iterator](),
      i = n.next(),
      a = r.next();
    for (; !i.done && !a.done; ) {
      if (!Object.is(i.value, a.value)) return !1;
      ((i = n.next()), (a = r.next()));
    }
    return !!i.done && !!a.done;
  };
function f(e, t) {
  return Object.is(e, t)
    ? !0
    : typeof e != `object` ||
        !e ||
        typeof t != `object` ||
        !t ||
        Object.getPrototypeOf(e) !== Object.getPrototypeOf(t)
      ? !1
      : c(e) && c(t)
        ? l(e) && l(t)
          ? u(e, t)
          : d(e, t)
        : u({ entries: () => Object.entries(e) }, { entries: () => Object.entries(t) });
}
var p = t(o(), 1);
function m(e) {
  let t = p.useRef(void 0);
  return (n) => {
    let r = e(n);
    return f(t.current, r) ? t.current : (t.current = r);
  };
}
var h = i();
function g(e) {
  return String(e || ``)
    .normalize(`NFD`)
    .replace(/[\u0300-\u036f]/g, ``)
    .toLowerCase()
    .trim();
}
function _(e) {
  let t = Array.isArray(e) ? e : String(e || ``).split(/[,;\n]+/),
    n = new Set(),
    r = [];
  for (let e of t) {
    let t = String(e || ``).trim();
    if (!t) continue;
    let i = g(t);
    n.has(i) || (n.add(i), r.push(t));
  }
  return r;
}
function v(e, t) {
  let n = g(t?.q),
    r = String(t?.seg || ``).trim(),
    i = g(r).replace(/[^a-z0-9]/g, ``),
    a = t?.status || ``;
  return e.filter((e) => {
    let t = [e.nome, e.apelido, e.seg, e.resp, e.email, e.tel, e.whatsapp, _(e.time).join(` `)]
        .map(g)
        .join(` `),
      o = g(e.seg || `Sem segmento`).replace(/[^a-z0-9]/g, ``);
    return (!n || t.includes(n)) && (!r || o === i) && (!a || e.status === a);
  });
}
function y(e) {
  return [...new Set(e.map((e) => e.seg || `Sem segmento`))].sort((e, t) => e.localeCompare(t));
}
function b(e) {
  return v(e.clientes, e.filtro);
}
function x(e) {
  return y(e.clientes);
}
var S = { q: ``, seg: ``, status: `` },
  C = e((e) => ({
    clientes: [],
    status: `idle`,
    error: null,
    filtro: { ...S },
    setClientes: (t) => e({ clientes: t, status: `ready`, error: null }),
    setStatus: (t, n) => e({ status: t, error: n ?? null }),
    setFiltro: (t) => e((e) => ({ filtro: { ...e.filtro, ...t } })),
    clearFiltro: () => e({ filtro: { ...S } }),
    upsertCliente: (t) =>
      e((e) => ({
        clientes: e.clientes.some((e) => e.id === t.id)
          ? e.clientes.map((e) => (e.id === t.id ? t : e))
          : [...e.clientes, t].sort((e, t) => e.nome.localeCompare(t.nome)),
        status: `ready`,
        error: null
      })),
    removeCliente: (t) =>
      e((e) => ({ clientes: e.clientes.filter((e) => e.id !== t), status: `ready`, error: null }))
  }));
function w(e, t, n) {
  return {
    apikey: e,
    Authorization: `Bearer ${t}`,
    'Content-Type': `application/json`,
    ...(n ? { Prefer: n } : {})
  };
}
async function T(e) {
  let t = await e.text().catch(() => ``);
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}
function E(e, t, n) {
  if (!e.ok)
    throw t && typeof t == `object` && `message` in t && typeof t.message == `string`
      ? Error(t.message)
      : Error(n);
}
function ee(e, t) {
  return `${e}/rest/v1/clientes?id=eq.${encodeURIComponent(t)}`;
}
function te(e, t) {
  return {
    id: e.id ?? void 0,
    filial_id: t,
    nome: e.nome.trim(),
    rca_id: e.rca_id ?? null,
    rca_nome: e.rca_nome ?? null,
    apelido: e.apelido ?? ``,
    doc: e.doc ?? ``,
    tipo: e.tipo ?? `PJ`,
    status: e.status ?? `ativo`,
    tel: e.tel ?? ``,
    whatsapp: e.whatsapp ?? ``,
    email: e.email ?? ``,
    data_aniversario: e.data_aniversario ?? ``,
    time: e.time ?? ``,
    resp: e.resp ?? ``,
    seg: e.seg ?? ``,
    tab: e.tab ?? `padrao`,
    prazo: e.prazo ?? `a_vista`,
    cidade: e.cidade ?? ``,
    estado: e.estado ?? ``,
    obs: e.obs ?? ``,
    optin_marketing: !!e.optin_marketing,
    optin_email: !!e.optin_email,
    optin_sms: !!e.optin_sms
  };
}
async function ne(e, t) {
  let n = te(t, e.filialId),
    r = await fetch(`${e.url}/rest/v1/clientes?on_conflict=id`, {
      method: `POST`,
      headers: w(e.key, e.token, `resolution=merge-duplicates,return=representation`),
      body: JSON.stringify(n),
      signal: AbortSignal.timeout(12e3)
    }),
    i = await T(r);
  return (
    E(r, i, `Erro ${r.status} ao salvar cliente`),
    Array.isArray(i) && i[0] ? i[0] : t.id ? { ...n, id: t.id } : null
  );
}
async function re(e, t) {
  let n = await fetch(ee(e.url, t), {
    method: `DELETE`,
    headers: w(e.key, e.token),
    signal: AbortSignal.timeout(12e3)
  });
  E(n, await T(n), `Erro ${n.status} ao remover cliente`);
}
function D() {
  let e = C((e) => e.upsertCliente),
    t = C((e) => e.removeCliente),
    i = a((e) => e.session),
    o = r((e) => e.filialId),
    [s, c] = (0, p.useState)(!1),
    [l, u] = (0, p.useState)(null),
    [d, f] = (0, p.useState)(null);
  function m() {
    if (!i?.access_token) throw Error(`Sessão expirada. Faça login novamente.`);
    if (!o) throw Error(`Nenhuma filial selecionada.`);
    let { url: e, key: t, ready: r } = n();
    if (!r) throw Error(`Configuração do Supabase ausente.`);
    return { url: e, key: t, token: i.access_token, filialId: o };
  }
  async function h(t) {
    let n = m();
    (c(!0), f(null));
    try {
      let r = (await ne(n, t)) ?? { ...t, id: t.id ?? crypto.randomUUID(), filial_id: n.filialId };
      return (e(r), r);
    } catch (e) {
      throw (f(e instanceof Error ? e.message : `Erro ao salvar cliente.`), e);
    } finally {
      c(!1);
    }
  }
  async function g(e) {
    let n = m();
    (u(e), f(null));
    try {
      (await re(n, e), t(e));
    } catch (e) {
      throw (f(e instanceof Error ? e.message : `Erro ao remover cliente.`), e);
    } finally {
      u(null);
    }
  }
  return { submitCliente: h, deleteClienteById: g, saving: s, deletingId: l, error: d };
}
var O = s(),
  k = [
    { bg: `#E6EEF9`, c: `#0F2F5E` },
    { bg: `#E6F4EC`, c: `#0D3D22` },
    { bg: `#FAF0D6`, c: `#5C3900` },
    { bg: `#FAEBE9`, c: `#731F18` }
  ],
  A = {
    ativo: { label: `Ativo`, cls: `bdg bg` },
    inativo: { label: `Inativo`, cls: `bdg bk` },
    prospecto: { label: `Prospecto`, cls: `bdg bb` }
  };
function j(e) {
  return k[e.charCodeAt(0) % k.length];
}
function M(e) {
  let t = e.trim().split(/\s+/).filter(Boolean);
  return t.length ? (t[0][0] + (t[1] ? t[1][0] : ``)).toUpperCase() : `CL`;
}
function N(e) {
  let t = String(e.whatsapp || ``).trim(),
    n = String(e.tel || ``).trim(),
    r = String(e.email || ``).trim();
  return t
    ? {
        principal: `WhatsApp: ${t}`,
        secundario: n && n !== t ? `Telefone: ${n}` : ``,
        badge: ``,
        badgeCls: `bdg bg`,
        badgeLabel: `WhatsApp`
      }
    : n
      ? {
          principal: `Telefone: ${n}`,
          secundario: r,
          badge: ``,
          badgeCls: `bdg ba`,
          badgeLabel: `Telefone`
        }
      : r
        ? { principal: r, secundario: ``, badge: ``, badgeCls: `bdg bb`, badgeLabel: `E-mail` }
        : {
            principal: `Sem contato`,
            secundario: ``,
            badge: ``,
            badgeCls: `bdg br`,
            badgeLabel: `Sem contato`
          };
}
function P({ cliente: e, onDetalhe: t, onEditar: n, onExcluir: r }) {
  let i = j(e.nome),
    a = N(e),
    o = A[e.status ?? ``];
  return (0, O.jsxs)(`div`, {
    className: `cliente-card`,
    'data-testid': `cliente-card`,
    children: [
      (0, O.jsxs)(`div`, {
        className: `cliente-card__header`,
        children: [
          (0, O.jsxs)(`div`, {
            className: `cliente-card__hero`,
            children: [
              (0, O.jsx)(`div`, {
                className: `av`,
                style: { background: i.bg, color: i.c },
                'aria-hidden': `true`,
                children: M(e.nome)
              }),
              (0, O.jsxs)(`div`, {
                className: `cliente-card__info`,
                children: [
                  (0, O.jsx)(`div`, { className: `cliente-card__nome`, children: e.nome }),
                  e.apelido &&
                    (0, O.jsx)(`div`, { className: `cliente-card__apelido`, children: e.apelido })
                ]
              })
            ]
          }),
          o && (0, O.jsx)(`span`, { className: o.cls, children: o.label })
        ]
      }),
      (0, O.jsxs)(`div`, {
        className: `cliente-card__contact`,
        children: [
          (0, O.jsx)(`div`, { className: `cliente-card__contact-primary`, children: a.principal }),
          a.secundario &&
            (0, O.jsx)(`div`, {
              className: `cliente-card__contact-secondary`,
              children: a.secundario
            })
        ]
      }),
      (0, O.jsxs)(`div`, {
        className: `cliente-card__badges`,
        children: [
          (0, O.jsx)(`span`, { className: a.badgeCls, children: a.badgeLabel }),
          e.seg && (0, O.jsx)(`span`, { className: `bdg bk`, children: e.seg }),
          e.optin_marketing && (0, O.jsx)(`span`, { className: `bdg bg`, children: `MKT` })
        ]
      }),
      (t || n || r) &&
        (0, O.jsxs)(`div`, {
          className: `mobile-card-actions`,
          children: [
            t &&
              (0, O.jsx)(`button`, {
                className: `btn btn-sm`,
                onClick: () => t(String(e.id)),
                children: `Detalhes`
              }),
            n &&
              (0, O.jsx)(`button`, {
                className: `btn btn-p btn-sm`,
                onClick: () => n(String(e.id)),
                children: `Editar`
              }),
            r &&
              (0, O.jsx)(`button`, {
                className: `btn btn-r btn-sm`,
                onClick: () => r(String(e.id)),
                children: `Excluir`
              })
          ]
        })
    ]
  });
}
function ie({ onNovoCliente: e, onExportar: t }) {
  let n = C((e) => e.filtro),
    r = C((e) => e.setFiltro),
    i = C((e) => e.clearFiltro),
    a = C(m(x)),
    o = !!(n.q || n.seg || n.status);
  return (0, O.jsxs)(`div`, {
    className: `toolbar-shell--section`,
    'data-testid': `cliente-toolbar`,
    children: [
      (0, O.jsx)(`input`, {
        className: `inp`,
        type: `search`,
        placeholder: `Buscar...`,
        value: n.q ?? ``,
        onChange: (e) => r({ q: e.target.value }),
        'aria-label': `Buscar clientes`,
        'data-testid': `busca-input`
      }),
      (0, O.jsxs)(`select`, {
        className: `inp`,
        value: n.seg ?? ``,
        onChange: (e) => r({ seg: e.target.value }),
        'aria-label': `Filtrar por segmento`,
        'data-testid': `seg-select`,
        children: [
          (0, O.jsx)(`option`, { value: ``, children: `Todos os segmentos` }),
          a.map((e) => (0, O.jsx)(`option`, { value: e, children: e }, e))
        ]
      }),
      (0, O.jsxs)(`select`, {
        className: `inp`,
        value: n.status ?? ``,
        onChange: (e) => r({ status: e.target.value }),
        'aria-label': `Filtrar por status`,
        'data-testid': `status-select`,
        children: [
          (0, O.jsx)(`option`, { value: ``, children: `Todos os status` }),
          (0, O.jsx)(`option`, { value: `ativo`, children: `Ativo` }),
          (0, O.jsx)(`option`, { value: `inativo`, children: `Inativo` }),
          (0, O.jsx)(`option`, { value: `prospecto`, children: `Prospecto` })
        ]
      }),
      o &&
        (0, O.jsx)(`button`, {
          className: `btn btn-sm`,
          onClick: i,
          'data-testid': `limpar-filtro`,
          children: `Limpar filtros`
        }),
      t &&
        (0, O.jsx)(`button`, {
          className: `btn btn-sm`,
          onClick: t,
          'data-testid': `export-btn`,
          children: `Exportar CSV`
        }),
      e &&
        (0, O.jsx)(`button`, {
          className: `btn btn-p btn-sm`,
          onClick: e,
          'data-testid': `novo-btn`,
          children: `Novo cliente`
        })
    ]
  });
}
function ae() {
  let e = C(m((e) => e.clientes)),
    t = C(m(b)),
    n = e.filter((e) => e.status === `ativo`).length,
    r = e.filter((e) => e.status === `prospecto`).length;
  return (0, O.jsxs)(`div`, {
    className: `bento-band`,
    'data-testid': `cliente-metrics`,
    children: [
      (0, O.jsxs)(`div`, {
        className: `met`,
        children: [
          (0, O.jsx)(`div`, { className: `ml`, children: `Total` }),
          (0, O.jsx)(`div`, { className: `mv`, children: e.length })
        ]
      }),
      (0, O.jsxs)(`div`, {
        className: `met`,
        children: [
          (0, O.jsx)(`div`, { className: `ml`, children: `Ativos` }),
          (0, O.jsx)(`div`, { className: `mv`, children: n })
        ]
      }),
      (0, O.jsxs)(`div`, {
        className: `met`,
        children: [
          (0, O.jsx)(`div`, { className: `ml`, children: `Prospectos` }),
          (0, O.jsx)(`div`, { className: `mv`, children: r })
        ]
      }),
      (0, O.jsxs)(`div`, {
        className: `met`,
        children: [
          (0, O.jsx)(`div`, { className: `ml`, children: `Filtrados` }),
          (0, O.jsx)(`div`, { className: `mv`, children: t.length })
        ]
      })
    ]
  });
}
function oe({ hasData: e }) {
  return (0, O.jsxs)(`div`, {
    className: `empty`,
    'data-testid': `empty-state`,
    children: [
      (0, O.jsx)(`div`, { className: `ico`, children: `CL` }),
      (0, O.jsx)(`p`, {
        children: e
          ? `Nenhum cliente encontrado com os filtros atuais.`
          : `Clique em "Novo cliente" para cadastrar o primeiro.`
      })
    ]
  });
}
function se() {
  return (0, O.jsx)(`div`, {
    className: `sk-card`,
    'data-testid': `skeleton`,
    children: Array.from({ length: 4 }).map((e, t) =>
      (0, O.jsx)(`div`, { className: `sk-line` }, t)
    )
  });
}
function ce({ onNovoCliente: e, onDetalhe: t, onEditar: n, onExcluir: r, onExportar: i }) {
  let a = C((e) => e.status),
    o = C((e) => e.error),
    s = C(m((e) => e.clientes)),
    c = C(m(b)),
    l = C((e) => e.setStatus);
  return (
    (0, p.useEffect)(() => {
      a === `idle` && l(`loading`);
    }, [a, l]),
    (0, O.jsxs)(`div`, {
      className: `screen-content`,
      'data-testid': `cliente-list-view`,
      children: [
        (0, O.jsx)(`div`, {
          className: `fb form-gap-bottom-xs`,
          children: (0, O.jsx)(`h2`, { className: `table-cell-strong`, children: `Clientes` })
        }),
        a === `ready` && (0, O.jsx)(ae, {}),
        a === `ready` && (0, O.jsx)(ie, { onNovoCliente: e, onExportar: i }),
        a === `loading` && (0, O.jsx)(se, {}),
        a === `error` &&
          (0, O.jsx)(`div`, {
            className: `empty`,
            'data-testid': `error-state`,
            children: (0, O.jsx)(`p`, { children: o ?? `Erro ao carregar clientes.` })
          }),
        a === `ready` && c.length === 0 && (0, O.jsx)(oe, { hasData: s.length > 0 }),
        a === `ready` &&
          c.length > 0 &&
          (0, O.jsx)(`div`, {
            className: `flex flex-col gap-3`,
            'data-testid': `cliente-list`,
            children: c.map((e) =>
              (0, O.jsx)(P, { cliente: e, onDetalhe: t, onEditar: n, onExcluir: r }, e.id)
            )
          })
      ]
    })
  );
}
function le() {
  let e = a((e) => e.session),
    t = r((e) => e.filialId),
    [i, o] = (0, p.useState)([]),
    s = (0, p.useCallback)(async () => {
      if (!e?.access_token || !t) return;
      let { url: r, key: i, ready: a } = n();
      if (a)
        try {
          let n = await fetch(
            `${r}/rest/v1/rcas?filial_id=eq.${encodeURIComponent(t)}&ativo=eq.true&order=nome`,
            {
              headers: { apikey: i, Authorization: `Bearer ${e.access_token}` },
              signal: AbortSignal.timeout(8e3)
            }
          );
          if (!n.ok) return;
          let a = await n.json();
          Array.isArray(a) && o(a);
        } catch {}
    }, [t, e?.access_token]);
  return (
    (0, p.useEffect)(() => {
      s();
    }, [s]),
    i
  );
}
function F(e) {
  return e.whatsapp
    ? `WhatsApp: ${e.whatsapp}`
    : e.tel
      ? `Telefone: ${e.tel}`
      : e.email
        ? e.email
        : `Sem contato principal`;
}
function I(e) {
  let t = [
    e.optin_marketing && (e.whatsapp || e.tel) ? `WhatsApp` : ``,
    e.optin_email && e.email ? `E-mail` : ``,
    e.optin_sms && e.tel ? `SMS` : ``
  ].filter(Boolean);
  return t.length ? `Canais prontos: ${t.join(`, `)}` : `Sem canais de relacionamento prontos`;
}
function L({ cliente: e }) {
  return (0, O.jsxs)(`div`, {
    className: `card-shell form-gap-bottom-xs`,
    'data-testid': `cliente-context-summary`,
    children: [
      (0, O.jsxs)(`div`, {
        className: `fb form-gap-bottom-xs`,
        children: [
          (0, O.jsxs)(`div`, {
            children: [
              (0, O.jsx)(`div`, {
                className: `table-cell-caption table-cell-muted`,
                children: `Resumo do cliente`
              }),
              (0, O.jsx)(`h3`, { className: `table-cell-strong`, children: e.nome })
            ]
          }),
          (0, O.jsx)(`span`, { className: `bdg bk`, children: e.status || `ativo` })
        ]
      }),
      (0, O.jsxs)(`div`, {
        className: `grid grid-2`,
        children: [
          (0, O.jsxs)(`div`, {
            className: `empty-inline`,
            children: [
              (0, O.jsx)(`strong`, { children: `Contato` }),
              (0, O.jsx)(`p`, { children: F(e) })
            ]
          }),
          (0, O.jsxs)(`div`, {
            className: `empty-inline`,
            children: [
              (0, O.jsx)(`strong`, { children: `Comercial` }),
              (0, O.jsxs)(`p`, {
                children: [
                  `Segmento: `,
                  e.seg || `Sem segmento`,
                  (0, O.jsx)(`br`, {}),
                  `Prazo: `,
                  e.prazo || `a_vista`,
                  (0, O.jsx)(`br`, {}),
                  `RCA: `,
                  e.rca_nome || `Sem RCA`
                ]
              })
            ]
          }),
          (0, O.jsxs)(`div`, {
            className: `empty-inline`,
            children: [
              (0, O.jsx)(`strong`, { children: `Relacionamento` }),
              (0, O.jsxs)(`p`, {
                children: [I(e), (0, O.jsx)(`br`, {}), `Tabela: `, e.tab || `padrao`]
              })
            ]
          }),
          (0, O.jsxs)(`div`, {
            className: `empty-inline`,
            children: [
              (0, O.jsx)(`strong`, { children: `Cadastro` }),
              (0, O.jsxs)(`p`, {
                children: [
                  `Cidade: `,
                  e.cidade || `Nao informada`,
                  (0, O.jsx)(`br`, {}),
                  `E-mail: `,
                  e.email || `Nao informado`
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}
function R(e) {
  return {
    nome: e?.nome ?? ``,
    apelido: e?.apelido ?? ``,
    doc: e?.doc ?? ``,
    tipo: e?.tipo ?? `PJ`,
    status: e?.status ?? `ativo`,
    tel: e?.tel ?? ``,
    whatsapp: e?.whatsapp ?? ``,
    email: e?.email ?? ``,
    resp: e?.resp ?? ``,
    rca_id: e?.rca_id ?? ``,
    rca_nome: e?.rca_nome ?? ``,
    time: typeof e?.time == `string` ? e.time : (e?.time ?? []).join(`, `),
    seg: e?.seg ?? ``,
    tab: e?.tab ?? `padrao`,
    prazo: e?.prazo ?? `a_vista`,
    cidade: e?.cidade ?? ``,
    estado: e?.estado ?? ``,
    data_aniversario: e?.data_aniversario ?? ``,
    optin_marketing: !!e?.optin_marketing,
    optin_email: !!e?.optin_email,
    optin_sms: !!e?.optin_sms,
    obs: e?.obs ?? ``
  };
}
function z({ initialCliente: e = null, onSaved: t, onCancel: n }) {
  let [r, i] = (0, p.useState)(() => R(e)),
    [a, o] = (0, p.useState)(null),
    { submitCliente: s, saving: c, error: l } = D(),
    u = le();
  (0, p.useEffect)(() => {
    (i(R(e)), o(null));
  }, [e]);
  function d(e, t) {
    i((n) => ({ ...n, [e]: t }));
  }
  function f(e) {
    let t = u.find((t) => t.id === e);
    i((n) => ({ ...n, rca_id: e, rca_nome: t?.nome ?? `` }));
  }
  async function m(n) {
    if ((n.preventDefault(), !r.nome.trim())) {
      o(`Nome do cliente é obrigatório.`);
      return;
    }
    o(null);
    let a = await s({
      id: e?.id,
      nome: r.nome,
      apelido: r.apelido,
      doc: r.doc,
      tipo: r.tipo,
      status: r.status,
      tel: r.tel,
      whatsapp: r.whatsapp,
      email: r.email,
      resp: r.resp,
      rca_id: r.rca_id || null,
      rca_nome: r.rca_nome || null,
      time: r.time,
      seg: r.seg,
      tab: r.tab,
      prazo: r.prazo,
      cidade: r.cidade,
      estado: r.estado,
      data_aniversario: r.data_aniversario,
      optin_marketing: r.optin_marketing,
      optin_email: r.optin_email,
      optin_sms: r.optin_sms,
      obs: r.obs
    });
    (t?.(a), e || i(R(null)));
  }
  return (0, O.jsxs)(`form`, {
    className: `card-shell form-gap-lg`,
    onSubmit: m,
    'data-testid': `cliente-form`,
    children: [
      (0, O.jsxs)(`div`, {
        className: `fb form-gap-bottom-xs`,
        children: [
          (0, O.jsx)(`div`, {
            children: (0, O.jsx)(`h3`, {
              className: `table-cell-strong`,
              children: e ? `Editar cliente` : `Novo cliente`
            })
          }),
          n &&
            (0, O.jsx)(`button`, {
              type: `button`,
              className: `btn btn-sm`,
              onClick: n,
              'data-testid': `cancelar-btn`,
              children: `Cancelar`
            })
        ]
      }),
      e && (0, O.jsx)(L, { cliente: e }),
      (0, O.jsxs)(`div`, {
        className: `grid grid-2`,
        children: [
          (0, O.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, O.jsx)(`span`, { children: `Nome / Razão social *` }),
              (0, O.jsx)(`input`, {
                className: `inp`,
                value: r.nome,
                onChange: (e) => d(`nome`, e.target.value),
                'data-testid': `form-nome`
              })
            ]
          }),
          (0, O.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, O.jsx)(`span`, { children: `Apelido / Fantasia` }),
              (0, O.jsx)(`input`, {
                className: `inp`,
                value: r.apelido,
                onChange: (e) => d(`apelido`, e.target.value),
                'data-testid': `form-apelido`
              })
            ]
          })
        ]
      }),
      (0, O.jsxs)(`div`, {
        className: `grid grid-3`,
        children: [
          (0, O.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, O.jsx)(`span`, { children: `CPF / CNPJ` }),
              (0, O.jsx)(`input`, {
                className: `inp`,
                value: r.doc,
                onChange: (e) => d(`doc`, e.target.value),
                'data-testid': `form-doc`
              })
            ]
          }),
          (0, O.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, O.jsx)(`span`, { children: `Tipo` }),
              (0, O.jsxs)(`select`, {
                className: `inp`,
                value: r.tipo,
                onChange: (e) => d(`tipo`, e.target.value),
                'data-testid': `form-tipo`,
                children: [
                  (0, O.jsx)(`option`, { value: `PJ`, children: `PJ` }),
                  (0, O.jsx)(`option`, { value: `PF`, children: `PF` })
                ]
              })
            ]
          }),
          (0, O.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, O.jsx)(`span`, { children: `Status` }),
              (0, O.jsxs)(`select`, {
                className: `inp`,
                value: r.status,
                onChange: (e) => d(`status`, e.target.value),
                'data-testid': `form-status`,
                children: [
                  (0, O.jsx)(`option`, { value: `ativo`, children: `Ativo` }),
                  (0, O.jsx)(`option`, { value: `prospecto`, children: `Prospecto` }),
                  (0, O.jsx)(`option`, { value: `inativo`, children: `Inativo` })
                ]
              })
            ]
          })
        ]
      }),
      (0, O.jsxs)(`div`, {
        className: `grid grid-3`,
        children: [
          (0, O.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, O.jsx)(`span`, { children: `Telefone` }),
              (0, O.jsx)(`input`, {
                className: `inp`,
                value: r.tel,
                onChange: (e) => d(`tel`, e.target.value),
                'data-testid': `form-tel`
              })
            ]
          }),
          (0, O.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, O.jsx)(`span`, { children: `WhatsApp` }),
              (0, O.jsx)(`input`, {
                className: `inp`,
                value: r.whatsapp,
                onChange: (e) => d(`whatsapp`, e.target.value),
                'data-testid': `form-whatsapp`
              })
            ]
          }),
          (0, O.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, O.jsx)(`span`, { children: `E-mail` }),
              (0, O.jsx)(`input`, {
                className: `inp`,
                type: `email`,
                value: r.email,
                onChange: (e) => d(`email`, e.target.value),
                'data-testid': `form-email`
              })
            ]
          })
        ]
      }),
      (0, O.jsxs)(`div`, {
        className: `grid grid-2`,
        children: [
          (0, O.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, O.jsx)(`span`, { children: `Responsável / Comprador` }),
              (0, O.jsx)(`input`, {
                className: `inp`,
                value: r.resp,
                onChange: (e) => d(`resp`, e.target.value),
                'data-testid': `form-resp`
              })
            ]
          }),
          (0, O.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, O.jsx)(`span`, { children: `RCA / Vendedor` }),
              (0, O.jsxs)(`select`, {
                className: `inp`,
                value: r.rca_id,
                onChange: (e) => f(e.target.value),
                'data-testid': `form-rca`,
                children: [
                  (0, O.jsx)(`option`, { value: ``, children: `Sem RCA` }),
                  u.map((e) => (0, O.jsx)(`option`, { value: e.id, children: e.nome }, e.id))
                ]
              })
            ]
          })
        ]
      }),
      (0, O.jsxs)(`div`, {
        className: `grid grid-4`,
        children: [
          (0, O.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, O.jsx)(`span`, { children: `Time(s)` }),
              (0, O.jsx)(`input`, {
                className: `inp`,
                value: r.time,
                placeholder: `Ex: Flamengo, Paysandu`,
                onChange: (e) => d(`time`, e.target.value),
                'data-testid': `form-time`
              })
            ]
          }),
          (0, O.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, O.jsx)(`span`, { children: `Segmento` }),
              (0, O.jsx)(`input`, {
                className: `inp`,
                value: r.seg,
                onChange: (e) => d(`seg`, e.target.value),
                'data-testid': `form-seg`
              })
            ]
          }),
          (0, O.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, O.jsx)(`span`, { children: `Tabela de preço` }),
              (0, O.jsxs)(`select`, {
                className: `inp`,
                value: r.tab,
                onChange: (e) => d(`tab`, e.target.value),
                'data-testid': `form-tab`,
                children: [
                  (0, O.jsx)(`option`, { value: `padrao`, children: `Padrão` }),
                  (0, O.jsx)(`option`, { value: `especial`, children: `Especial` }),
                  (0, O.jsx)(`option`, { value: `vip`, children: `VIP` })
                ]
              })
            ]
          }),
          (0, O.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, O.jsx)(`span`, { children: `Prazo de pagamento` }),
              (0, O.jsxs)(`select`, {
                className: `inp`,
                value: r.prazo,
                onChange: (e) => d(`prazo`, e.target.value),
                'data-testid': `form-prazo`,
                children: [
                  (0, O.jsx)(`option`, { value: `a_vista`, children: `À vista` }),
                  (0, O.jsx)(`option`, { value: `7d`, children: `7 dias` }),
                  (0, O.jsx)(`option`, { value: `15d`, children: `15 dias` }),
                  (0, O.jsx)(`option`, { value: `30d`, children: `30 dias` }),
                  (0, O.jsx)(`option`, { value: `60d`, children: `60 dias` })
                ]
              })
            ]
          })
        ]
      }),
      (0, O.jsxs)(`div`, {
        className: `grid grid-2`,
        children: [
          (0, O.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, O.jsx)(`span`, { children: `Cidade` }),
              (0, O.jsx)(`input`, {
                className: `inp`,
                value: r.cidade,
                onChange: (e) => d(`cidade`, e.target.value),
                'data-testid': `form-cidade`
              })
            ]
          }),
          (0, O.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, O.jsx)(`span`, { children: `Estado` }),
              (0, O.jsx)(`input`, {
                className: `inp`,
                value: r.estado,
                onChange: (e) => d(`estado`, e.target.value),
                'data-testid': `form-estado`
              })
            ]
          })
        ]
      }),
      (0, O.jsxs)(`div`, {
        className: `grid grid-2`,
        children: [
          (0, O.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, O.jsx)(`span`, { children: `Data de aniversário` }),
              (0, O.jsx)(`input`, {
                className: `inp`,
                type: `date`,
                value: r.data_aniversario,
                onChange: (e) => d(`data_aniversario`, e.target.value),
                'data-testid': `form-aniv`
              })
            ]
          }),
          (0, O.jsxs)(`div`, {
            className: `form-field`,
            children: [
              (0, O.jsx)(`span`, { children: `Opt-ins de marketing` }),
              (0, O.jsxs)(`div`, {
                className: `fg2`,
                children: [
                  (0, O.jsxs)(`label`, {
                    className: `optin-choice`,
                    children: [
                      (0, O.jsx)(`input`, {
                        type: `checkbox`,
                        checked: r.optin_marketing,
                        onChange: (e) => d(`optin_marketing`, e.target.checked),
                        'data-testid': `form-optin-marketing`
                      }),
                      ` `,
                      `Marketing`
                    ]
                  }),
                  (0, O.jsxs)(`label`, {
                    className: `optin-choice`,
                    children: [
                      (0, O.jsx)(`input`, {
                        type: `checkbox`,
                        checked: r.optin_email,
                        onChange: (e) => d(`optin_email`, e.target.checked),
                        'data-testid': `form-optin-email`
                      }),
                      ` `,
                      `E-mail`
                    ]
                  }),
                  (0, O.jsxs)(`label`, {
                    className: `optin-choice`,
                    children: [
                      (0, O.jsx)(`input`, {
                        type: `checkbox`,
                        checked: r.optin_sms,
                        onChange: (e) => d(`optin_sms`, e.target.checked),
                        'data-testid': `form-optin-sms`
                      }),
                      ` `,
                      `SMS`
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }),
      (0, O.jsxs)(`label`, {
        className: `form-field`,
        children: [
          (0, O.jsx)(`span`, { children: `Observações` }),
          (0, O.jsx)(`textarea`, {
            className: `inp`,
            rows: 3,
            value: r.obs,
            onChange: (e) => d(`obs`, e.target.value),
            'data-testid': `form-obs`
          })
        ]
      }),
      (a || l) &&
        (0, O.jsx)(`div`, {
          className: `empty`,
          'data-testid': `form-error`,
          children: (0, O.jsx)(`p`, { children: a || l })
        }),
      (0, O.jsx)(`div`, {
        className: `mobile-card-actions`,
        children: (0, O.jsx)(`button`, {
          type: `submit`,
          className: `btn btn-p btn-sm`,
          disabled: c,
          'data-testid': `salvar-btn`,
          children: c ? `Salvando...` : e ? `Salvar alterações` : `Salvar cliente`
        })
      })
    ]
  });
}
function B(e, t) {
  return { apikey: e, Authorization: `Bearer ${t}`, 'Content-Type': `application/json` };
}
async function V(e) {
  let t = await e.text().catch(() => ``);
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}
function H(e, t, n) {
  if (!e.ok)
    throw t && typeof t == `object` && `message` in t && typeof t.message == `string`
      ? Error(t.message)
      : Error(n);
}
function U(e, t) {
  return `${e}/rest/v1/notas?cliente_id=eq.${encodeURIComponent(t)}&order=criado_em.desc`;
}
async function W(e, t) {
  let n = await fetch(U(e.url, t), {
      headers: B(e.key, e.token),
      signal: AbortSignal.timeout(12e3)
    }),
    r = await V(n);
  return (H(n, r, `Erro ${n.status} ao carregar notas`), Array.isArray(r) ? r : []);
}
async function ue(e, t) {
  let n = await fetch(`${e.url}/rest/v1/notas`, {
      method: `POST`,
      headers: B(e.key, e.token),
      body: JSON.stringify(t),
      signal: AbortSignal.timeout(12e3)
    }),
    r = await V(n);
  return (H(n, r, `Erro ${n.status} ao salvar nota`), Array.isArray(r) && r[0] ? r[0] : t);
}
function de({ clienteId: e, skip: t = !1 }) {
  let r = a((e) => e.session),
    [i, o] = (0, p.useState)([]),
    [s, c] = (0, p.useState)(!1),
    [l, u] = (0, p.useState)(!1),
    [d, f] = (0, p.useState)(null);
  function m() {
    if (!r?.access_token) throw Error(`Sessão expirada. Faça login novamente.`);
    let { url: e, key: t, ready: i } = n();
    if (!i) throw Error(`Configuração do Supabase ausente.`);
    return { url: e, key: t, token: r.access_token };
  }
  (0, p.useEffect)(() => {
    if (t || !e) return;
    let n = !0;
    return (
      c(!0),
      f(null),
      W(m(), e)
        .then((e) => {
          n && o(e);
        })
        .catch((e) => {
          n && f(e instanceof Error ? e.message : `Erro ao carregar notas.`);
        })
        .finally(() => {
          n && c(!1);
        }),
      () => {
        n = !1;
      }
    );
  }, [e, t, r]);
  async function h(t) {
    if (!e) throw Error(`Cliente não selecionado.`);
    let n = t.trim();
    if (!n) throw Error(`Digite uma nota antes de salvar.`);
    (u(!0), f(null));
    let r = { cliente_id: e, texto: n, data: new Date().toLocaleString(`pt-BR`) };
    try {
      let e = await ue(m(), r);
      return (o((t) => [e, ...t]), e);
    } catch (e) {
      throw (f(e instanceof Error ? e.message : `Erro ao salvar nota.`), e);
    } finally {
      u(!1);
    }
  }
  return { notas: i, loading: s, saving: l, error: d, submitNota: h };
}
function fe(e, t) {
  return { apikey: e, Authorization: `Bearer ${t}`, 'Content-Type': `application/json` };
}
async function pe(e) {
  let t = await e.text().catch(() => ``);
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}
function me(e, t, n) {
  if (!e.ok)
    throw t && typeof t == `object` && `message` in t && typeof t.message == `string`
      ? Error(t.message)
      : Error(n);
}
function G(e) {
  return String(e ?? ``)
    .normalize(`NFD`)
    .replace(/[\u0300-\u036f]/g, ``)
    .trim()
    .toLowerCase();
}
function he(e, t) {
  return `${e}/rest/v1/pedidos?filial_id=eq.${encodeURIComponent(t)}&order=num.desc`;
}
function ge(e, t) {
  if (e.cliente_id && t.id && e.cliente_id === t.id) return !0;
  let n = G(e.cli),
    r = G(t.nome);
  return !!n && !!r && n === r;
}
function K(e) {
  return e.reduce(
    (e, t) => (
      t.venda_fechada ? e.fechadas.push(t) : t.status !== `cancelado` && e.abertas.push(t),
      e
    ),
    { abertas: [], fechadas: [] }
  );
}
async function _e(e, t) {
  if (!e.filialId) throw Error(`Filial ativa nao encontrada.`);
  let n = await fetch(he(e.url, e.filialId), {
      headers: fe(e.key, e.token),
      signal: AbortSignal.timeout(12e3)
    }),
    r = await pe(n);
  return (
    me(n, r, `Erro ${n.status} ao carregar pedidos do cliente`),
    (Array.isArray(r) ? r : []).filter((e) => ge(e, t))
  );
}
function ve({ cliente: e, skip: t = !1 }) {
  let i = a((e) => e.session),
    o = r((e) => e.filialId),
    [s, c] = (0, p.useState)([]),
    [l, u] = (0, p.useState)([]),
    [d, f] = (0, p.useState)(!1),
    [m, h] = (0, p.useState)(null),
    g = (0, p.useCallback)(() => {
      if (!i?.access_token) throw Error(`Sessao expirada. Faca login novamente.`);
      let { url: e, key: t, ready: r } = n();
      if (!r) throw Error(`Configuracao do Supabase ausente.`);
      return { url: e, key: t, token: i.access_token, filialId: o };
    }, [o, i]),
    _ = (0, p.useCallback)(async () => {
      if (!(!e?.id || t)) {
        (f(!0), h(null));
        try {
          let t = K(await _e(g(), e));
          (c(t.abertas), u(t.fechadas));
        } catch (e) {
          (h(e instanceof Error ? e.message : `Erro ao carregar pedidos.`), c([]), u([]));
        } finally {
          f(!1);
        }
      }
    }, [e, g, t]);
  return (
    (0, p.useEffect)(() => {
      _();
    }, [_]),
    { pedidosAbertos: s, pedidosFechados: l, loading: d, error: m, reload: _ }
  );
}
function q(e, t, n) {
  return {
    apikey: e,
    Authorization: `Bearer ${t}`,
    'Content-Type': `application/json`,
    ...(n ? { Prefer: n } : {})
  };
}
async function J(e) {
  let t = await e.text().catch(() => ``);
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}
function Y(e, t, n) {
  if (!e.ok)
    throw t && typeof t == `object` && `message` in t && typeof t.message == `string`
      ? Error(t.message)
      : Error(n);
}
function ye(e, t) {
  return `${e}/rest/v1/cliente_fidelidade_saldos?cliente_id=eq.${encodeURIComponent(t)}&limit=1`;
}
function be(e, t) {
  return `${e}/rest/v1/cliente_fidelidade_lancamentos?cliente_id=eq.${encodeURIComponent(t)}&order=criado_em.desc`;
}
async function xe(e, t) {
  let n = await fetch(ye(e.url, t), {
      headers: q(e.key, e.token),
      signal: AbortSignal.timeout(12e3)
    }),
    r = await J(n);
  return (
    Y(n, r, `Erro ${n.status} ao carregar saldo de fidelidade`),
    Array.isArray(r) && r[0] ? r[0] : null
  );
}
async function Se(e, t) {
  let n = await fetch(be(e.url, t), {
      headers: q(e.key, e.token),
      signal: AbortSignal.timeout(12e3)
    }),
    r = await J(n);
  return (
    Y(n, r, `Erro ${n.status} ao carregar histórico de fidelidade`),
    Array.isArray(r) ? r : []
  );
}
async function Ce(e, t) {
  if (!e.filialId) throw Error(`Filial ativa não encontrada.`);
  let n = {
      cliente_id: t.clienteId,
      filial_id: e.filialId,
      tipo: t.tipo,
      status: `confirmado`,
      pontos: t.pontos,
      origem: `manual`,
      observacao: t.observacao?.trim() || null
    },
    r = await fetch(`${e.url}/rest/v1/cliente_fidelidade_lancamentos`, {
      method: `POST`,
      headers: q(e.key, e.token, `return=representation`),
      body: JSON.stringify(n),
      signal: AbortSignal.timeout(12e3)
    }),
    i = await J(r);
  return (
    Y(r, i, `Erro ${r.status} ao salvar lançamento de fidelidade`),
    Array.isArray(i) && i[0] ? i[0] : { ...n }
  );
}
function we({ clienteId: e, skip: t = !1 }) {
  let i = a((e) => e.session),
    o = r((e) => e.filialId),
    [s, c] = (0, p.useState)(null),
    [l, u] = (0, p.useState)([]),
    [d, f] = (0, p.useState)(!1),
    [m, h] = (0, p.useState)(!1),
    [g, _] = (0, p.useState)(null),
    v = (0, p.useCallback)(() => {
      if (!i?.access_token) throw Error(`Sessão expirada. Faça login novamente.`);
      let { url: e, key: t, ready: r } = n();
      if (!r) throw Error(`Configuração do Supabase ausente.`);
      return { url: e, key: t, token: i.access_token, filialId: o };
    }, [o, i]),
    y = (0, p.useCallback)(async () => {
      if (!(!e || t)) {
        (f(!0), _(null));
        try {
          let t = v(),
            [n, r] = await Promise.all([xe(t, e), Se(t, e)]);
          (c(n), u(r));
        } catch (e) {
          _(e instanceof Error ? e.message : `Erro ao carregar fidelidade.`);
        } finally {
          f(!1);
        }
      }
    }, [e, v, t]);
  (0, p.useEffect)(() => {
    y();
  }, [y]);
  async function b(t) {
    if (!e) throw Error(`Cliente não selecionado.`);
    let n = Number(t.pontos);
    if (!n || Number.isNaN(n)) throw Error(`Informe a quantidade de pontos.`);
    let r = t.tipo === `debito` ? -Math.abs(n) : n;
    (h(!0), _(null));
    try {
      (await Ce(v(), { clienteId: e, tipo: t.tipo, pontos: r, observacao: t.observacao }),
        await y());
    } catch (e) {
      throw (_(e instanceof Error ? e.message : `Erro ao lançar fidelidade.`), e);
    } finally {
      h(!1);
    }
  }
  return { saldo: s, lancamentos: l, loading: d, saving: m, error: g, submitLancamento: b };
}
var Te = { credito: `Crédito`, debito: `Débito`, ajuste: `Ajuste`, estorno: `Estorno` },
  Ee = { pendente: `Pendente`, confirmado: `Confirmado`, cancelado: `Cancelado` },
  De = { pendente: `ba`, confirmado: `bg`, cancelado: `br` },
  X = { tipo: `credito`, pontos: ``, observacao: `` };
function Oe({ cliente: e }) {
  let [t, n] = (0, p.useState)(X),
    {
      saldo: r,
      lancamentos: i,
      loading: a,
      saving: o,
      error: s,
      submitLancamento: c
    } = we({ clienteId: e.id });
  async function l() {
    (await c(t), n(X));
  }
  return (0, O.jsxs)(`div`, {
    className: `fid-panel`,
    'data-testid': `cliente-detail-fidelidade`,
    children: [
      (0, O.jsx)(`div`, {
        className: `cli-detail-label form-gap-bottom-xs`,
        children: `Saldo de fidelidade`
      }),
      a
        ? (0, O.jsxs)(`div`, {
            className: `sk-card`,
            'data-testid': `fid-loading`,
            children: [
              (0, O.jsx)(`div`, { className: `sk-line` }),
              (0, O.jsx)(`div`, { className: `sk-line` })
            ]
          })
        : r
          ? (0, O.jsxs)(`div`, {
              className: `fid-saldo-grid`,
              'data-testid': `fid-saldo-grid`,
              children: [
                (0, O.jsxs)(`div`, {
                  className: `met fid-met`,
                  children: [
                    (0, O.jsx)(`div`, { className: `ml`, children: `Saldo` }),
                    (0, O.jsxs)(`div`, {
                      className: `mv ${r.bloqueado ? `tone-danger` : `tone-success`}`,
                      children: [
                        Number(r.saldo_pontos ?? 0),
                        (0, O.jsx)(`span`, { className: `mv-unit`, children: ` pts` })
                      ]
                    }),
                    (0, O.jsx)(`div`, {
                      className: `ms ${r.bloqueado ? `tone-danger` : `tone-success`}`,
                      children: r.bloqueado
                        ? `Bloqueado${r.motivo_bloqueio ? ` - ${r.motivo_bloqueio}` : ``}`
                        : `Ativo`
                    })
                  ]
                }),
                (0, O.jsxs)(`div`, {
                  className: `met fid-met`,
                  children: [
                    (0, O.jsx)(`div`, { className: `ml`, children: `Acumulado` }),
                    (0, O.jsxs)(`div`, {
                      className: `mv`,
                      children: [
                        Number(r.total_acumulado ?? 0),
                        (0, O.jsx)(`span`, { className: `mv-unit`, children: ` pts` })
                      ]
                    }),
                    (0, O.jsx)(`div`, { className: `ms`, children: `total creditado` })
                  ]
                }),
                (0, O.jsxs)(`div`, {
                  className: `met fid-met`,
                  children: [
                    (0, O.jsx)(`div`, { className: `ml`, children: `Resgatado` }),
                    (0, O.jsxs)(`div`, {
                      className: `mv`,
                      children: [
                        Number(r.total_resgatado ?? 0),
                        (0, O.jsx)(`span`, { className: `mv-unit`, children: ` pts` })
                      ]
                    }),
                    (0, O.jsx)(`div`, { className: `ms`, children: `total debitado` })
                  ]
                })
              ]
            })
          : (0, O.jsx)(`div`, {
              className: `empty-inline`,
              'data-testid': `fid-empty-balance`,
              children: (0, O.jsx)(`p`, {
                children: `Nenhum saldo de fidelidade registrado para este cliente.`
              })
            }),
      (0, O.jsx)(`div`, {
        className: `cli-detail-label form-gap-bottom-xs`,
        style: { marginTop: 16 },
        children: `Adicionar lançamento manual`
      }),
      (0, O.jsxs)(`div`, {
        className: `fid-form fg2 form-gap-bottom-xs`,
        children: [
          (0, O.jsxs)(`select`, {
            className: `inp fid-tipo`,
            value: t.tipo,
            onChange: (e) => n((t) => ({ ...t, tipo: e.target.value })),
            'data-testid': `fid-tipo`,
            children: [
              (0, O.jsx)(`option`, { value: `credito`, children: `Crédito` }),
              (0, O.jsx)(`option`, { value: `debito`, children: `Débito` }),
              (0, O.jsx)(`option`, { value: `ajuste`, children: `Ajuste` }),
              (0, O.jsx)(`option`, { value: `estorno`, children: `Estorno` })
            ]
          }),
          (0, O.jsx)(`input`, {
            type: `number`,
            className: `inp fid-pontos`,
            placeholder: `Pontos`,
            step: `1`,
            value: t.pontos,
            onChange: (e) => n((t) => ({ ...t, pontos: e.target.value })),
            'data-testid': `fid-pontos`
          }),
          (0, O.jsx)(`input`, {
            className: `inp fid-obs input-flex`,
            placeholder: `Observação (opcional)`,
            value: t.observacao,
            onChange: (e) => n((t) => ({ ...t, observacao: e.target.value })),
            'data-testid': `fid-obs`
          }),
          (0, O.jsx)(`button`, {
            className: `btn btn-p btn-sm`,
            onClick: l,
            disabled: o,
            'data-testid': `fid-submit`,
            children: o ? `Lançando...` : `Lançar`
          })
        ]
      }),
      s &&
        (0, O.jsx)(`div`, {
          className: `empty-inline`,
          'data-testid': `fid-error`,
          children: (0, O.jsx)(`p`, { children: s })
        }),
      (0, O.jsx)(`div`, {
        className: `cli-detail-label form-gap-bottom-xs`,
        children: `Histórico (últimos 30)`
      }),
      i.length
        ? (0, O.jsx)(`div`, {
            className: `tw fid-hist-table`,
            'data-testid': `fid-history`,
            children: (0, O.jsxs)(`table`, {
              className: `tbl`,
              children: [
                (0, O.jsx)(`thead`, {
                  children: (0, O.jsxs)(`tr`, {
                    children: [
                      (0, O.jsx)(`th`, { children: `Data` }),
                      (0, O.jsx)(`th`, { children: `Tipo` }),
                      (0, O.jsx)(`th`, { children: `Pontos` }),
                      (0, O.jsx)(`th`, { children: `Status` }),
                      (0, O.jsx)(`th`, { children: `Origem` }),
                      (0, O.jsx)(`th`, { children: `Obs` })
                    ]
                  })
                }),
                (0, O.jsx)(`tbody`, {
                  children: i.slice(0, 30).map((e) =>
                    (0, O.jsxs)(
                      `tr`,
                      {
                        children: [
                          (0, O.jsx)(`td`, {
                            className: `table-cell-muted`,
                            children: e.criado_em
                              ? new Date(e.criado_em).toLocaleDateString(`pt-BR`)
                              : `-`
                          }),
                          (0, O.jsx)(`td`, {
                            children: (0, O.jsx)(`span`, {
                              className: `bdg ${Number(e.pontos ?? 0) > 0 ? `bg` : `br`}`,
                              children: Te[e.tipo || ``] || e.tipo || `-`
                            })
                          }),
                          (0, O.jsxs)(`td`, {
                            className: `table-cell-strong ${Number(e.pontos ?? 0) > 0 ? `tone-success` : `tone-danger`}`,
                            children: [Number(e.pontos ?? 0) > 0 ? `+` : ``, Number(e.pontos ?? 0)]
                          }),
                          (0, O.jsx)(`td`, {
                            children: (0, O.jsx)(`span`, {
                              className: `bdg ${De[e.status || ``] || `bk`}`,
                              children: Ee[e.status || ``] || e.status || `-`
                            })
                          }),
                          (0, O.jsx)(`td`, {
                            className: `table-cell-muted`,
                            children: e.origem || `-`
                          }),
                          (0, O.jsx)(`td`, {
                            className: `table-cell-caption`,
                            children: e.observacao || `-`
                          })
                        ]
                      },
                      e.id
                    )
                  )
                })
              ]
            })
          })
        : (0, O.jsx)(`div`, {
            className: `empty-inline`,
            'data-testid': `fid-empty-history`,
            children: (0, O.jsx)(`p`, { children: `Nenhum lançamento registrado.` })
          })
    ]
  });
}
function ke(e) {
  return Intl.NumberFormat(`pt-BR`, { style: `currency`, currency: `BRL` }).format(Number(e || 0));
}
function Z(e, t, n) {
  window.postMessage(
    {
      source: `clientes-react-pilot`,
      type: `clientes:pedido-acao`,
      action: e,
      pedidoId: t,
      clienteId: n
    },
    window.location.origin
  );
}
function Q(e, t, n) {
  return n.loading
    ? (0, O.jsxs)(`div`, {
        className: `sk-card`,
        'data-testid': `pedidos-${t}-loading`,
        children: [
          (0, O.jsx)(`div`, { className: `sk-line` }),
          (0, O.jsx)(`div`, { className: `sk-line` })
        ]
      })
    : n.error
      ? (0, O.jsx)(`div`, {
          className: `empty`,
          'data-testid': `pedidos-${t}-error`,
          children: (0, O.jsx)(`p`, { children: n.error })
        })
      : e.length
        ? (0, O.jsx)(`div`, {
            className: `cli-sales-list`,
            'data-testid': `pedidos-${t}-list`,
            children: e.map((e) =>
              (0, O.jsxs)(
                `article`,
                {
                  className: `card-shell form-gap-md`,
                  children: [
                    (0, O.jsxs)(`div`, {
                      className: `fb`,
                      children: [
                        (0, O.jsxs)(`div`, {
                          children: [
                            (0, O.jsxs)(`div`, {
                              className: `table-cell-caption table-cell-muted`,
                              children: [`Pedido #`, e.num]
                            }),
                            (0, O.jsx)(`div`, {
                              className: `table-cell-strong`,
                              children: e.cli || n.clienteNome
                            })
                          ]
                        }),
                        (0, O.jsx)(`span`, {
                          className: `bdg ${e.venda_fechada ? `bb` : `ba`}`,
                          children: e.venda_fechada ? `Fechado` : e.status || `Em andamento`
                        })
                      ]
                    }),
                    (0, O.jsxs)(`div`, {
                      className: `mobile-card-grid`,
                      children: [
                        (0, O.jsxs)(`div`, {
                          className: `mobile-card-panel`,
                          children: [
                            (0, O.jsx)(`div`, {
                              className: `table-cell-caption table-cell-muted`,
                              children: `Status`
                            }),
                            (0, O.jsx)(`div`, { children: e.status || `-` })
                          ]
                        }),
                        (0, O.jsxs)(`div`, {
                          className: `mobile-card-panel`,
                          children: [
                            (0, O.jsx)(`div`, {
                              className: `table-cell-caption table-cell-muted`,
                              children: `Pagamento`
                            }),
                            (0, O.jsx)(`div`, { children: e.pgto || `-` })
                          ]
                        }),
                        (0, O.jsxs)(`div`, {
                          className: `mobile-card-panel`,
                          children: [
                            (0, O.jsx)(`div`, {
                              className: `table-cell-caption table-cell-muted`,
                              children: `Prazo`
                            }),
                            (0, O.jsx)(`div`, { children: e.prazo || `-` })
                          ]
                        }),
                        (0, O.jsxs)(`div`, {
                          className: `mobile-card-panel`,
                          children: [
                            (0, O.jsx)(`div`, {
                              className: `table-cell-caption table-cell-muted`,
                              children: `Total`
                            }),
                            (0, O.jsx)(`div`, {
                              className: `table-cell-strong`,
                              children: ke(Number(e.total || 0))
                            })
                          ]
                        })
                      ]
                    }),
                    (0, O.jsxs)(`div`, {
                      className: `mobile-card-actions`,
                      children: [
                        (0, O.jsx)(`button`, {
                          className: `btn btn-sm`,
                          type: `button`,
                          onClick: () => Z(`ver`, e.id, e.cliente_id || ``),
                          'data-testid': `pedido-ver-${e.id}`,
                          children: `Ver pedido`
                        }),
                        (0, O.jsx)(`button`, {
                          className: `btn btn-sm`,
                          type: `button`,
                          onClick: () => Z(`editar`, e.id, e.cliente_id || ``),
                          'data-testid': `pedido-editar-${e.id}`,
                          children: `Editar`
                        }),
                        !e.venda_fechada &&
                          e.status === `entregue` &&
                          (0, O.jsx)(`button`, {
                            className: `btn btn-p btn-sm`,
                            type: `button`,
                            onClick: () => Z(`fechar-venda`, e.id, e.cliente_id || ``),
                            'data-testid': `pedido-fechar-${e.id}`,
                            children: `Fechar venda`
                          })
                      ]
                    })
                  ]
                },
                e.id
              )
            )
          })
        : (0, O.jsx)(`div`, {
            className: `empty-inline table-cell-muted`,
            'data-testid': `pedidos-${t}-empty`,
            children:
              t === `abertas`
                ? `Nenhum pedido em andamento para este cliente.`
                : `Nenhum pedido fechado para este cliente.`
          });
}
function Ae({ cliente: e, onEditar: t, onClose: n, activeTab: r, onTabChange: i }) {
  let [a, o] = (0, p.useState)(`resumo`),
    [s, c] = (0, p.useState)(``),
    { notas: l, loading: u, saving: d, error: f, submitNota: m } = de({ clienteId: e.id }),
    h = r ?? a,
    {
      pedidosAbertos: g,
      pedidosFechados: _,
      loading: v,
      error: y
    } = ve({ cliente: e, skip: h !== `abertas` && h !== `fechadas` }),
    b = (0, p.useMemo)(() => ({ loading: v, error: y, clienteNome: e.nome }), [e.nome, y, v]);
  function x(e) {
    if (i) {
      i(e);
      return;
    }
    o(e);
  }
  async function S() {
    (await m(s), c(``));
  }
  return (0, O.jsxs)(`div`, {
    className: `card-shell form-gap-lg`,
    'data-testid': `cliente-detail-panel`,
    children: [
      (0, O.jsxs)(`div`, {
        className: `fb form-gap-bottom-xs`,
        children: [
          (0, O.jsxs)(`div`, {
            children: [
              (0, O.jsx)(`div`, {
                className: `table-cell-caption table-cell-muted`,
                children: `Detalhe do cliente`
              }),
              (0, O.jsx)(`h3`, { className: `table-cell-strong`, children: e.nome }),
              (0, O.jsxs)(`div`, {
                className: `table-cell-caption table-cell-muted`,
                children: [e.seg || `Sem segmento`, ` - `, e.cidade || `Cidade nao informada`]
              })
            ]
          }),
          (0, O.jsxs)(`div`, {
            className: `mobile-card-actions`,
            children: [
              t &&
                (0, O.jsx)(`button`, {
                  className: `btn btn-p btn-sm`,
                  onClick: () => t(e.id),
                  'data-testid': `detalhe-editar`,
                  children: `Editar`
                }),
              n &&
                (0, O.jsx)(`button`, {
                  className: `btn btn-sm`,
                  onClick: n,
                  'data-testid': `detalhe-fechar`,
                  children: `Fechar`
                })
            ]
          })
        ]
      }),
      (0, O.jsxs)(`div`, {
        className: `tabs`,
        'data-testid': `cliente-detail-tabs`,
        children: [
          (0, O.jsx)(`button`, {
            className: `tb ${h === `resumo` ? `on` : ``}`,
            onClick: () => x(`resumo`),
            children: `Resumo`
          }),
          (0, O.jsx)(`button`, {
            className: `tb ${h === `abertas` ? `on` : ``}`,
            onClick: () => x(`abertas`),
            children: `Pedidos abertos`
          }),
          (0, O.jsx)(`button`, {
            className: `tb ${h === `fechadas` ? `on` : ``}`,
            onClick: () => x(`fechadas`),
            children: `Pedidos fechados`
          }),
          (0, O.jsx)(`button`, {
            className: `tb ${h === `notas` ? `on` : ``}`,
            onClick: () => x(`notas`),
            children: `Notas / historico`
          }),
          (0, O.jsx)(`button`, {
            className: `tb ${h === `fidelidade` ? `on` : ``}`,
            onClick: () => x(`fidelidade`),
            children: `Fidelidade`
          })
        ]
      }),
      h === `resumo` && (0, O.jsx)(L, { cliente: e }),
      h === `abertas` &&
        (0, O.jsxs)(`div`, {
          className: `form-gap-lg`,
          'data-testid': `cliente-detail-pedidos-abertos`,
          children: [
            (0, O.jsx)(`div`, {
              className: `cli-detail-label form-gap-bottom-xs`,
              children: `Pedidos em andamento`
            }),
            Q(g, `abertas`, b)
          ]
        }),
      h === `fechadas` &&
        (0, O.jsxs)(`div`, {
          className: `form-gap-lg`,
          'data-testid': `cliente-detail-pedidos-fechados`,
          children: [
            (0, O.jsx)(`div`, {
              className: `cli-detail-label form-gap-bottom-xs`,
              children: `Pedidos fechados`
            }),
            Q(_, `fechadas`, b)
          ]
        }),
      h === `notas` &&
        (0, O.jsxs)(`div`, {
          className: `form-gap-lg`,
          'data-testid': `cliente-detail-notas`,
          children: [
            (0, O.jsx)(`div`, {
              className: `cli-detail-label form-gap-bottom-xs`,
              children: `Notas / historico`
            }),
            (0, O.jsxs)(`div`, {
              className: `fg2 cli-detail-notes-input form-gap-bottom-xs`,
              children: [
                (0, O.jsx)(`input`, {
                  className: `inp input-flex`,
                  placeholder: `Adicionar nota...`,
                  value: s,
                  onChange: (e) => c(e.target.value),
                  'data-testid': `nota-input`
                }),
                (0, O.jsx)(`button`, {
                  className: `btn btn-sm`,
                  onClick: S,
                  disabled: d,
                  'data-testid': `nota-add`,
                  children: d ? `Salvando...` : `+`
                })
              ]
            }),
            f &&
              (0, O.jsx)(`div`, {
                className: `empty`,
                'data-testid': `nota-error`,
                children: (0, O.jsx)(`p`, { children: f })
              }),
            u
              ? (0, O.jsxs)(`div`, {
                  className: `sk-card`,
                  'data-testid': `nota-loading`,
                  children: [
                    (0, O.jsx)(`div`, { className: `sk-line` }),
                    (0, O.jsx)(`div`, { className: `sk-line` })
                  ]
                })
              : l.length
                ? (0, O.jsx)(`div`, {
                    className: `cli-detail-notes`,
                    'data-testid': `nota-list`,
                    children: l.map((e, t) =>
                      (0, O.jsxs)(
                        `div`,
                        {
                          className: `nota`,
                          children: [
                            (0, O.jsx)(`p`, { children: e.texto }),
                            (0, O.jsx)(`div`, { className: `nota-d`, children: e.data })
                          ]
                        },
                        `${e.data}-${t}`
                      )
                    )
                  })
                : (0, O.jsx)(`div`, {
                    className: `empty-inline table-cell-muted`,
                    'data-testid': `nota-empty`,
                    children: `Nenhuma nota.`
                  })
          ]
        }),
      h === `fidelidade` && (0, O.jsx)(Oe, { cliente: e })
    ]
  });
}
var je = `clientes-react-pilot`,
  Me = `clientes-legacy-shell`;
function Ne() {
  let e = C(m((e) => e.clientes)),
    t = C((e) => e.filtro),
    n = C((e) => e.clearFiltro),
    [r, i] = (0, p.useState)(null),
    [a, o] = (0, p.useState)(null),
    [s, c] = (0, p.useState)(`resumo`),
    { deleteClienteById: l, deletingId: u, error: d } = D(),
    f = (0, p.useMemo)(() => e.find((e) => e.id === r) ?? null, [e, r]),
    h = (0, p.useMemo)(() => e.find((e) => e.id === a) ?? null, [e, a]),
    g = C(m(b));
  async function _(e) {
    (await l(e), r === e && i(null), a === e && o(null));
  }
  function v() {
    let e = [
        [`Nome`, `E-mail`, `Telefone`, `WhatsApp`, `Segmento`, `Status`, `Cidade`, `RCA`],
        ...g.map((e) => [
          e.nome || ``,
          e.email || ``,
          e.tel || ``,
          e.whatsapp || ``,
          e.seg || ``,
          e.status || ``,
          e.cidade || ``,
          e.rca_nome || ``
        ])
      ].map((e) => e.map((e) => `"${String(e ?? ``).replace(/"/g, `""`)}"`).join(`,`)).join(`
`),
      t = new Blob([`﻿` + e], { type: `text/csv;charset=utf-8` }),
      n = document.createElement(`a`);
    ((n.href = URL.createObjectURL(t)),
      (n.download = `clientes-react.csv`),
      n.click(),
      URL.revokeObjectURL(n.href));
  }
  return (
    (0, p.useEffect)(() => {
      function e(e) {
        if (e.origin !== window.location.origin) return;
        let t = e.data;
        if (!(!t || t.source !== Me)) {
          if (t.type === `clientes:novo`) {
            (o(null), i(`new`), c(`resumo`));
            return;
          }
          if (t.type === `clientes:abrir-detalhe` && t.id) {
            (i(null), o(String(t.id)), c(t.tab || `resumo`));
            return;
          }
          if (t.type === `clientes:editar` && t.id) {
            (o(null), i(String(t.id)), c(`resumo`));
            return;
          }
          if (t.type === `clientes:excluir` && t.id) {
            _(String(t.id));
            return;
          }
          if (t.type === `clientes:limpar-filtros`) {
            n();
            return;
          }
          if (t.type === `clientes:editar-atual` && a) {
            (i(a), o(null), c(`resumo`));
            return;
          }
          if (t.type === `clientes:abrir-lista`) {
            (i(null), o(null), c(`resumo`));
            return;
          }
          if (t.type === `clientes:exportar-csv`) {
            v();
            return;
          }
          if (t.type === `clientes:abrir-resumo`) {
            (!a && t.id && o(String(t.id)), c(`resumo`));
            return;
          }
          if (t.type === `clientes:abrir-abertas`) {
            (!a && t.id && o(String(t.id)), (a || t.id) && c(`abertas`));
            return;
          }
          if (t.type === `clientes:abrir-fechadas`) {
            (!a && t.id && o(String(t.id)), (a || t.id) && c(`fechadas`));
            return;
          }
          if (t.type === `clientes:abrir-notas`) {
            (!a && t.id && o(String(t.id)), (a || t.id) && c(`notas`));
            return;
          }
          t.type === `clientes:abrir-fidelidade` &&
            (!a && t.id && o(String(t.id)), (a || t.id) && c(`fidelidade`));
        }
      }
      return (
        window.addEventListener(`message`, e),
        () => {
          window.removeEventListener(`message`, e);
        }
      );
    }, [n, a, g]),
    (0, p.useEffect)(() => {
      window.postMessage(
        {
          source: je,
          type: `clientes:state`,
          state: {
            view: r ? `form` : a ? `detail` : `list`,
            status: u ? `deleting` : d ? `error` : `ready`,
            count: e.length,
            filtersActive: [t.q, t.seg, t.status].filter(Boolean).length,
            selectedId: r === `new` ? `` : r || a || ``,
            selectedName: f?.nome || h?.nome || ``,
            detailTab: s
          }
        },
        window.location.origin
      );
    }, [e.length, u, a, r, d, t.q, t.seg, t.status, f?.nome, h?.nome, s]),
    (0, O.jsxs)(`div`, {
      className: `screen-content form-gap-lg`,
      'data-testid': `clientes-pilot-page`,
      children: [
        d &&
          (0, O.jsx)(`div`, {
            className: `empty`,
            'data-testid': `cliente-pilot-error`,
            children: (0, O.jsx)(`p`, { children: d })
          }),
        (0, O.jsx)(ce, {
          onNovoCliente: () => {
            (o(null), i(`new`), c(`resumo`));
          },
          onExportar: v,
          onEditar: (e) => {
            (o(null), i(e), c(`resumo`));
          },
          onDetalhe: (e) => {
            (i(null), o(e), c(`resumo`));
          },
          onExcluir: _
        }),
        h &&
          !r &&
          (0, O.jsx)(Ae, {
            cliente: h,
            activeTab: s,
            onTabChange: c,
            onEditar: (e) => {
              (o(null), i(e), c(`resumo`));
            },
            onClose: () => {
              (o(null), c(`resumo`));
            }
          }),
        u &&
          (0, O.jsx)(`div`, {
            className: `empty-inline`,
            'data-testid': `cliente-pilot-deleting`,
            children: `Removendo cliente...`
          }),
        r &&
          (0, O.jsx)(z, {
            initialCliente: r === `new` ? null : f,
            onSaved: (e) => {
              (i(null), o(e.id), c(`resumo`));
            },
            onCancel: () => {
              i(null);
            }
          })
      ]
    })
  );
}
var $ = null;
function Pe(e) {
  (($ = (0, h.createRoot)(e)),
    $.render((0, O.jsx)(p.StrictMode, { children: (0, O.jsx)(Ne, {}) })));
}
function Fe() {
  $ &&= ($.unmount(), null);
}
(window.__SC_AUTH_SESSION__ &&
  a.setState({ session: window.__SC_AUTH_SESSION__, status: `authenticated` }),
  window.__SC_FILIAL_ID__ && r.setState({ filialId: window.__SC_FILIAL_ID__ }),
  C.getState().fetchClientes(),
  (window.__SC_CLIENTES_DIRECT_BRIDGE__ = { mount: Pe, unmount: Fe }));
