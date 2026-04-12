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
var c = t(o(), 1),
  l = i(),
  u = e((e) => ({
    periodo: `mes`,
    pedidos: [],
    produtos: [],
    clientes: [],
    status: `idle`,
    error: null,
    setPeriodo: (t) => e({ periodo: t }),
    setData: ({ pedidos: t, produtos: n, clientes: r }) =>
      e({ pedidos: t, produtos: n, clientes: r, status: `ready`, error: null }),
    setStatus: (t, n) => e({ status: t, error: n ?? null })
  })),
  d = s(),
  f = new Intl.NumberFormat(`pt-BR`, { style: `currency`, currency: `BRL` }),
  p = [`Jan`, `Fev`, `Mar`, `Abr`, `Mai`, `Jun`, `Jul`, `Ago`, `Set`, `Out`, `Nov`, `Dez`];
function m(e) {
  return f.format(Number(e || 0));
}
function h(e) {
  return e.toFixed(1) + `%`;
}
function g(e) {
  let t = new Date(),
    n = t.getFullYear(),
    r = t.getMonth();
  if (e === `semana`) {
    let e = new Date(t);
    return (e.setDate(e.getDate() - e.getDay() + 1), e.setHours(0, 0, 0, 0), [e, t]);
  }
  return e === `mes`
    ? [new Date(n, r, 1), t]
    : e === `ano`
      ? [new Date(n, 0, 1), t]
      : [new Date(2e3, 0, 1), t];
}
function _(e, t) {
  if (!e) return !1;
  let n = new Date(e + `T00:00:00`);
  return n >= t[0] && n <= t[1];
}
function v(e, t) {
  if (!e) return null;
  let n = e.split(`-`);
  if (n.length < 3) return null;
  let r = parseInt(n[1], 10) - 1,
    i = parseInt(n[2], 10);
  if (isNaN(r) || isNaN(i)) return null;
  let a = new Date(t.getFullYear(), r, i);
  return (a < t && (a = new Date(t.getFullYear() + 1, r, i)), a);
}
function y(e, t, n, r) {
  let i = g(r),
    a = e.filter((e) => e.status === `entregue` && _(e.data, i)),
    o = a.reduce((e, t) => e + (t.total || 0), 0),
    s = a.reduce(
      (e, t) =>
        e +
        (Array.isArray(t.itens) ? t.itens : []).reduce(
          (e, t) => e + (t.preco - t.custo) * t.qty,
          0
        ),
      0
    ),
    c = o > 0 ? (s / o) * 100 : 0,
    l = a.length ? o / a.length : 0,
    u = e.filter((e) => [`orcamento`, `confirmado`, `em_separacao`].includes(e.status)).length,
    d = t.filter((e) => (e.emin ?? 0) > 0 && (e.esal ?? 0) <= 0),
    f = t.filter((e) => (e.emin ?? 0) > 0 && (e.esal ?? 0) > 0 && (e.esal ?? 0) < (e.emin ?? 0)),
    m = new Date();
  m.setHours(0, 0, 0, 0);
  let h = new Date(m);
  h.setDate(h.getDate() + 7);
  let y = n
      .map((e) => {
        let t = v(e.data_aniversario, m);
        return !t || t > h ? null : { ...e, _anivData: t };
      })
      .filter((e) => e !== null)
      .sort((e, t) => e._anivData.getTime() - t._anivData.getTime()),
    b = { orcamento: 0, confirmado: 0, em_separacao: 0, entregue: 0, cancelado: 0 };
  e.forEach((e) => {
    e.status in b && b[e.status]++;
  });
  let x = {};
  a.forEach((e) => {
    (Array.isArray(e.itens) ? e.itens : []).forEach((e) => {
      x[e.nome] = (x[e.nome] ?? 0) + e.qty * e.preco;
    });
  });
  let S = Object.entries(x)
      .sort((e, t) => t[1] - e[1])
      .slice(0, 5),
    C = S[0]?.[1] || 1,
    w = {};
  a.forEach((e) => {
    let t = new Date((e.data ?? ``) + `T00:00:00`),
      n = r === `ano` ? p[t.getMonth()] + `/` + String(t.getFullYear()).slice(2) : (e.data ?? ``);
    (w[n] || (w[n] = { fat: 0, lucro: 0 }), (w[n].fat += e.total || 0));
    let i = Array.isArray(e.itens) ? e.itens : [];
    w[n].lucro += i.reduce((e, t) => e + (t.preco - t.custo) * t.qty, 0);
  });
  let T = Object.keys(w).sort().slice(-10);
  return {
    entregues: a,
    fat: o,
    lucro: s,
    mg: c,
    tk: l,
    abertos: u,
    crit: d,
    baixo: f,
    anivProximos: y,
    stMap: b,
    topProdutos: S,
    maxTopFat: C,
    grupos: w,
    chartKeys: T,
    maxChartFat: Math.max(...T.map((e) => w[e].fat), 1),
    hoje: m
  };
}
function b({ periodo: e, onChange: t }) {
  return (0, d.jsx)(`div`, {
    className: `pseg`,
    'data-testid': `dash-period-selector`,
    children: [
      { value: `semana`, label: `Semana` },
      { value: `mes`, label: `Mês` },
      { value: `ano`, label: `Ano` },
      { value: `tudo`, label: `Tudo` }
    ].map((n) =>
      (0, d.jsx)(
        `button`,
        {
          className: e === n.value ? `on` : ``,
          onClick: () => t(n.value),
          type: `button`,
          children: n.label
        },
        n.value
      )
    )
  });
}
function x({ fat: e, lucro: t, mg: n, tk: r, abertos: i, entreguesCount: a, allPedsCount: o }) {
  return (0, d.jsxs)(`div`, {
    className: `mg dash-bento-band dash-bento-band--metrics`,
    'data-testid': `dash-kpis`,
    children: [
      (0, d.jsxs)(`div`, {
        className: `met metric-card`,
        children: [
          (0, d.jsx)(`div`, { className: `metric-card__eyebrow`, children: `Receita` }),
          (0, d.jsx)(`div`, { className: `ml`, children: `Faturamento` }),
          (0, d.jsx)(`div`, {
            className: `mv kpi-value-sm`,
            'data-testid': `kpi-fat`,
            children: m(e)
          }),
          (0, d.jsxs)(`div`, { className: `ms metric-card__foot`, children: [a, ` entregue(s)`] })
        ]
      }),
      (0, d.jsxs)(`div`, {
        className: `met metric-card`,
        children: [
          (0, d.jsx)(`div`, { className: `metric-card__eyebrow`, children: `Resultado` }),
          (0, d.jsx)(`div`, { className: `ml`, children: `Lucro bruto` }),
          (0, d.jsx)(`div`, {
            className: `mv kpi-value-sm ${t >= 0 ? `tone-success` : `tone-critical`}`,
            'data-testid': `kpi-lucro`,
            children: m(t)
          }),
          (0, d.jsx)(`div`, {
            className: `ms metric-card__foot`,
            children: t >= 0 ? `Operação saudável` : `Abaixo do esperado`
          })
        ]
      }),
      (0, d.jsxs)(`div`, {
        className: `met metric-card`,
        children: [
          (0, d.jsx)(`div`, { className: `metric-card__eyebrow`, children: `Eficiência` }),
          (0, d.jsx)(`div`, { className: `ml`, children: `Margem` }),
          (0, d.jsx)(`div`, {
            className: `mv ${n >= 15 ? `tone-success` : n >= 8 ? `tone-warning` : `tone-critical`}`,
            'data-testid': `kpi-mg`,
            children: h(n)
          }),
          (0, d.jsx)(`div`, {
            className: `ms metric-card__foot`,
            children: n >= 15 ? `Boa zona de margem` : n >= 8 ? `Atenção` : `Revisar mix e preço`
          })
        ]
      }),
      (0, d.jsxs)(`div`, {
        className: `met metric-card`,
        children: [
          (0, d.jsx)(`div`, { className: `metric-card__eyebrow`, children: `Conversão` }),
          (0, d.jsx)(`div`, { className: `ml`, children: `Ticket médio` }),
          (0, d.jsx)(`div`, {
            className: `mv kpi-value-sm`,
            'data-testid': `kpi-tk`,
            children: m(r)
          }),
          (0, d.jsxs)(`div`, {
            className: `ms metric-card__foot`,
            children: [`Base `, o, ` pedido(s)`]
          })
        ]
      }),
      (0, d.jsxs)(`div`, {
        className: `met metric-card`,
        children: [
          (0, d.jsx)(`div`, { className: `metric-card__eyebrow`, children: `Pipeline` }),
          (0, d.jsx)(`div`, { className: `ml`, children: `Em aberto` }),
          (0, d.jsx)(`div`, {
            className: `mv tone-warning`,
            'data-testid': `kpi-abertos`,
            children: i
          }),
          (0, d.jsx)(`div`, {
            className: `ms metric-card__foot`,
            children: `Orçamentos e confirmados`
          })
        ]
      })
    ]
  });
}
function S({ crit: e, baixo: t, anivProximos: n, hoje: r }) {
  return !e.length && !t.length && !n.length
    ? (0, d.jsx)(`div`, {
        className: `empty-inline table-cell-muted`,
        'data-testid': `dash-alerts-empty`,
        children: `Sem alertas no momento.`
      })
    : (0, d.jsxs)(`div`, {
        'data-testid': `dash-alerts`,
        children: [
          e.length > 0 &&
            (0, d.jsxs)(`div`, {
              className: `alert al-r dash-alert-card`,
              'data-testid': `dash-alert-crit`,
              children: [
                (0, d.jsx)(`div`, {
                  className: `dash-alert-card__title`,
                  children: (0, d.jsx)(`b`, { children: `Estoque crítico` })
                }),
                (0, d.jsxs)(`div`, {
                  className: `dash-alert-card__copy`,
                  children: [
                    e.length,
                    ` produto`,
                    e.length === 1 ? `` : `s`,
                    ` zerado`,
                    e.length === 1 ? `` : `s`,
                    `.`,
                    ` `,
                    e
                      .slice(0, 3)
                      .map((e) => e.nome)
                      .join(`, `),
                    e.length > 3 ? `...` : ``
                  ]
                })
              ]
            }),
          t.length > 0 &&
            (0, d.jsxs)(`div`, {
              className: `alert al-a dash-alert-card`,
              'data-testid': `dash-alert-baixo`,
              children: [
                (0, d.jsx)(`div`, {
                  className: `dash-alert-card__title`,
                  children: (0, d.jsx)(`b`, { children: `Estoque em atenção` })
                }),
                (0, d.jsxs)(`div`, {
                  className: `dash-alert-card__copy`,
                  children: [
                    t.length,
                    ` item`,
                    t.length === 1 ? `` : `ns`,
                    ` abaixo do mínimo.`,
                    ` `,
                    t
                      .slice(0, 3)
                      .map((e) => e.nome)
                      .join(`, `),
                    t.length > 3 ? `...` : ``
                  ]
                })
              ]
            }),
          n.length > 0 &&
            (0, d.jsxs)(`div`, {
              className: `alert al-g`,
              'data-testid': `dash-alert-aniv`,
              children: [
                (0, d.jsx)(`b`, { children: `Aniversários próximos:` }),
                ` `,
                n
                  .slice(0, 3)
                  .map((e) => {
                    let t = Math.round((e._anivData.getTime() - r.getTime()) / 864e5),
                      n = e.apelido || e.nome;
                    return t === 0 ? `${n} hoje` : t === 1 ? `${n} amanhã` : `${n} em ${t} dias`;
                  })
                  .join(`, `),
                n.length > 3 ? `...` : ``
              ]
            })
        ]
      });
}
function C({ chartKeys: e, grupos: t, maxFat: n }) {
  return e.length
    ? (0, d.jsxs)(`div`, {
        'data-testid': `dash-chart`,
        children: [
          (0, d.jsx)(`div`, {
            className: `barchart`,
            children: e.map((e) => {
              let r = t[e],
                i = Math.max(2, (r.fat / n) * 100),
                a = Math.max(0, (r.lucro / n) * 100);
              return (0, d.jsxs)(
                `div`,
                {
                  className: `barchart__group`,
                  title: `${e}: ${m(r.fat)}`,
                  children: [
                    (0, d.jsxs)(`div`, {
                      className: `barchart__bars`,
                      children: [
                        (0, d.jsx)(`span`, {
                          className: `barchart__bar barchart__bar--fat`,
                          style: { height: `${i}%` }
                        }),
                        (0, d.jsx)(`span`, {
                          className: `barchart__bar barchart__bar--lucro`,
                          style: { height: `${a}%` }
                        })
                      ]
                    }),
                    (0, d.jsx)(`div`, { className: `barchart__label`, children: e })
                  ]
                },
                e
              );
            })
          }),
          (0, d.jsxs)(`div`, {
            className: `dash-chart-legend`,
            children: [
              (0, d.jsxs)(`span`, {
                children: [
                  (0, d.jsx)(`span`, { className: `dash-legend-swatch dash-legend-swatch--fat` }),
                  `Faturamento`
                ]
              }),
              (0, d.jsxs)(`span`, {
                children: [
                  (0, d.jsx)(`span`, { className: `dash-legend-swatch dash-legend-swatch--lucro` }),
                  `Lucro`
                ]
              })
            ]
          })
        ]
      })
    : (0, d.jsx)(`div`, {
        className: `empty dash-empty-compact`,
        'data-testid': `dash-chart-empty`,
        children: (0, d.jsx)(`p`, { children: `Sem pedidos entregues no período` })
      });
}
function w({ stMap: e }) {
  let t = {
      orcamento: `Orçamento`,
      confirmado: `Confirmado`,
      em_separacao: `Em separação`,
      entregue: `Entregue`,
      cancelado: `Cancelado`
    },
    n = Object.values(e).reduce((e, t) => e + t, 0);
  return (0, d.jsx)(`div`, {
    'data-testid': `dash-status-pedidos`,
    children: Object.entries(t).map(([t, r]) => {
      let i = e[t] ?? 0,
        a = n > 0 ? (i / n) * 100 : 0;
      return (0, d.jsxs)(
        `div`,
        {
          className: `dash-status-row`,
          children: [
            (0, d.jsx)(`span`, { className: `dash-status-label`, children: r }),
            (0, d.jsx)(`span`, {
              className: `dash-status-bar`,
              children: (0, d.jsx)(`span`, {
                className: `dash-status-fill dash-status-fill--${t}`,
                style: { width: `${a}%` }
              })
            }),
            (0, d.jsx)(`span`, { className: `dash-status-count`, children: i })
          ]
        },
        t
      );
    })
  });
}
function T({ topProdutos: e, maxFat: t }) {
  return e.length
    ? (0, d.jsx)(`div`, {
        'data-testid': `dash-top-produtos`,
        children: e.map(([e, n]) =>
          (0, d.jsxs)(
            `div`,
            {
              className: `dash-top-row`,
              children: [
                (0, d.jsx)(`span`, {
                  className: `dash-top-label`,
                  title: e,
                  children: e.length > 28 ? e.slice(0, 28) + `…` : e
                }),
                (0, d.jsx)(`span`, {
                  className: `dash-top-bar`,
                  children: (0, d.jsx)(`span`, {
                    className: `dash-top-fill`,
                    style: { width: `${Math.max(4, (n / t) * 100)}%` }
                  })
                }),
                (0, d.jsx)(`span`, { className: `dash-top-value`, children: m(n) })
              ]
            },
            e
          )
        )
      })
    : (0, d.jsx)(`div`, {
        className: `empty-inline table-cell-muted`,
        'data-testid': `dash-top-empty`,
        children: `Sem dados no período.`
      });
}
function E() {
  let e = u((e) => e.periodo),
    t = u((e) => e.pedidos),
    n = u((e) => e.produtos),
    i = u((e) => e.clientes),
    a = u((e) => e.status),
    o = u((e) => e.error),
    s = u((e) => e.setPeriodo),
    l = r((e) => e.filialId),
    f = (0, c.useMemo)(() => y(t, n, i, e), [t, n, i, e]);
  return (0, d.jsxs)(`div`, {
    className: `dash-bento-page`,
    'data-testid': `dashboard-pilot-page`,
    children: [
      (0, d.jsx)(`div`, {
        className: `page-controls-bar toolbar toolbar-shell toolbar-shell--page`,
        children: (0, d.jsxs)(`div`, {
          className: `fg2`,
          children: [
            (0, d.jsxs)(`span`, {
              className: `table-cell-muted`,
              style: { fontSize: `0.85em` },
              children: [
                l ?? `—`,
                ` — `,
                {
                  semana: `Esta semana`,
                  mes: `Este mês`,
                  ano: `Este ano`,
                  tudo: `Todos os períodos`
                }[e]
              ]
            }),
            (0, d.jsx)(b, { periodo: e, onChange: s })
          ]
        })
      }),
      o &&
        (0, d.jsx)(`div`, {
          className: `alert al-r`,
          'data-testid': `dash-pilot-error`,
          children: o
        }),
      a === `loading` &&
        (0, d.jsxs)(`div`, {
          className: `sk-card`,
          'data-testid': `dash-pilot-loading`,
          children: [
            (0, d.jsx)(`div`, { className: `sk-line` }),
            (0, d.jsx)(`div`, { className: `sk-line` }),
            (0, d.jsx)(`div`, { className: `sk-line` })
          ]
        }),
      a === `ready` &&
        (0, d.jsxs)(d.Fragment, {
          children: [
            (0, d.jsx)(x, {
              fat: f.fat,
              lucro: f.lucro,
              mg: f.mg,
              tk: f.tk,
              abertos: f.abertos,
              entreguesCount: f.entregues.length,
              allPedsCount: t.length
            }),
            (0, d.jsxs)(`section`, {
              className: `dash-section dash-section--operacao dash-bento-panel dash-bento-panel--ops`,
              children: [
                (0, d.jsxs)(`div`, {
                  className: `dash-section-head`,
                  children: [
                    (0, d.jsx)(`h3`, { children: `Operação rápida` }),
                    (0, d.jsx)(`p`, { children: `Ações que precisam de decisão agora` })
                  ]
                }),
                (0, d.jsx)(S, {
                  crit: f.crit,
                  baixo: f.baixo,
                  anivProximos: f.anivProximos,
                  hoje: f.hoje
                })
              ]
            }),
            (0, d.jsxs)(`section`, {
              className: `dash-section dash-section--analise dash-bento-panel dash-bento-panel--analysis`,
              children: [
                (0, d.jsxs)(`div`, {
                  className: `dash-section-head`,
                  children: [
                    (0, d.jsx)(`h3`, { children: `Análise do negócio` }),
                    (0, d.jsx)(`p`, { children: `Leitura de desempenho e tendência comercial` })
                  ]
                }),
                (0, d.jsxs)(`div`, {
                  className: `dash-grid-main dash-bento-grid dash-bento-grid--primary`,
                  children: [
                    (0, d.jsxs)(`div`, {
                      className: `card card-shell dash-card dash-card--hero dash-bento-card dash-bento-card--chart`,
                      children: [
                        (0, d.jsx)(`div`, { className: `ct`, children: `Faturamento e lucro` }),
                        (0, d.jsx)(C, {
                          chartKeys: f.chartKeys,
                          grupos: f.grupos,
                          maxFat: f.maxChartFat
                        })
                      ]
                    }),
                    (0, d.jsxs)(`div`, {
                      className: `card card-shell dash-card dash-bento-card dash-bento-card--status`,
                      children: [
                        (0, d.jsx)(`div`, { className: `ct`, children: `Status dos pedidos` }),
                        (0, d.jsx)(w, { stMap: f.stMap })
                      ]
                    })
                  ]
                }),
                (0, d.jsx)(`div`, {
                  className: `dash-grid-cards dash-grid-cards--analise`,
                  children: (0, d.jsxs)(`div`, {
                    className: `card card-shell dash-card dash-card--top dash-bento-card`,
                    children: [
                      (0, d.jsx)(`div`, { className: `ct`, children: `Top produtos` }),
                      (0, d.jsx)(T, { topProdutos: f.topProdutos, maxFat: f.maxTopFat })
                    ]
                  })
                })
              ]
            })
          ]
        })
    ]
  });
}
function D(e, t) {
  return { apikey: e, Authorization: `Bearer ${t}`, 'Content-Type': `application/json` };
}
async function O(e) {
  let t = await e.text().catch(() => ``);
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}
function k(e, t, n) {
  if (!e.ok)
    throw t && typeof t == `object` && `message` in t && typeof t.message == `string`
      ? Error(t.message)
      : Error(n);
}
async function A(e, t) {
  let n = await fetch(
      `${e.url}/rest/v1/pedidos?filial_id=eq.${encodeURIComponent(t)}&order=data.desc`,
      { headers: D(e.key, e.token), signal: AbortSignal.timeout(15e3) }
    ),
    r = await O(n);
  return (k(n, r, `Erro ${n.status} ao carregar pedidos`), Array.isArray(r) ? r : []);
}
async function j(e, t) {
  let n = await fetch(
      `${e.url}/rest/v1/produtos?filial_id=eq.${encodeURIComponent(t)}&order=nome.asc`,
      { headers: D(e.key, e.token), signal: AbortSignal.timeout(15e3) }
    ),
    r = await O(n);
  return (k(n, r, `Erro ${n.status} ao carregar produtos`), Array.isArray(r) ? r : []);
}
async function M(e, t) {
  let n = await fetch(
      `${e.url}/rest/v1/clientes?filial_id=eq.${encodeURIComponent(t)}&order=nome.asc`,
      { headers: D(e.key, e.token), signal: AbortSignal.timeout(15e3) }
    ),
    r = await O(n);
  return (k(n, r, `Erro ${n.status} ao carregar clientes`), Array.isArray(r) ? r : []);
}
function N() {
  let e = u((e) => e.setData),
    t = u((e) => e.setStatus),
    i = a((e) => e.session),
    o = a((e) => e.status),
    s = r((e) => e.filialId),
    l = (0, c.useRef)(!1);
  (0, c.useEffect)(() => {
    if (o === `unknown`) return;
    if (o === `unauthenticated` || !i?.access_token) {
      t(`error`, `Sessão expirada. Faça login novamente.`);
      return;
    }
    if (!s) {
      t(`error`, `Nenhuma filial selecionada.`);
      return;
    }
    let { url: r, key: a, ready: c } = n();
    if (!c) {
      t(`error`, `Configuração do Supabase ausente.`);
      return;
    }
    if (l.current) return;
    ((l.current = !0), t(`loading`));
    let u = { url: r, key: a, token: i.access_token };
    Promise.all([A(u, s), j(u, s), M(u, s)])
      .then(([t, n, r]) => {
        e({ pedidos: t, produtos: n, clientes: r });
      })
      .catch((e) => {
        ((l.current = !1), t(`error`, e instanceof Error ? e.message : `Erro ao carregar dados.`));
      });
  }, [o, i, s, e, t]);
  function d() {
    if (((l.current = !1), !i?.access_token || !s)) return;
    let { url: r, key: a, ready: o } = n();
    if (!o) return;
    (t(`loading`), (l.current = !0));
    let c = { url: r, key: a, token: i.access_token };
    Promise.all([A(c, s), j(c, s), M(c, s)])
      .then(([t, n, r]) => e({ pedidos: t, produtos: n, clientes: r }))
      .catch((e) => {
        ((l.current = !1),
          t(`error`, e instanceof Error ? e.message : `Erro ao recarregar dados.`));
      });
  }
  return { reload: d };
}
var P = null;
function F() {
  return (N(), (0, d.jsx)(E, {}));
}
function I(e) {
  ((P = (0, l.createRoot)(e)), P.render((0, d.jsx)(c.StrictMode, { children: (0, d.jsx)(F, {}) })));
}
function L() {
  P &&= (P.unmount(), null);
}
(window.__SC_AUTH_SESSION__ &&
  a.setState({ session: window.__SC_AUTH_SESSION__, status: `authenticated` }),
  window.__SC_FILIAL_ID__ && r.setState({ filialId: window.__SC_FILIAL_ID__ }),
  (window.__SC_DASHBOARD_DIRECT_BRIDGE__ = { mount: I, unmount: L }));
