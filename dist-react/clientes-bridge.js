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
  d = s();
function f(e) {
  return String(e || ``)
    .normalize(`NFD`)
    .replace(/[\u0300-\u036f]/g, ``)
    .toLowerCase()
    .trim();
}
function p(e) {
  let t = Array.isArray(e) ? e : String(e || ``).split(/[,;\n]+/),
    n = new Set(),
    r = [];
  for (let e of t) {
    let t = String(e || ``).trim();
    if (!t) continue;
    let i = f(t);
    n.has(i) || (n.add(i), r.push(t));
  }
  return r;
}
function m(e, t) {
  let n = f(t?.q),
    r = String(t?.seg || ``).trim(),
    i = f(r).replace(/[^a-z0-9]/g, ``),
    a = t?.status || ``;
  return e.filter((e) => {
    let t = [e.nome, e.apelido, e.seg, e.resp, e.email, e.tel, e.whatsapp, p(e.time).join(` `)]
        .map(f)
        .join(` `),
      o = f(e.seg || `Sem segmento`).replace(/[^a-z0-9]/g, ``);
    return (!n || t.includes(n)) && (!r || o === i) && (!a || e.status === a);
  });
}
function h(e) {
  return [...new Set(e.map((e) => e.seg || `Sem segmento`))].sort((e, t) => e.localeCompare(t));
}
function g(e) {
  return m(e.clientes, e.filtro);
}
function _(e) {
  return h(e.clientes);
}
var v = { q: ``, seg: ``, status: `` },
  y = a((e) => ({
    clientes: [],
    status: `idle`,
    error: null,
    filtro: { ...v },
    setClientes: (t) => e({ clientes: t, status: `ready`, error: null }),
    setStatus: (t, n) => e({ status: t, error: n ?? null }),
    setFiltro: (t) => e((e) => ({ filtro: { ...e.filtro, ...t } })),
    clearFiltro: () => e({ filtro: { ...v } }),
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
function b(e, t, n) {
  return {
    apikey: e,
    Authorization: `Bearer ${t}`,
    'Content-Type': `application/json`,
    ...(n ? { Prefer: n } : {})
  };
}
async function x(e) {
  let t = await e.text().catch(() => ``);
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}
function S(e, t, n) {
  if (!e.ok)
    throw t && typeof t == `object` && `message` in t && typeof t.message == `string`
      ? Error(t.message)
      : Error(n);
}
function C(e, t) {
  return `${e}/rest/v1/clientes?filial_id=eq.${encodeURIComponent(t)}&order=nome`;
}
function w(e, t) {
  return `${e}/rest/v1/clientes?id=eq.${encodeURIComponent(t)}`;
}
function ee(e, t) {
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
async function T(e) {
  let t = await fetch(C(e.url, e.filialId), {
      headers: b(e.key, e.token),
      signal: AbortSignal.timeout(12e3)
    }),
    n = await x(t);
  return (S(t, n, `Erro ${t.status} ao carregar clientes`), Array.isArray(n) ? n : []);
}
async function te(e, t) {
  let n = ee(t, e.filialId),
    r = await fetch(`${e.url}/rest/v1/clientes?on_conflict=id`, {
      method: `POST`,
      headers: b(e.key, e.token, `resolution=merge-duplicates,return=representation`),
      body: JSON.stringify(n),
      signal: AbortSignal.timeout(12e3)
    }),
    i = await x(r);
  return (
    S(r, i, `Erro ${r.status} ao salvar cliente`),
    Array.isArray(i) && i[0] ? i[0] : t.id ? { ...n, id: t.id } : null
  );
}
async function ne(e, t) {
  let n = await fetch(w(e.url, t), {
    method: `DELETE`,
    headers: b(e.key, e.token),
    signal: AbortSignal.timeout(12e3)
  });
  S(n, await x(n), `Erro ${n.status} ao remover cliente`);
}
function E() {
  let t = y((e) => e.upsertCliente),
    r = y((e) => e.removeCliente),
    i = n((e) => e.session),
    a = o((e) => e.filialId),
    [s, c] = (0, u.useState)(!1),
    [l, d] = (0, u.useState)(null),
    [f, p] = (0, u.useState)(null);
  function m() {
    if (!i?.access_token) throw Error(`Sessão expirada. Faça login novamente.`);
    if (!a) throw Error(`Nenhuma filial selecionada.`);
    let { url: t, key: n, ready: r } = e();
    if (!r) throw Error(`Configuração do Supabase ausente.`);
    return { url: t, key: n, token: i.access_token, filialId: a };
  }
  async function h(e) {
    let n = m();
    (c(!0), p(null));
    try {
      let r = (await te(n, e)) ?? { ...e, id: e.id ?? crypto.randomUUID(), filial_id: n.filialId };
      return (t(r), r);
    } catch (e) {
      throw (p(e instanceof Error ? e.message : `Erro ao salvar cliente.`), e);
    } finally {
      c(!1);
    }
  }
  async function g(e) {
    let t = m();
    (d(e), p(null));
    try {
      (await ne(t, e), r(e));
    } catch (e) {
      throw (p(e instanceof Error ? e.message : `Erro ao remover cliente.`), e);
    } finally {
      d(null);
    }
  }
  return { submitCliente: h, deleteClienteById: g, saving: s, deletingId: l, error: f };
}
var D = i(),
  O = [
    { bg: `#E6EEF9`, c: `#0F2F5E` },
    { bg: `#E6F4EC`, c: `#0D3D22` },
    { bg: `#FAF0D6`, c: `#5C3900` },
    { bg: `#FAEBE9`, c: `#731F18` }
  ],
  re = {
    ativo: { label: `Ativo`, cls: `bdg bg` },
    inativo: { label: `Inativo`, cls: `bdg bk` },
    prospecto: { label: `Prospecto`, cls: `bdg bb` }
  };
function ie(e) {
  return O[e.charCodeAt(0) % O.length];
}
function k(e) {
  let t = e.trim().split(/\s+/).filter(Boolean);
  return t.length ? (t[0][0] + (t[1] ? t[1][0] : ``)).toUpperCase() : `CL`;
}
function A(e) {
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
function j({ cliente: e, onDetalhe: t, onEditar: n, onExcluir: r }) {
  let i = ie(e.nome),
    a = A(e),
    o = re[e.status ?? ``];
  return (0, D.jsxs)(`div`, {
    className: `cliente-card`,
    'data-testid': `cliente-card`,
    children: [
      (0, D.jsxs)(`div`, {
        className: `cliente-card__header`,
        children: [
          (0, D.jsxs)(`div`, {
            className: `cliente-card__hero`,
            children: [
              (0, D.jsx)(`div`, {
                className: `av`,
                style: { background: i.bg, color: i.c },
                'aria-hidden': `true`,
                children: k(e.nome)
              }),
              (0, D.jsxs)(`div`, {
                className: `cliente-card__info`,
                children: [
                  (0, D.jsx)(`div`, { className: `cliente-card__nome`, children: e.nome }),
                  e.apelido &&
                    (0, D.jsx)(`div`, { className: `cliente-card__apelido`, children: e.apelido })
                ]
              })
            ]
          }),
          o && (0, D.jsx)(`span`, { className: o.cls, children: o.label })
        ]
      }),
      (0, D.jsxs)(`div`, {
        className: `cliente-card__contact`,
        children: [
          (0, D.jsx)(`div`, { className: `cliente-card__contact-primary`, children: a.principal }),
          a.secundario &&
            (0, D.jsx)(`div`, {
              className: `cliente-card__contact-secondary`,
              children: a.secundario
            })
        ]
      }),
      (0, D.jsxs)(`div`, {
        className: `cliente-card__badges`,
        children: [
          (0, D.jsx)(`span`, { className: a.badgeCls, children: a.badgeLabel }),
          e.seg && (0, D.jsx)(`span`, { className: `bdg bk`, children: e.seg }),
          e.optin_marketing && (0, D.jsx)(`span`, { className: `bdg bg`, children: `MKT` })
        ]
      }),
      (t || n || r) &&
        (0, D.jsxs)(`div`, {
          className: `mobile-card-actions`,
          children: [
            t &&
              (0, D.jsx)(`button`, {
                className: `btn btn-sm`,
                onClick: () => t(String(e.id)),
                children: `Detalhes`
              }),
            n &&
              (0, D.jsx)(`button`, {
                className: `btn btn-p btn-sm`,
                onClick: () => n(String(e.id)),
                children: `Editar`
              }),
            r &&
              (0, D.jsx)(`button`, {
                className: `btn btn-r btn-sm`,
                onClick: () => r(String(e.id)),
                children: `Excluir`
              })
          ]
        })
    ]
  });
}
function ae({ onNovoCliente: e, onExportar: t }) {
  let n = y((e) => e.filtro),
    r = y((e) => e.setFiltro),
    i = y((e) => e.clearFiltro),
    a = y(l(_)),
    o = !!(n.q || n.seg || n.status);
  return (0, D.jsxs)(`div`, {
    className: `toolbar-shell--section`,
    'data-testid': `cliente-toolbar`,
    children: [
      (0, D.jsx)(`input`, {
        className: `inp`,
        type: `search`,
        placeholder: `Buscar...`,
        value: n.q ?? ``,
        onChange: (e) => r({ q: e.target.value }),
        'aria-label': `Buscar clientes`,
        'data-testid': `busca-input`
      }),
      (0, D.jsxs)(`select`, {
        className: `inp`,
        value: n.seg ?? ``,
        onChange: (e) => r({ seg: e.target.value }),
        'aria-label': `Filtrar por segmento`,
        'data-testid': `seg-select`,
        children: [
          (0, D.jsx)(`option`, { value: ``, children: `Todos os segmentos` }),
          a.map((e) => (0, D.jsx)(`option`, { value: e, children: e }, e))
        ]
      }),
      (0, D.jsxs)(`select`, {
        className: `inp`,
        value: n.status ?? ``,
        onChange: (e) => r({ status: e.target.value }),
        'aria-label': `Filtrar por status`,
        'data-testid': `status-select`,
        children: [
          (0, D.jsx)(`option`, { value: ``, children: `Todos os status` }),
          (0, D.jsx)(`option`, { value: `ativo`, children: `Ativo` }),
          (0, D.jsx)(`option`, { value: `inativo`, children: `Inativo` }),
          (0, D.jsx)(`option`, { value: `prospecto`, children: `Prospecto` })
        ]
      }),
      o &&
        (0, D.jsx)(`button`, {
          className: `btn btn-sm`,
          onClick: i,
          'data-testid': `limpar-filtro`,
          children: `Limpar filtros`
        }),
      t &&
        (0, D.jsx)(`button`, {
          className: `btn btn-sm`,
          onClick: t,
          'data-testid': `export-btn`,
          children: `Exportar CSV`
        }),
      e &&
        (0, D.jsx)(`button`, {
          className: `btn btn-p btn-sm`,
          onClick: e,
          'data-testid': `novo-btn`,
          children: `Novo cliente`
        })
    ]
  });
}
function oe() {
  let e = y(l((e) => e.clientes)),
    t = y(l(g)),
    n = e.filter((e) => e.status === `ativo`).length,
    r = e.filter((e) => e.status === `prospecto`).length;
  return (0, D.jsxs)(`div`, {
    className: `bento-band`,
    'data-testid': `cliente-metrics`,
    children: [
      (0, D.jsxs)(`div`, {
        className: `met`,
        children: [
          (0, D.jsx)(`div`, { className: `ml`, children: `Total` }),
          (0, D.jsx)(`div`, { className: `mv`, children: e.length })
        ]
      }),
      (0, D.jsxs)(`div`, {
        className: `met`,
        children: [
          (0, D.jsx)(`div`, { className: `ml`, children: `Ativos` }),
          (0, D.jsx)(`div`, { className: `mv`, children: n })
        ]
      }),
      (0, D.jsxs)(`div`, {
        className: `met`,
        children: [
          (0, D.jsx)(`div`, { className: `ml`, children: `Prospectos` }),
          (0, D.jsx)(`div`, { className: `mv`, children: r })
        ]
      }),
      (0, D.jsxs)(`div`, {
        className: `met`,
        children: [
          (0, D.jsx)(`div`, { className: `ml`, children: `Filtrados` }),
          (0, D.jsx)(`div`, { className: `mv`, children: t.length })
        ]
      })
    ]
  });
}
function se({ hasData: e }) {
  return (0, D.jsxs)(`div`, {
    className: `empty`,
    'data-testid': `empty-state`,
    children: [
      (0, D.jsx)(`div`, { className: `ico`, children: `CL` }),
      (0, D.jsx)(`p`, {
        children: e
          ? `Nenhum cliente encontrado com os filtros atuais.`
          : `Clique em "Novo cliente" para cadastrar o primeiro.`
      })
    ]
  });
}
function ce() {
  return (0, D.jsx)(`div`, {
    className: `sk-card`,
    'data-testid': `skeleton`,
    children: Array.from({ length: 4 }).map((e, t) =>
      (0, D.jsx)(`div`, { className: `sk-line` }, t)
    )
  });
}
function M({ onNovoCliente: e, onDetalhe: t, onEditar: n, onExcluir: r, onExportar: i }) {
  let a = y((e) => e.status),
    o = y((e) => e.error),
    s = y(l((e) => e.clientes)),
    c = y(l(g)),
    d = y((e) => e.setStatus);
  return (
    (0, u.useEffect)(() => {
      a === `idle` && d(`loading`);
    }, [a, d]),
    (0, D.jsxs)(`div`, {
      className: `screen-content`,
      'data-testid': `cliente-list-view`,
      children: [
        (0, D.jsx)(`div`, {
          className: `fb form-gap-bottom-xs`,
          children: (0, D.jsx)(`h2`, { className: `table-cell-strong`, children: `Clientes` })
        }),
        a === `ready` && (0, D.jsx)(oe, {}),
        a === `ready` && (0, D.jsx)(ae, { onNovoCliente: e, onExportar: i }),
        a === `loading` && (0, D.jsx)(ce, {}),
        a === `error` &&
          (0, D.jsx)(`div`, {
            className: `empty`,
            'data-testid': `error-state`,
            children: (0, D.jsx)(`p`, { children: o ?? `Erro ao carregar clientes.` })
          }),
        a === `ready` && c.length === 0 && (0, D.jsx)(se, { hasData: s.length > 0 }),
        a === `ready` &&
          c.length > 0 &&
          (0, D.jsx)(`div`, {
            className: `flex flex-col gap-3`,
            'data-testid': `cliente-list`,
            children: c.map((e) =>
              (0, D.jsx)(j, { cliente: e, onDetalhe: t, onEditar: n, onExcluir: r }, e.id)
            )
          })
      ]
    })
  );
}
function le() {
  let t = n((e) => e.session),
    r = o((e) => e.filialId),
    [i, a] = (0, u.useState)([]),
    s = (0, u.useCallback)(async () => {
      if (!t?.access_token || !r) return;
      let { url: n, key: i, ready: o } = e();
      if (o)
        try {
          let e = await fetch(
            `${n}/rest/v1/rcas?filial_id=eq.${encodeURIComponent(r)}&ativo=eq.true&order=nome`,
            {
              headers: { apikey: i, Authorization: `Bearer ${t.access_token}` },
              signal: AbortSignal.timeout(8e3)
            }
          );
          if (!e.ok) return;
          let o = await e.json();
          Array.isArray(o) && a(o);
        } catch {}
    }, [r, t?.access_token]);
  return (
    (0, u.useEffect)(() => {
      s();
    }, [s]),
    i
  );
}
function ue(e) {
  return e.whatsapp
    ? `WhatsApp: ${e.whatsapp}`
    : e.tel
      ? `Telefone: ${e.tel}`
      : e.email
        ? e.email
        : `Sem contato principal`;
}
function de(e) {
  let t = [
    e.optin_marketing && (e.whatsapp || e.tel) ? `WhatsApp` : ``,
    e.optin_email && e.email ? `E-mail` : ``,
    e.optin_sms && e.tel ? `SMS` : ``
  ].filter(Boolean);
  return t.length ? `Canais prontos: ${t.join(`, `)}` : `Sem canais de relacionamento prontos`;
}
function N({ cliente: e }) {
  return (0, D.jsxs)(`div`, {
    className: `card-shell form-gap-bottom-xs`,
    'data-testid': `cliente-context-summary`,
    children: [
      (0, D.jsxs)(`div`, {
        className: `fb form-gap-bottom-xs`,
        children: [
          (0, D.jsxs)(`div`, {
            children: [
              (0, D.jsx)(`div`, {
                className: `table-cell-caption table-cell-muted`,
                children: `Resumo do cliente`
              }),
              (0, D.jsx)(`h3`, { className: `table-cell-strong`, children: e.nome })
            ]
          }),
          (0, D.jsx)(`span`, { className: `bdg bk`, children: e.status || `ativo` })
        ]
      }),
      (0, D.jsxs)(`div`, {
        className: `grid grid-2`,
        children: [
          (0, D.jsxs)(`div`, {
            className: `empty-inline`,
            children: [
              (0, D.jsx)(`strong`, { children: `Contato` }),
              (0, D.jsx)(`p`, { children: ue(e) })
            ]
          }),
          (0, D.jsxs)(`div`, {
            className: `empty-inline`,
            children: [
              (0, D.jsx)(`strong`, { children: `Comercial` }),
              (0, D.jsxs)(`p`, {
                children: [
                  `Segmento: `,
                  e.seg || `Sem segmento`,
                  (0, D.jsx)(`br`, {}),
                  `Prazo: `,
                  e.prazo || `a_vista`,
                  (0, D.jsx)(`br`, {}),
                  `RCA: `,
                  e.rca_nome || `Sem RCA`
                ]
              })
            ]
          }),
          (0, D.jsxs)(`div`, {
            className: `empty-inline`,
            children: [
              (0, D.jsx)(`strong`, { children: `Relacionamento` }),
              (0, D.jsxs)(`p`, {
                children: [de(e), (0, D.jsx)(`br`, {}), `Tabela: `, e.tab || `padrao`]
              })
            ]
          }),
          (0, D.jsxs)(`div`, {
            className: `empty-inline`,
            children: [
              (0, D.jsx)(`strong`, { children: `Cadastro` }),
              (0, D.jsxs)(`p`, {
                children: [
                  `Cidade: `,
                  e.cidade || `Nao informada`,
                  (0, D.jsx)(`br`, {}),
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
function P(e) {
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
function F({ initialCliente: e = null, onSaved: t, onCancel: n }) {
  let [r, i] = (0, u.useState)(() => P(e)),
    [a, o] = (0, u.useState)(null),
    { submitCliente: s, saving: c, error: l } = E(),
    d = le();
  (0, u.useEffect)(() => {
    (i(P(e)), o(null));
  }, [e]);
  function f(e, t) {
    i((n) => ({ ...n, [e]: t }));
  }
  function p(e) {
    let t = d.find((t) => t.id === e);
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
    (t?.(a), e || i(P(null)));
  }
  return (0, D.jsxs)(`form`, {
    className: `card-shell form-gap-lg`,
    onSubmit: m,
    'data-testid': `cliente-form`,
    children: [
      (0, D.jsxs)(`div`, {
        className: `fb form-gap-bottom-xs`,
        children: [
          (0, D.jsx)(`div`, {
            children: (0, D.jsx)(`h3`, {
              className: `table-cell-strong`,
              children: e ? `Editar cliente` : `Novo cliente`
            })
          }),
          n &&
            (0, D.jsx)(`button`, {
              type: `button`,
              className: `btn btn-sm`,
              onClick: n,
              'data-testid': `cancelar-btn`,
              children: `Cancelar`
            })
        ]
      }),
      e && (0, D.jsx)(N, { cliente: e }),
      (0, D.jsxs)(`div`, {
        className: `grid grid-2`,
        children: [
          (0, D.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, D.jsx)(`span`, { children: `Nome / Razão social *` }),
              (0, D.jsx)(`input`, {
                className: `inp`,
                value: r.nome,
                onChange: (e) => f(`nome`, e.target.value),
                'data-testid': `form-nome`
              })
            ]
          }),
          (0, D.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, D.jsx)(`span`, { children: `Apelido / Fantasia` }),
              (0, D.jsx)(`input`, {
                className: `inp`,
                value: r.apelido,
                onChange: (e) => f(`apelido`, e.target.value),
                'data-testid': `form-apelido`
              })
            ]
          })
        ]
      }),
      (0, D.jsxs)(`div`, {
        className: `grid grid-3`,
        children: [
          (0, D.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, D.jsx)(`span`, { children: `CPF / CNPJ` }),
              (0, D.jsx)(`input`, {
                className: `inp`,
                value: r.doc,
                onChange: (e) => f(`doc`, e.target.value),
                'data-testid': `form-doc`
              })
            ]
          }),
          (0, D.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, D.jsx)(`span`, { children: `Tipo` }),
              (0, D.jsxs)(`select`, {
                className: `inp`,
                value: r.tipo,
                onChange: (e) => f(`tipo`, e.target.value),
                'data-testid': `form-tipo`,
                children: [
                  (0, D.jsx)(`option`, { value: `PJ`, children: `PJ` }),
                  (0, D.jsx)(`option`, { value: `PF`, children: `PF` })
                ]
              })
            ]
          }),
          (0, D.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, D.jsx)(`span`, { children: `Status` }),
              (0, D.jsxs)(`select`, {
                className: `inp`,
                value: r.status,
                onChange: (e) => f(`status`, e.target.value),
                'data-testid': `form-status`,
                children: [
                  (0, D.jsx)(`option`, { value: `ativo`, children: `Ativo` }),
                  (0, D.jsx)(`option`, { value: `prospecto`, children: `Prospecto` }),
                  (0, D.jsx)(`option`, { value: `inativo`, children: `Inativo` })
                ]
              })
            ]
          })
        ]
      }),
      (0, D.jsxs)(`div`, {
        className: `grid grid-3`,
        children: [
          (0, D.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, D.jsx)(`span`, { children: `Telefone` }),
              (0, D.jsx)(`input`, {
                className: `inp`,
                value: r.tel,
                onChange: (e) => f(`tel`, e.target.value),
                'data-testid': `form-tel`
              })
            ]
          }),
          (0, D.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, D.jsx)(`span`, { children: `WhatsApp` }),
              (0, D.jsx)(`input`, {
                className: `inp`,
                value: r.whatsapp,
                onChange: (e) => f(`whatsapp`, e.target.value),
                'data-testid': `form-whatsapp`
              })
            ]
          }),
          (0, D.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, D.jsx)(`span`, { children: `E-mail` }),
              (0, D.jsx)(`input`, {
                className: `inp`,
                type: `email`,
                value: r.email,
                onChange: (e) => f(`email`, e.target.value),
                'data-testid': `form-email`
              })
            ]
          })
        ]
      }),
      (0, D.jsxs)(`div`, {
        className: `grid grid-2`,
        children: [
          (0, D.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, D.jsx)(`span`, { children: `Responsável / Comprador` }),
              (0, D.jsx)(`input`, {
                className: `inp`,
                value: r.resp,
                onChange: (e) => f(`resp`, e.target.value),
                'data-testid': `form-resp`
              })
            ]
          }),
          (0, D.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, D.jsx)(`span`, { children: `RCA / Vendedor` }),
              (0, D.jsxs)(`select`, {
                className: `inp`,
                value: r.rca_id,
                onChange: (e) => p(e.target.value),
                'data-testid': `form-rca`,
                children: [
                  (0, D.jsx)(`option`, { value: ``, children: `Sem RCA` }),
                  d.map((e) => (0, D.jsx)(`option`, { value: e.id, children: e.nome }, e.id))
                ]
              })
            ]
          })
        ]
      }),
      (0, D.jsxs)(`div`, {
        className: `grid grid-4`,
        children: [
          (0, D.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, D.jsx)(`span`, { children: `Time(s)` }),
              (0, D.jsx)(`input`, {
                className: `inp`,
                value: r.time,
                placeholder: `Ex: Flamengo, Paysandu`,
                onChange: (e) => f(`time`, e.target.value),
                'data-testid': `form-time`
              })
            ]
          }),
          (0, D.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, D.jsx)(`span`, { children: `Segmento` }),
              (0, D.jsx)(`input`, {
                className: `inp`,
                value: r.seg,
                onChange: (e) => f(`seg`, e.target.value),
                'data-testid': `form-seg`
              })
            ]
          }),
          (0, D.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, D.jsx)(`span`, { children: `Tabela de preço` }),
              (0, D.jsxs)(`select`, {
                className: `inp`,
                value: r.tab,
                onChange: (e) => f(`tab`, e.target.value),
                'data-testid': `form-tab`,
                children: [
                  (0, D.jsx)(`option`, { value: `padrao`, children: `Padrão` }),
                  (0, D.jsx)(`option`, { value: `especial`, children: `Especial` }),
                  (0, D.jsx)(`option`, { value: `vip`, children: `VIP` })
                ]
              })
            ]
          }),
          (0, D.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, D.jsx)(`span`, { children: `Prazo de pagamento` }),
              (0, D.jsxs)(`select`, {
                className: `inp`,
                value: r.prazo,
                onChange: (e) => f(`prazo`, e.target.value),
                'data-testid': `form-prazo`,
                children: [
                  (0, D.jsx)(`option`, { value: `a_vista`, children: `À vista` }),
                  (0, D.jsx)(`option`, { value: `7d`, children: `7 dias` }),
                  (0, D.jsx)(`option`, { value: `15d`, children: `15 dias` }),
                  (0, D.jsx)(`option`, { value: `30d`, children: `30 dias` }),
                  (0, D.jsx)(`option`, { value: `60d`, children: `60 dias` })
                ]
              })
            ]
          })
        ]
      }),
      (0, D.jsxs)(`div`, {
        className: `grid grid-2`,
        children: [
          (0, D.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, D.jsx)(`span`, { children: `Cidade` }),
              (0, D.jsx)(`input`, {
                className: `inp`,
                value: r.cidade,
                onChange: (e) => f(`cidade`, e.target.value),
                'data-testid': `form-cidade`
              })
            ]
          }),
          (0, D.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, D.jsx)(`span`, { children: `Estado` }),
              (0, D.jsx)(`input`, {
                className: `inp`,
                value: r.estado,
                onChange: (e) => f(`estado`, e.target.value),
                'data-testid': `form-estado`
              })
            ]
          })
        ]
      }),
      (0, D.jsxs)(`div`, {
        className: `grid grid-2`,
        children: [
          (0, D.jsxs)(`label`, {
            className: `form-field`,
            children: [
              (0, D.jsx)(`span`, { children: `Data de aniversário` }),
              (0, D.jsx)(`input`, {
                className: `inp`,
                type: `date`,
                value: r.data_aniversario,
                onChange: (e) => f(`data_aniversario`, e.target.value),
                'data-testid': `form-aniv`
              })
            ]
          }),
          (0, D.jsxs)(`div`, {
            className: `form-field`,
            children: [
              (0, D.jsx)(`span`, { children: `Opt-ins de marketing` }),
              (0, D.jsxs)(`div`, {
                className: `fg2`,
                children: [
                  (0, D.jsxs)(`label`, {
                    className: `optin-choice`,
                    children: [
                      (0, D.jsx)(`input`, {
                        type: `checkbox`,
                        checked: r.optin_marketing,
                        onChange: (e) => f(`optin_marketing`, e.target.checked),
                        'data-testid': `form-optin-marketing`
                      }),
                      ` `,
                      `Marketing`
                    ]
                  }),
                  (0, D.jsxs)(`label`, {
                    className: `optin-choice`,
                    children: [
                      (0, D.jsx)(`input`, {
                        type: `checkbox`,
                        checked: r.optin_email,
                        onChange: (e) => f(`optin_email`, e.target.checked),
                        'data-testid': `form-optin-email`
                      }),
                      ` `,
                      `E-mail`
                    ]
                  }),
                  (0, D.jsxs)(`label`, {
                    className: `optin-choice`,
                    children: [
                      (0, D.jsx)(`input`, {
                        type: `checkbox`,
                        checked: r.optin_sms,
                        onChange: (e) => f(`optin_sms`, e.target.checked),
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
      (0, D.jsxs)(`label`, {
        className: `form-field`,
        children: [
          (0, D.jsx)(`span`, { children: `Observações` }),
          (0, D.jsx)(`textarea`, {
            className: `inp`,
            rows: 3,
            value: r.obs,
            onChange: (e) => f(`obs`, e.target.value),
            'data-testid': `form-obs`
          })
        ]
      }),
      (a || l) &&
        (0, D.jsx)(`div`, {
          className: `empty`,
          'data-testid': `form-error`,
          children: (0, D.jsx)(`p`, { children: a || l })
        }),
      (0, D.jsx)(`div`, {
        className: `mobile-card-actions`,
        children: (0, D.jsx)(`button`, {
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
function I(e, t) {
  return { apikey: e, Authorization: `Bearer ${t}`, 'Content-Type': `application/json` };
}
async function L(e) {
  let t = await e.text().catch(() => ``);
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}
function R(e, t, n) {
  if (!e.ok)
    throw t && typeof t == `object` && `message` in t && typeof t.message == `string`
      ? Error(t.message)
      : Error(n);
}
function z(e, t) {
  return `${e}/rest/v1/notas?cliente_id=eq.${encodeURIComponent(t)}&order=criado_em.desc`;
}
async function B(e, t) {
  let n = await fetch(z(e.url, t), {
      headers: I(e.key, e.token),
      signal: AbortSignal.timeout(12e3)
    }),
    r = await L(n);
  return (R(n, r, `Erro ${n.status} ao carregar notas`), Array.isArray(r) ? r : []);
}
async function V(e, t) {
  let n = await fetch(`${e.url}/rest/v1/notas`, {
      method: `POST`,
      headers: I(e.key, e.token),
      body: JSON.stringify(t),
      signal: AbortSignal.timeout(12e3)
    }),
    r = await L(n);
  return (R(n, r, `Erro ${n.status} ao salvar nota`), Array.isArray(r) && r[0] ? r[0] : t);
}
function H({ clienteId: t, skip: r = !1 }) {
  let i = n((e) => e.session),
    [a, o] = (0, u.useState)([]),
    [s, c] = (0, u.useState)(!1),
    [l, d] = (0, u.useState)(!1),
    [f, p] = (0, u.useState)(null);
  function m() {
    if (!i?.access_token) throw Error(`Sessão expirada. Faça login novamente.`);
    let { url: t, key: n, ready: r } = e();
    if (!r) throw Error(`Configuração do Supabase ausente.`);
    return { url: t, key: n, token: i.access_token };
  }
  (0, u.useEffect)(() => {
    if (r || !t) return;
    let e = !0;
    return (
      c(!0),
      p(null),
      B(m(), t)
        .then((t) => {
          e && o(t);
        })
        .catch((t) => {
          e && p(t instanceof Error ? t.message : `Erro ao carregar notas.`);
        })
        .finally(() => {
          e && c(!1);
        }),
      () => {
        e = !1;
      }
    );
  }, [t, r, i]);
  async function h(e) {
    if (!t) throw Error(`Cliente não selecionado.`);
    let n = e.trim();
    if (!n) throw Error(`Digite uma nota antes de salvar.`);
    (d(!0), p(null));
    let r = { cliente_id: t, texto: n, data: new Date().toLocaleString(`pt-BR`) };
    try {
      let e = await V(m(), r);
      return (o((t) => [e, ...t]), e);
    } catch (e) {
      throw (p(e instanceof Error ? e.message : `Erro ao salvar nota.`), e);
    } finally {
      d(!1);
    }
  }
  return { notas: a, loading: s, saving: l, error: f, submitNota: h };
}
function U(e, t) {
  return { apikey: e, Authorization: `Bearer ${t}`, 'Content-Type': `application/json` };
}
async function W(e) {
  let t = await e.text().catch(() => ``);
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}
function G(e, t, n) {
  if (!e.ok)
    throw t && typeof t == `object` && `message` in t && typeof t.message == `string`
      ? Error(t.message)
      : Error(n);
}
function K(e) {
  return String(e ?? ``)
    .normalize(`NFD`)
    .replace(/[\u0300-\u036f]/g, ``)
    .trim()
    .toLowerCase();
}
function fe(e, t) {
  return `${e}/rest/v1/pedidos?filial_id=eq.${encodeURIComponent(t)}&order=num.desc`;
}
function pe(e, t) {
  if (e.cliente_id && t.id && e.cliente_id === t.id) return !0;
  let n = K(e.cli),
    r = K(t.nome);
  return !!n && !!r && n === r;
}
function me(e) {
  return e.reduce(
    (e, t) => (
      t.venda_fechada ? e.fechadas.push(t) : t.status !== `cancelado` && e.abertas.push(t),
      e
    ),
    { abertas: [], fechadas: [] }
  );
}
async function he(e, t, n) {
  let r = {
      ...t,
      venda_fechada: !0,
      venda_fechada_em: new Date().toISOString(),
      venda_fechada_por: n || null
    },
    i = await fetch(`${e.url}/rest/v1/pedidos?id=eq.${encodeURIComponent(t.id)}`, {
      method: `PATCH`,
      headers: U(e.key, e.token),
      body: JSON.stringify({
        venda_fechada: !0,
        venda_fechada_em: r.venda_fechada_em,
        venda_fechada_por: r.venda_fechada_por
      }),
      signal: AbortSignal.timeout(12e3)
    });
  return (G(i, await W(i), `Erro ${i.status} ao fechar venda`), r);
}
async function ge(e, t) {
  if (!e.filialId) throw Error(`Filial ativa nao encontrada.`);
  let n = await fetch(fe(e.url, e.filialId), {
      headers: U(e.key, e.token),
      signal: AbortSignal.timeout(12e3)
    }),
    r = await W(n);
  return (
    G(n, r, `Erro ${n.status} ao carregar pedidos do cliente`),
    (Array.isArray(r) ? r : []).filter((e) => pe(e, t))
  );
}
function _e({ cliente: t, skip: r = !1 }) {
  let i = n((e) => e.session),
    a = o((e) => e.filialId),
    [s, c] = (0, u.useState)([]),
    [l, d] = (0, u.useState)([]),
    [f, p] = (0, u.useState)(!1),
    [m, h] = (0, u.useState)(null),
    [g, _] = (0, u.useState)(null),
    v = (0, u.useRef)(null);
  v.current = i?.user?.email ?? null;
  let y = (0, u.useCallback)(() => {
      if (!i?.access_token) throw Error(`Sessao expirada. Faca login novamente.`);
      let { url: t, key: n, ready: r } = e();
      if (!r) throw Error(`Configuracao do Supabase ausente.`);
      return { url: t, key: n, token: i.access_token, filialId: a };
    }, [a, i]),
    b = (0, u.useCallback)(async () => {
      if (!(!t?.id || r)) {
        (p(!0), h(null));
        try {
          let e = me(await ge(y(), t));
          (c(e.abertas), d(e.fechadas));
        } catch (e) {
          (h(e instanceof Error ? e.message : `Erro ao carregar pedidos.`), c([]), d([]));
        } finally {
          p(!1);
        }
      }
    }, [t, y, r]);
  return (
    (0, u.useEffect)(() => {
      b();
    }, [b]),
    {
      pedidosAbertos: s,
      pedidosFechados: l,
      loading: f,
      error: m,
      reload: b,
      fecharVenda: (0, u.useCallback)(
        async (e) => {
          if (g) return !1;
          _(e.id);
          try {
            let t = await he(y(), e, v.current);
            return (c((e) => e.filter((e) => e.id !== t.id)), d((e) => [t, ...e]), !0);
          } catch (e) {
            return (h(e instanceof Error ? e.message : `Erro ao fechar venda.`), !1);
          } finally {
            _(null);
          }
        },
        [g, y]
      ),
      fechandoId: g
    }
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
function ve(e, t) {
  return `${e}/rest/v1/cliente_fidelidade_saldos?cliente_id=eq.${encodeURIComponent(t)}&limit=1`;
}
function ye(e, t) {
  return `${e}/rest/v1/cliente_fidelidade_lancamentos?cliente_id=eq.${encodeURIComponent(t)}&order=criado_em.desc`;
}
async function be(e, t) {
  let n = await fetch(ve(e.url, t), {
      headers: q(e.key, e.token),
      signal: AbortSignal.timeout(12e3)
    }),
    r = await J(n);
  return (
    Y(n, r, `Erro ${n.status} ao carregar saldo de fidelidade`),
    Array.isArray(r) && r[0] ? r[0] : null
  );
}
async function xe(e, t) {
  let n = await fetch(ye(e.url, t), {
      headers: q(e.key, e.token),
      signal: AbortSignal.timeout(12e3)
    }),
    r = await J(n);
  return (
    Y(n, r, `Erro ${n.status} ao carregar histórico de fidelidade`),
    Array.isArray(r) ? r : []
  );
}
async function Se(e, t) {
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
function Ce({ clienteId: t, skip: r = !1 }) {
  let i = n((e) => e.session),
    a = o((e) => e.filialId),
    [s, c] = (0, u.useState)(null),
    [l, d] = (0, u.useState)([]),
    [f, p] = (0, u.useState)(!1),
    [m, h] = (0, u.useState)(!1),
    [g, _] = (0, u.useState)(null),
    v = (0, u.useCallback)(() => {
      if (!i?.access_token) throw Error(`Sessão expirada. Faça login novamente.`);
      let { url: t, key: n, ready: r } = e();
      if (!r) throw Error(`Configuração do Supabase ausente.`);
      return { url: t, key: n, token: i.access_token, filialId: a };
    }, [a, i]),
    y = (0, u.useCallback)(async () => {
      if (!(!t || r)) {
        (p(!0), _(null));
        try {
          let e = v(),
            [n, r] = await Promise.all([be(e, t), xe(e, t)]);
          (c(n), d(r));
        } catch (e) {
          _(e instanceof Error ? e.message : `Erro ao carregar fidelidade.`);
        } finally {
          p(!1);
        }
      }
    }, [t, v, r]);
  (0, u.useEffect)(() => {
    y();
  }, [y]);
  async function b(e) {
    if (!t) throw Error(`Cliente não selecionado.`);
    let n = Number(e.pontos);
    if (!n || Number.isNaN(n)) throw Error(`Informe a quantidade de pontos.`);
    let r = e.tipo === `debito` ? -Math.abs(n) : n;
    (h(!0), _(null));
    try {
      (await Se(v(), { clienteId: t, tipo: e.tipo, pontos: r, observacao: e.observacao }),
        await y());
    } catch (e) {
      throw (_(e instanceof Error ? e.message : `Erro ao lançar fidelidade.`), e);
    } finally {
      h(!1);
    }
  }
  return { saldo: s, lancamentos: l, loading: f, saving: m, error: g, submitLancamento: b };
}
var we = { credito: `Crédito`, debito: `Débito`, ajuste: `Ajuste`, estorno: `Estorno` },
  Te = { pendente: `Pendente`, confirmado: `Confirmado`, cancelado: `Cancelado` },
  Ee = { pendente: `ba`, confirmado: `bg`, cancelado: `br` },
  X = { tipo: `credito`, pontos: ``, observacao: `` };
function De({ cliente: e }) {
  let [t, n] = (0, u.useState)(X),
    {
      saldo: r,
      lancamentos: i,
      loading: a,
      saving: o,
      error: s,
      submitLancamento: c
    } = Ce({ clienteId: e.id });
  async function l() {
    (await c(t), n(X));
  }
  return (0, D.jsxs)(`div`, {
    className: `fid-panel`,
    'data-testid': `cliente-detail-fidelidade`,
    children: [
      (0, D.jsx)(`div`, {
        className: `cli-detail-label form-gap-bottom-xs`,
        children: `Saldo de fidelidade`
      }),
      a
        ? (0, D.jsxs)(`div`, {
            className: `sk-card`,
            'data-testid': `fid-loading`,
            children: [
              (0, D.jsx)(`div`, { className: `sk-line` }),
              (0, D.jsx)(`div`, { className: `sk-line` })
            ]
          })
        : r
          ? (0, D.jsxs)(`div`, {
              className: `fid-saldo-grid`,
              'data-testid': `fid-saldo-grid`,
              children: [
                (0, D.jsxs)(`div`, {
                  className: `met fid-met`,
                  children: [
                    (0, D.jsx)(`div`, { className: `ml`, children: `Saldo` }),
                    (0, D.jsxs)(`div`, {
                      className: `mv ${r.bloqueado ? `tone-danger` : `tone-success`}`,
                      children: [
                        Number(r.saldo_pontos ?? 0),
                        (0, D.jsx)(`span`, { className: `mv-unit`, children: ` pts` })
                      ]
                    }),
                    (0, D.jsx)(`div`, {
                      className: `ms ${r.bloqueado ? `tone-danger` : `tone-success`}`,
                      children: r.bloqueado
                        ? `Bloqueado${r.motivo_bloqueio ? ` - ${r.motivo_bloqueio}` : ``}`
                        : `Ativo`
                    })
                  ]
                }),
                (0, D.jsxs)(`div`, {
                  className: `met fid-met`,
                  children: [
                    (0, D.jsx)(`div`, { className: `ml`, children: `Acumulado` }),
                    (0, D.jsxs)(`div`, {
                      className: `mv`,
                      children: [
                        Number(r.total_acumulado ?? 0),
                        (0, D.jsx)(`span`, { className: `mv-unit`, children: ` pts` })
                      ]
                    }),
                    (0, D.jsx)(`div`, { className: `ms`, children: `total creditado` })
                  ]
                }),
                (0, D.jsxs)(`div`, {
                  className: `met fid-met`,
                  children: [
                    (0, D.jsx)(`div`, { className: `ml`, children: `Resgatado` }),
                    (0, D.jsxs)(`div`, {
                      className: `mv`,
                      children: [
                        Number(r.total_resgatado ?? 0),
                        (0, D.jsx)(`span`, { className: `mv-unit`, children: ` pts` })
                      ]
                    }),
                    (0, D.jsx)(`div`, { className: `ms`, children: `total debitado` })
                  ]
                })
              ]
            })
          : (0, D.jsx)(`div`, {
              className: `empty-inline`,
              'data-testid': `fid-empty-balance`,
              children: (0, D.jsx)(`p`, {
                children: `Nenhum saldo de fidelidade registrado para este cliente.`
              })
            }),
      (0, D.jsx)(`div`, {
        className: `cli-detail-label form-gap-bottom-xs`,
        style: { marginTop: 16 },
        children: `Adicionar lançamento manual`
      }),
      (0, D.jsxs)(`div`, {
        className: `fid-form fg2 form-gap-bottom-xs`,
        children: [
          (0, D.jsxs)(`select`, {
            className: `inp fid-tipo`,
            value: t.tipo,
            onChange: (e) => n((t) => ({ ...t, tipo: e.target.value })),
            'data-testid': `fid-tipo`,
            children: [
              (0, D.jsx)(`option`, { value: `credito`, children: `Crédito` }),
              (0, D.jsx)(`option`, { value: `debito`, children: `Débito` }),
              (0, D.jsx)(`option`, { value: `ajuste`, children: `Ajuste` }),
              (0, D.jsx)(`option`, { value: `estorno`, children: `Estorno` })
            ]
          }),
          (0, D.jsx)(`input`, {
            type: `number`,
            className: `inp fid-pontos`,
            placeholder: `Pontos`,
            step: `1`,
            value: t.pontos,
            onChange: (e) => n((t) => ({ ...t, pontos: e.target.value })),
            'data-testid': `fid-pontos`
          }),
          (0, D.jsx)(`input`, {
            className: `inp fid-obs input-flex`,
            placeholder: `Observação (opcional)`,
            value: t.observacao,
            onChange: (e) => n((t) => ({ ...t, observacao: e.target.value })),
            'data-testid': `fid-obs`
          }),
          (0, D.jsx)(`button`, {
            className: `btn btn-p btn-sm`,
            onClick: l,
            disabled: o,
            'data-testid': `fid-submit`,
            children: o ? `Lançando...` : `Lançar`
          })
        ]
      }),
      s &&
        (0, D.jsx)(`div`, {
          className: `empty-inline`,
          'data-testid': `fid-error`,
          children: (0, D.jsx)(`p`, { children: s })
        }),
      (0, D.jsx)(`div`, {
        className: `cli-detail-label form-gap-bottom-xs`,
        children: `Histórico (últimos 30)`
      }),
      i.length
        ? (0, D.jsx)(`div`, {
            className: `tw fid-hist-table`,
            'data-testid': `fid-history`,
            children: (0, D.jsxs)(`table`, {
              className: `tbl`,
              children: [
                (0, D.jsx)(`thead`, {
                  children: (0, D.jsxs)(`tr`, {
                    children: [
                      (0, D.jsx)(`th`, { children: `Data` }),
                      (0, D.jsx)(`th`, { children: `Tipo` }),
                      (0, D.jsx)(`th`, { children: `Pontos` }),
                      (0, D.jsx)(`th`, { children: `Status` }),
                      (0, D.jsx)(`th`, { children: `Origem` }),
                      (0, D.jsx)(`th`, { children: `Obs` })
                    ]
                  })
                }),
                (0, D.jsx)(`tbody`, {
                  children: i.slice(0, 30).map((e) =>
                    (0, D.jsxs)(
                      `tr`,
                      {
                        children: [
                          (0, D.jsx)(`td`, {
                            className: `table-cell-muted`,
                            children: e.criado_em
                              ? new Date(e.criado_em).toLocaleDateString(`pt-BR`)
                              : `-`
                          }),
                          (0, D.jsx)(`td`, {
                            children: (0, D.jsx)(`span`, {
                              className: `bdg ${Number(e.pontos ?? 0) > 0 ? `bg` : `br`}`,
                              children: we[e.tipo || ``] || e.tipo || `-`
                            })
                          }),
                          (0, D.jsxs)(`td`, {
                            className: `table-cell-strong ${Number(e.pontos ?? 0) > 0 ? `tone-success` : `tone-danger`}`,
                            children: [Number(e.pontos ?? 0) > 0 ? `+` : ``, Number(e.pontos ?? 0)]
                          }),
                          (0, D.jsx)(`td`, {
                            children: (0, D.jsx)(`span`, {
                              className: `bdg ${Ee[e.status || ``] || `bk`}`,
                              children: Te[e.status || ``] || e.status || `-`
                            })
                          }),
                          (0, D.jsx)(`td`, {
                            className: `table-cell-muted`,
                            children: e.origem || `-`
                          }),
                          (0, D.jsx)(`td`, {
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
        : (0, D.jsx)(`div`, {
            className: `empty-inline`,
            'data-testid': `fid-empty-history`,
            children: (0, D.jsx)(`p`, { children: `Nenhum lançamento registrado.` })
          })
    ]
  });
}
function Oe(e) {
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
    ? (0, D.jsxs)(`div`, {
        className: `sk-card`,
        'data-testid': `pedidos-${t}-loading`,
        children: [
          (0, D.jsx)(`div`, { className: `sk-line` }),
          (0, D.jsx)(`div`, { className: `sk-line` })
        ]
      })
    : n.error
      ? (0, D.jsx)(`div`, {
          className: `empty`,
          'data-testid': `pedidos-${t}-error`,
          children: (0, D.jsx)(`p`, { children: n.error })
        })
      : e.length
        ? (0, D.jsx)(`div`, {
            className: `cli-sales-list`,
            'data-testid': `pedidos-${t}-list`,
            children: e.map((e) =>
              (0, D.jsxs)(
                `article`,
                {
                  className: `card-shell form-gap-md`,
                  children: [
                    (0, D.jsxs)(`div`, {
                      className: `fb`,
                      children: [
                        (0, D.jsxs)(`div`, {
                          children: [
                            (0, D.jsxs)(`div`, {
                              className: `table-cell-caption table-cell-muted`,
                              children: [`Pedido #`, e.num]
                            }),
                            (0, D.jsx)(`div`, {
                              className: `table-cell-strong`,
                              children: e.cli || n.clienteNome
                            })
                          ]
                        }),
                        (0, D.jsx)(`span`, {
                          className: `bdg ${e.venda_fechada ? `bb` : `ba`}`,
                          children: e.venda_fechada ? `Fechado` : e.status || `Em andamento`
                        })
                      ]
                    }),
                    (0, D.jsxs)(`div`, {
                      className: `mobile-card-grid`,
                      children: [
                        (0, D.jsxs)(`div`, {
                          className: `mobile-card-panel`,
                          children: [
                            (0, D.jsx)(`div`, {
                              className: `table-cell-caption table-cell-muted`,
                              children: `Status`
                            }),
                            (0, D.jsx)(`div`, { children: e.status || `-` })
                          ]
                        }),
                        (0, D.jsxs)(`div`, {
                          className: `mobile-card-panel`,
                          children: [
                            (0, D.jsx)(`div`, {
                              className: `table-cell-caption table-cell-muted`,
                              children: `Pagamento`
                            }),
                            (0, D.jsx)(`div`, { children: e.pgto || `-` })
                          ]
                        }),
                        (0, D.jsxs)(`div`, {
                          className: `mobile-card-panel`,
                          children: [
                            (0, D.jsx)(`div`, {
                              className: `table-cell-caption table-cell-muted`,
                              children: `Prazo`
                            }),
                            (0, D.jsx)(`div`, { children: e.prazo || `-` })
                          ]
                        }),
                        (0, D.jsxs)(`div`, {
                          className: `mobile-card-panel`,
                          children: [
                            (0, D.jsx)(`div`, {
                              className: `table-cell-caption table-cell-muted`,
                              children: `Total`
                            }),
                            (0, D.jsx)(`div`, {
                              className: `table-cell-strong`,
                              children: Oe(Number(e.total || 0))
                            })
                          ]
                        })
                      ]
                    }),
                    (0, D.jsxs)(`div`, {
                      className: `mobile-card-actions`,
                      children: [
                        (0, D.jsx)(`button`, {
                          className: `btn btn-sm`,
                          type: `button`,
                          onClick: () => Z(`ver`, e.id, e.cliente_id || ``),
                          'data-testid': `pedido-ver-${e.id}`,
                          children: `Ver pedido`
                        }),
                        (0, D.jsx)(`button`, {
                          className: `btn btn-sm`,
                          type: `button`,
                          onClick: () => Z(`editar`, e.id, e.cliente_id || ``),
                          'data-testid': `pedido-editar-${e.id}`,
                          children: `Editar`
                        }),
                        !e.venda_fechada &&
                          e.status === `entregue` &&
                          n.onFecharVenda &&
                          (0, D.jsx)(`button`, {
                            className: `btn btn-p btn-sm`,
                            type: `button`,
                            disabled: n.fechandoId === e.id,
                            onClick: () => n.onFecharVenda(e),
                            'data-testid': `pedido-fechar-${e.id}`,
                            children: n.fechandoId === e.id ? `Fechando...` : `Fechar venda`
                          })
                      ]
                    })
                  ]
                },
                e.id
              )
            )
          })
        : (0, D.jsx)(`div`, {
            className: `empty-inline table-cell-muted`,
            'data-testid': `pedidos-${t}-empty`,
            children:
              t === `abertas`
                ? `Nenhum pedido em andamento para este cliente.`
                : `Nenhum pedido fechado para este cliente.`
          });
}
function ke({ cliente: e, onEditar: t, onClose: n, activeTab: r, onTabChange: i }) {
  let [a, o] = (0, u.useState)(`resumo`),
    [s, c] = (0, u.useState)(``),
    { notas: l, loading: d, saving: f, error: p, submitNota: m } = H({ clienteId: e.id }),
    h = r ?? a,
    {
      pedidosAbertos: g,
      pedidosFechados: _,
      loading: v,
      error: y,
      fecharVenda: b,
      fechandoId: x
    } = _e({ cliente: e, skip: h !== `abertas` && h !== `fechadas` }),
    S = (0, u.useMemo)(
      () => ({ loading: v, error: y, clienteNome: e.nome, onFecharVenda: b, fechandoId: x }),
      [e.nome, x, b, y, v]
    );
  function C(e) {
    if (i) {
      i(e);
      return;
    }
    o(e);
  }
  async function w() {
    (await m(s), c(``));
  }
  return (0, D.jsxs)(`div`, {
    className: `card-shell form-gap-lg`,
    'data-testid': `cliente-detail-panel`,
    children: [
      (0, D.jsxs)(`div`, {
        className: `fb form-gap-bottom-xs`,
        children: [
          (0, D.jsxs)(`div`, {
            children: [
              (0, D.jsx)(`div`, {
                className: `table-cell-caption table-cell-muted`,
                children: `Detalhe do cliente`
              }),
              (0, D.jsx)(`h3`, { className: `table-cell-strong`, children: e.nome }),
              (0, D.jsxs)(`div`, {
                className: `table-cell-caption table-cell-muted`,
                children: [e.seg || `Sem segmento`, ` - `, e.cidade || `Cidade nao informada`]
              })
            ]
          }),
          (0, D.jsxs)(`div`, {
            className: `mobile-card-actions`,
            children: [
              t &&
                (0, D.jsx)(`button`, {
                  className: `btn btn-p btn-sm`,
                  onClick: () => t(e.id),
                  'data-testid': `detalhe-editar`,
                  children: `Editar`
                }),
              n &&
                (0, D.jsx)(`button`, {
                  className: `btn btn-sm`,
                  onClick: n,
                  'data-testid': `detalhe-fechar`,
                  children: `Fechar`
                })
            ]
          })
        ]
      }),
      (0, D.jsxs)(`div`, {
        className: `tabs`,
        'data-testid': `cliente-detail-tabs`,
        children: [
          (0, D.jsx)(`button`, {
            className: `tb ${h === `resumo` ? `on` : ``}`,
            onClick: () => C(`resumo`),
            children: `Resumo`
          }),
          (0, D.jsx)(`button`, {
            className: `tb ${h === `abertas` ? `on` : ``}`,
            onClick: () => C(`abertas`),
            children: `Pedidos abertos`
          }),
          (0, D.jsx)(`button`, {
            className: `tb ${h === `fechadas` ? `on` : ``}`,
            onClick: () => C(`fechadas`),
            children: `Pedidos fechados`
          }),
          (0, D.jsx)(`button`, {
            className: `tb ${h === `notas` ? `on` : ``}`,
            onClick: () => C(`notas`),
            children: `Notas / historico`
          }),
          (0, D.jsx)(`button`, {
            className: `tb ${h === `fidelidade` ? `on` : ``}`,
            onClick: () => C(`fidelidade`),
            children: `Fidelidade`
          })
        ]
      }),
      h === `resumo` && (0, D.jsx)(N, { cliente: e }),
      h === `abertas` &&
        (0, D.jsxs)(`div`, {
          className: `form-gap-lg`,
          'data-testid': `cliente-detail-pedidos-abertos`,
          children: [
            (0, D.jsx)(`div`, {
              className: `cli-detail-label form-gap-bottom-xs`,
              children: `Pedidos em andamento`
            }),
            Q(g, `abertas`, S)
          ]
        }),
      h === `fechadas` &&
        (0, D.jsxs)(`div`, {
          className: `form-gap-lg`,
          'data-testid': `cliente-detail-pedidos-fechados`,
          children: [
            (0, D.jsx)(`div`, {
              className: `cli-detail-label form-gap-bottom-xs`,
              children: `Pedidos fechados`
            }),
            Q(_, `fechadas`, S)
          ]
        }),
      h === `notas` &&
        (0, D.jsxs)(`div`, {
          className: `form-gap-lg`,
          'data-testid': `cliente-detail-notas`,
          children: [
            (0, D.jsx)(`div`, {
              className: `cli-detail-label form-gap-bottom-xs`,
              children: `Notas / historico`
            }),
            (0, D.jsxs)(`div`, {
              className: `fg2 cli-detail-notes-input form-gap-bottom-xs`,
              children: [
                (0, D.jsx)(`input`, {
                  className: `inp input-flex`,
                  placeholder: `Adicionar nota...`,
                  value: s,
                  onChange: (e) => c(e.target.value),
                  'data-testid': `nota-input`
                }),
                (0, D.jsx)(`button`, {
                  className: `btn btn-sm`,
                  onClick: w,
                  disabled: f,
                  'data-testid': `nota-add`,
                  children: f ? `Salvando...` : `+`
                })
              ]
            }),
            p &&
              (0, D.jsx)(`div`, {
                className: `empty`,
                'data-testid': `nota-error`,
                children: (0, D.jsx)(`p`, { children: p })
              }),
            d
              ? (0, D.jsxs)(`div`, {
                  className: `sk-card`,
                  'data-testid': `nota-loading`,
                  children: [
                    (0, D.jsx)(`div`, { className: `sk-line` }),
                    (0, D.jsx)(`div`, { className: `sk-line` })
                  ]
                })
              : l.length
                ? (0, D.jsx)(`div`, {
                    className: `cli-detail-notes`,
                    'data-testid': `nota-list`,
                    children: l.map((e, t) =>
                      (0, D.jsxs)(
                        `div`,
                        {
                          className: `nota`,
                          children: [
                            (0, D.jsx)(`p`, { children: e.texto }),
                            (0, D.jsx)(`div`, { className: `nota-d`, children: e.data })
                          ]
                        },
                        `${e.data}-${t}`
                      )
                    )
                  })
                : (0, D.jsx)(`div`, {
                    className: `empty-inline table-cell-muted`,
                    'data-testid': `nota-empty`,
                    children: `Nenhuma nota.`
                  })
          ]
        }),
      h === `fidelidade` && (0, D.jsx)(De, { cliente: e })
    ]
  });
}
var Ae = `clientes-react-pilot`,
  je = `clientes-legacy-shell`;
function Me() {
  let e = y(l((e) => e.clientes)),
    t = y((e) => e.filtro),
    n = y((e) => e.clearFiltro),
    [r, i] = (0, u.useState)(null),
    [a, o] = (0, u.useState)(null),
    [s, c] = (0, u.useState)(`resumo`),
    { deleteClienteById: d, deletingId: f, error: p } = E(),
    m = (0, u.useMemo)(() => e.find((e) => e.id === r) ?? null, [e, r]),
    h = (0, u.useMemo)(() => e.find((e) => e.id === a) ?? null, [e, a]),
    _ = y(l(g));
  async function v(e) {
    (await d(e), r === e && i(null), a === e && o(null));
  }
  function b() {
    let e = [
        [`Nome`, `E-mail`, `Telefone`, `WhatsApp`, `Segmento`, `Status`, `Cidade`, `RCA`],
        ..._.map((e) => [
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
    (0, u.useEffect)(() => {
      function e(e) {
        if (e.origin !== window.location.origin) return;
        let t = e.data;
        if (!(!t || t.source !== je)) {
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
            v(String(t.id));
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
            b();
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
    }, [n, a, _]),
    (0, u.useEffect)(() => {
      window.postMessage(
        {
          source: Ae,
          type: `clientes:state`,
          state: {
            view: r ? `form` : a ? `detail` : `list`,
            status: f ? `deleting` : p ? `error` : `ready`,
            count: e.length,
            filtersActive: [t.q, t.seg, t.status].filter(Boolean).length,
            selectedId: r === `new` ? `` : r || a || ``,
            selectedName: m?.nome || h?.nome || ``,
            detailTab: s
          }
        },
        window.location.origin
      );
    }, [e.length, f, a, r, p, t.q, t.seg, t.status, m?.nome, h?.nome, s]),
    (0, D.jsxs)(`div`, {
      className: `screen-content form-gap-lg`,
      'data-testid': `clientes-pilot-page`,
      children: [
        p &&
          (0, D.jsx)(`div`, {
            className: `empty`,
            'data-testid': `cliente-pilot-error`,
            children: (0, D.jsx)(`p`, { children: p })
          }),
        (0, D.jsx)(M, {
          onNovoCliente: () => {
            (o(null), i(`new`), c(`resumo`));
          },
          onExportar: b,
          onEditar: (e) => {
            (o(null), i(e), c(`resumo`));
          },
          onDetalhe: (e) => {
            (i(null), o(e), c(`resumo`));
          },
          onExcluir: v
        }),
        h &&
          !r &&
          (0, D.jsx)(ke, {
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
        f &&
          (0, D.jsx)(`div`, {
            className: `empty-inline`,
            'data-testid': `cliente-pilot-deleting`,
            children: `Removendo cliente...`
          }),
        r &&
          (0, D.jsx)(F, {
            initialCliente: r === `new` ? null : m,
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
function Ne(t = {}) {
  let { skip: r = !1 } = t,
    i = y((e) => e.setClientes),
    a = y((e) => e.setStatus),
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
      T({ url: t, key: n, token: s.access_token, filialId: l })
        .then((e) => i(e))
        .catch((e) => {
          ((d.current = !1),
            a(`error`, e instanceof Error ? e.message : `Erro ao carregar clientes.`));
        }));
  }, [r, c, s, l, i, a]);
  function f() {
    if (((d.current = !1), a(`loading`), !s?.access_token || !l)) return;
    let { url: t, key: n, ready: r } = e();
    r &&
      ((d.current = !0),
      T({ url: t, key: n, token: s.access_token, filialId: l })
        .then((e) => i(e))
        .catch((e) => {
          ((d.current = !1),
            a(`error`, e instanceof Error ? e.message : `Erro ao recarregar clientes.`));
        }));
  }
  return { reload: f };
}
c();
var $ = null;
function Pe() {
  return (Ne(), (0, D.jsx)(Me, {}));
}
function Fe(e) {
  (($ = (0, d.createRoot)(e)),
    $.render((0, D.jsx)(u.StrictMode, { children: (0, D.jsx)(Pe, {}) })));
}
function Ie() {
  $ &&= ($.unmount(), null);
}
window.__SC_CLIENTES_DIRECT_BRIDGE__ = { mount: Fe, unmount: Ie };
