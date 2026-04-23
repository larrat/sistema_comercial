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
var l = r(t(), 1),
  u = s(),
  d = a((e) => ({
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
  f = i(),
  p = new Intl.NumberFormat(`pt-BR`, { style: `currency`, currency: `BRL` }),
  m = [`Jan`, `Fev`, `Mar`, `Abr`, `Mai`, `Jun`, `Jul`, `Ago`, `Set`, `Out`, `Nov`, `Dez`],
  h = { operacional: `Operacional`, gerencial: `Gerencial`, analitico: `Analítico` },
  g = { operador: `Operação`, gerente: `Gestão`, admin: `Administração` };
function _(e) {
  return p.format(Number(e || 0));
}
function v(e) {
  return `${e.toFixed(1)}%`;
}
function y(e) {
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
function b(e, t) {
  if (!e) return !1;
  let n = new Date(`${e}T00:00:00`);
  return n >= t[0] && n <= t[1];
}
function x(e, t) {
  if (!e) return null;
  let n = e.split(`-`);
  if (n.length < 3) return null;
  let r = parseInt(n[1], 10) - 1,
    i = parseInt(n[2], 10);
  if (Number.isNaN(r) || Number.isNaN(i)) return null;
  let a = new Date(t.getFullYear(), r, i);
  return (a < t && (a = new Date(t.getFullYear() + 1, r, i)), a);
}
function S(e, t, n, r) {
  let i = y(r),
    a = e.filter((e) => e.status === `entregue` && b(e.data, i)),
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
    p = new Date();
  p.setHours(0, 0, 0, 0);
  let h = new Date(p);
  h.setDate(h.getDate() + 7);
  let g = n
      .map((e) => {
        let t = x(e.data_aniversario, p);
        return !t || t > h ? null : { ...e, _anivData: t };
      })
      .filter((e) => e !== null)
      .sort((e, t) => e._anivData.getTime() - t._anivData.getTime()),
    _ = { orcamento: 0, confirmado: 0, em_separacao: 0, entregue: 0, cancelado: 0 };
  e.forEach((e) => {
    e.status in _ && _[e.status]++;
  });
  let v = new Date().toISOString().slice(0, 10),
    S = a.filter((e) => e.data === v).length,
    C = e
      .filter((e) => [`orcamento`, `confirmado`, `em_separacao`].includes(e.status))
      .reduce((e, t) => e + (t.total || 0), 0),
    w = n.filter((e) => e.tel || e.whatsapp || e.email).length,
    T = t.filter((e) => (e.esal ?? 0) > 0).length,
    E = Math.max(t.length - d.length - f.length, 0),
    D = t.length > 0 ? (E / t.length) * 100 : 100,
    O = e.length > 0 ? ((_.entregue ?? 0) / Math.max(e.length, 1)) * 100 : 0,
    k = n.length > 0 ? (w / Math.max(n.length, 1)) * 100 : 0,
    A = t.length > 0 ? (T / Math.max(t.length, 1)) * 100 : 0,
    j = {};
  a.forEach((e) => {
    (Array.isArray(e.itens) ? e.itens : []).forEach((e) => {
      j[e.nome] = (j[e.nome] ?? 0) + e.qty * e.preco;
    });
  });
  let M = Object.entries(j)
      .sort((e, t) => t[1] - e[1])
      .slice(0, 5),
    N = M[0]?.[1] || 1,
    P = {};
  a.forEach((e) => {
    let t = new Date(`${e.data ?? ``}T00:00:00`),
      n = r === `ano` ? `${m[t.getMonth()]}/${String(t.getFullYear()).slice(2)}` : (e.data ?? ``);
    (P[n] || (P[n] = { fat: 0, lucro: 0 }), (P[n].fat += e.total || 0));
    let i = Array.isArray(e.itens) ? e.itens : [];
    P[n].lucro += i.reduce((e, t) => e + (t.preco - t.custo) * t.qty, 0);
  });
  let F = Object.keys(P).sort().slice(-10);
  return {
    entregues: a,
    fat: o,
    lucro: s,
    mg: c,
    tk: l,
    abertos: u,
    crit: d,
    baixo: f,
    anivProximos: g,
    stMap: _,
    topProdutos: M,
    maxTopFat: N,
    grupos: P,
    chartKeys: F,
    maxChartFat: Math.max(...F.map((e) => P[e].fat), 1),
    hoje: p,
    entreguesHoje: S,
    pipelineValue: C,
    clientesComContato: w,
    estoqueSaudavelPct: D,
    taxaEntrega: O,
    coberturaContatoPct: k,
    mixAtivoPct: A
  };
}
function C() {
  let e = String(window.__SC_USER_ROLE__ || `operador`).toLowerCase();
  return e === `admin` ? `admin` : e === `gerente` ? `gerente` : `operador`;
}
function w(e) {
  return e === `admin` ? `analitico` : e === `gerente` ? `gerencial` : `operacional`;
}
function T(e, t) {
  return `sc_dashboard_view_v1:${e}:${t || `sem-filial`}`;
}
function E(e, t) {
  try {
    let t = localStorage.getItem(e);
    if (t === `operacional` || t === `gerencial` || t === `analitico`) return t;
  } catch {}
  return t;
}
function D(e) {
  let t = document.querySelector(`.ni[data-p="${e}"]`);
  t instanceof HTMLButtonElement && t.click();
}
function O({ periodo: e, onChange: t }) {
  return (0, f.jsx)(`div`, {
    className: `pseg`,
    'data-testid': `dash-period-selector`,
    children: [
      { value: `semana`, label: `Semana` },
      { value: `mes`, label: `Mês` },
      { value: `ano`, label: `Ano` },
      { value: `tudo`, label: `Tudo` }
    ].map((n) =>
      (0, f.jsx)(
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
function k({ view: e, onChange: t }) {
  return (0, f.jsx)(`div`, {
    className: `dash-view-selector`,
    'aria-label': `Mudar objetivo do painel`,
    children: Object.entries(h).map(([n, r]) =>
      (0, f.jsx)(
        `button`,
        { className: e === n ? `on` : ``, onClick: () => t(n), type: `button`, children: r },
        n
      )
    )
  });
}
function A({ fat: e, lucro: t, mg: n, tk: r, abertos: i, entreguesCount: a, allPedsCount: o }) {
  return (0, f.jsxs)(`div`, {
    className: `mg dash-bento-band dash-bento-band--metrics`,
    'data-testid': `dash-kpis`,
    children: [
      (0, f.jsxs)(`div`, {
        className: `met metric-card`,
        children: [
          (0, f.jsx)(`div`, { className: `metric-card__eyebrow`, children: `Receita` }),
          (0, f.jsx)(`div`, { className: `ml`, children: `Faturamento` }),
          (0, f.jsx)(`div`, { className: `mv kpi-value-sm`, children: _(e) }),
          (0, f.jsxs)(`div`, { className: `ms metric-card__foot`, children: [a, ` entregue(s)`] })
        ]
      }),
      (0, f.jsxs)(`div`, {
        className: `met metric-card`,
        children: [
          (0, f.jsx)(`div`, { className: `metric-card__eyebrow`, children: `Resultado` }),
          (0, f.jsx)(`div`, { className: `ml`, children: `Lucro bruto` }),
          (0, f.jsx)(`div`, {
            className: `mv kpi-value-sm ${t >= 0 ? `tone-success` : `tone-critical`}`,
            children: _(t)
          }),
          (0, f.jsx)(`div`, {
            className: `ms metric-card__foot`,
            children: t >= 0 ? `Operação saudável` : `Abaixo do esperado`
          })
        ]
      }),
      (0, f.jsxs)(`div`, {
        className: `met metric-card`,
        children: [
          (0, f.jsx)(`div`, { className: `metric-card__eyebrow`, children: `Eficiência` }),
          (0, f.jsx)(`div`, { className: `ml`, children: `Margem` }),
          (0, f.jsx)(`div`, {
            className: `mv ${n >= 15 ? `tone-success` : n >= 8 ? `tone-warning` : `tone-critical`}`,
            children: v(n)
          }),
          (0, f.jsx)(`div`, {
            className: `ms metric-card__foot`,
            children: n >= 15 ? `Boa zona de margem` : n >= 8 ? `Atenção` : `Revisar mix e preço`
          })
        ]
      }),
      (0, f.jsxs)(`div`, {
        className: `met metric-card`,
        children: [
          (0, f.jsx)(`div`, { className: `metric-card__eyebrow`, children: `Conversão` }),
          (0, f.jsx)(`div`, { className: `ml`, children: `Ticket médio` }),
          (0, f.jsx)(`div`, { className: `mv kpi-value-sm`, children: _(r) }),
          (0, f.jsxs)(`div`, {
            className: `ms metric-card__foot`,
            children: [`Base `, o, ` pedido(s)`]
          })
        ]
      }),
      (0, f.jsxs)(`div`, {
        className: `met metric-card`,
        children: [
          (0, f.jsx)(`div`, { className: `metric-card__eyebrow`, children: `Pipeline` }),
          (0, f.jsx)(`div`, { className: `ml`, children: `Em aberto` }),
          (0, f.jsx)(`div`, { className: `mv tone-warning`, children: i }),
          (0, f.jsx)(`div`, {
            className: `ms metric-card__foot`,
            children: `Orçamentos e confirmados`
          })
        ]
      })
    ]
  });
}
function j({ crit: e, baixo: t, anivProximos: n, hoje: r }) {
  return !e.length && !t.length && !n.length
    ? (0, f.jsx)(`div`, {
        className: `empty-inline table-cell-muted`,
        children: `Sem alertas no momento.`
      })
    : (0, f.jsxs)(`div`, {
        'data-testid': `dash-alerts`,
        children: [
          e.length > 0 &&
            (0, f.jsxs)(`div`, {
              className: `alert al-r dash-alert-card`,
              children: [
                (0, f.jsx)(`div`, {
                  className: `dash-alert-card__title`,
                  children: (0, f.jsx)(`b`, { children: `Estoque crítico` })
                }),
                (0, f.jsxs)(`div`, {
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
            (0, f.jsxs)(`div`, {
              className: `alert al-a dash-alert-card`,
              children: [
                (0, f.jsx)(`div`, {
                  className: `dash-alert-card__title`,
                  children: (0, f.jsx)(`b`, { children: `Estoque em atenção` })
                }),
                (0, f.jsxs)(`div`, {
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
            (0, f.jsxs)(`div`, {
              className: `alert al-g`,
              children: [
                (0, f.jsx)(`b`, { children: `Aniversários próximos:` }),
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
function M({ chartKeys: e, grupos: t, maxFat: n }) {
  return e.length
    ? (0, f.jsxs)(`div`, {
        'data-testid': `dash-chart`,
        children: [
          (0, f.jsx)(`div`, {
            className: `barchart`,
            children: e.map((e) => {
              let r = t[e],
                i = Math.max(2, (r.fat / n) * 100),
                a = Math.max(0, (r.lucro / n) * 100);
              return (0, f.jsxs)(
                `div`,
                {
                  className: `barchart__group`,
                  title: `${e}: ${_(r.fat)}`,
                  children: [
                    (0, f.jsxs)(`div`, {
                      className: `barchart__bars`,
                      children: [
                        (0, f.jsx)(`span`, {
                          className: `barchart__bar barchart__bar--fat`,
                          style: { height: `${i}%` }
                        }),
                        (0, f.jsx)(`span`, {
                          className: `barchart__bar barchart__bar--lucro`,
                          style: { height: `${a}%` }
                        })
                      ]
                    }),
                    (0, f.jsx)(`div`, { className: `barchart__label`, children: e })
                  ]
                },
                e
              );
            })
          }),
          (0, f.jsxs)(`div`, {
            className: `dash-chart-legend`,
            children: [
              (0, f.jsxs)(`span`, {
                children: [
                  (0, f.jsx)(`span`, { className: `dash-legend-swatch dash-legend-swatch--fat` }),
                  `Faturamento`
                ]
              }),
              (0, f.jsxs)(`span`, {
                children: [
                  (0, f.jsx)(`span`, { className: `dash-legend-swatch dash-legend-swatch--lucro` }),
                  `Lucro`
                ]
              })
            ]
          })
        ]
      })
    : (0, f.jsx)(`div`, {
        className: `empty dash-empty-compact`,
        children: (0, f.jsx)(`p`, { children: `Sem pedidos entregues no período.` })
      });
}
function N({ stMap: e }) {
  let t = {
      orcamento: `Orçamento`,
      confirmado: `Confirmado`,
      em_separacao: `Em separação`,
      entregue: `Entregue`,
      cancelado: `Cancelado`
    },
    n = Object.values(e).reduce((e, t) => e + t, 0);
  return (0, f.jsx)(`div`, {
    'data-testid': `dash-status-pedidos`,
    children: Object.entries(t).map(([t, r]) => {
      let i = e[t] ?? 0,
        a = n > 0 ? (i / n) * 100 : 0;
      return (0, f.jsxs)(
        `div`,
        {
          className: `dash-status-row`,
          children: [
            (0, f.jsx)(`span`, { className: `dash-status-label`, children: r }),
            (0, f.jsx)(`span`, {
              className: `dash-status-bar`,
              children: (0, f.jsx)(`span`, {
                className: `dash-status-fill dash-status-fill--${t}`,
                style: { width: `${a}%` }
              })
            }),
            (0, f.jsx)(`span`, { className: `dash-status-count`, children: i })
          ]
        },
        t
      );
    })
  });
}
function P({ topProdutos: e, maxFat: t }) {
  return e.length
    ? (0, f.jsx)(`div`, {
        'data-testid': `dash-top-produtos`,
        children: e.map(([e, n]) =>
          (0, f.jsxs)(
            `div`,
            {
              className: `dash-top-row`,
              children: [
                (0, f.jsx)(`span`, {
                  className: `dash-top-label`,
                  title: e,
                  children: e.length > 28 ? `${e.slice(0, 28)}…` : e
                }),
                (0, f.jsx)(`span`, {
                  className: `dash-top-bar`,
                  children: (0, f.jsx)(`span`, {
                    className: `dash-top-fill`,
                    style: { width: `${Math.max(4, (n / t) * 100)}%` }
                  })
                }),
                (0, f.jsx)(`span`, { className: `dash-top-value`, children: _(n) })
              ]
            },
            e
          )
        )
      })
    : (0, f.jsx)(`div`, {
        className: `empty-inline table-cell-muted`,
        children: `Sem dados no período.`
      });
}
function F({ role: e, view: t, derived: n, pedidosCount: r, produtosCount: i, clientesCount: a }) {
  let o = {
    operador: {
      title: `Seu foco hoje`,
      copy: `Leitura direta para agir mais rápido na operação do dia.`,
      items: [
        {
          label: `Fila em aberto`,
          value: String(n.abertos),
          hint:
            n.abertos > 0 ? `${_(n.pipelineValue)} aguardando avanço.` : `Sem fila pendente agora.`,
          cta: `Abrir pedidos`,
          page: `pedidos`
        },
        {
          label: `Estoque crítico`,
          value: String(n.crit.length),
          hint:
            n.crit.length > 0
              ? `Há itens zerados pedindo reposição.`
              : `Sem ruptura crítica neste momento.`,
          cta: `Ver estoque`,
          page: `estoque`
        },
        {
          label: `Base ativa`,
          value: `${i} / ${a}`,
          hint: `Produtos e clientes já prontos para vender.`,
          cta: `Ver clientes`,
          page: `clientes`
        }
      ]
    },
    gerente: {
      title: `Resumo para gestão`,
      copy: `O que mais influencia ritmo, resultado e acompanhamento da filial.`,
      items: [
        {
          label: `Faturamento`,
          value: _(n.fat),
          hint: `${n.entreguesHoje} entrega(s) concluída(s) hoje.`,
          cta: `Ver relatórios`,
          page: `relatorios`
        },
        {
          label: `Margem`,
          value: v(n.mg),
          hint: n.mg >= 15 ? `Margem em zona confortável.` : `Vale revisar mix, preço e custo.`,
          cta: `Ver análises`,
          page: `gerencial`
        },
        {
          label: `Pipeline`,
          value: _(n.pipelineValue),
          hint: `${n.abertos} pedido(s) ainda em aberto.`,
          cta: `Acompanhar pedidos`,
          page: `pedidos`
        }
      ]
    },
    admin: {
      title: `Visão de escala e controle`,
      copy: `Sinais de maturidade da base e pontos que pedem padronização.`,
      items: [
        {
          label: `Contato da base`,
          value: v(n.coberturaContatoPct),
          hint: `${n.clientesComContato} de ${a} clientes com canal preenchido.`,
          cta: `Revisar clientes`,
          page: `clientes`
        },
        {
          label: `Estoque saudável`,
          value: v(n.estoqueSaudavelPct),
          hint: `Percentual do catálogo fora da zona de risco.`,
          cta: `Revisar estoque`,
          page: `estoque`
        },
        {
          label: `Mix ativo`,
          value: v(n.mixAtivoPct),
          hint: `${r} pedido(s) alimentando a leitura atual.`,
          cta: `Ajustar acessos`,
          page: `acessos`
        }
      ]
    }
  }[e];
  return (0, f.jsxs)(`section`, {
    className: `dash-role-summary card card-shell dash-bento-card`,
    children: [
      (0, f.jsxs)(`div`, {
        className: `dash-role-summary__head`,
        children: [
          (0, f.jsxs)(`div`, {
            children: [
              (0, f.jsxs)(`div`, {
                className: `dash-role-summary__eyebrow`,
                children: [g[e], ` · modo `, h[t]]
              }),
              (0, f.jsx)(`h3`, { children: o.title }),
              (0, f.jsx)(`p`, { children: o.copy })
            ]
          }),
          (0, f.jsx)(`span`, {
            className: `bdg ${e === `admin` ? `br` : e === `gerente` ? `ba` : `bg`}`,
            children: g[e]
          })
        ]
      }),
      (0, f.jsx)(`div`, {
        className: `dash-role-summary__grid`,
        children: o.items.map((e) =>
          (0, f.jsxs)(
            `div`,
            {
              className: `dash-role-summary__item`,
              children: [
                (0, f.jsx)(`div`, { className: `dash-role-summary__label`, children: e.label }),
                (0, f.jsx)(`div`, { className: `dash-role-summary__value`, children: e.value }),
                (0, f.jsx)(`div`, { className: `dash-role-summary__hint`, children: e.hint }),
                (0, f.jsx)(`button`, {
                  className: `btn btn-sm`,
                  type: `button`,
                  onClick: () => D(e.page),
                  children: e.cta
                })
              ]
            },
            e.label
          )
        )
      })
    ]
  });
}
function I({ derived: e, clientesCount: t, produtosCount: n }) {
  return (0, f.jsx)(`div`, {
    className: `dash-insight-grid`,
    children: [
      {
        title: `Cobertura de contato`,
        value: v(e.coberturaContatoPct),
        hint: `${e.clientesComContato} de ${t} clientes com telefone, WhatsApp ou e-mail.`
      },
      {
        title: `Taxa de entrega`,
        value: v(e.taxaEntrega),
        hint: `Participação de pedidos entregues dentro da base observada.`
      },
      {
        title: `Catálogo ativo`,
        value: v(e.mixAtivoPct),
        hint: `${n} produtos no catálogo e ${e.crit.length + e.baixo.length} em atenção.`
      }
    ].map((e) =>
      (0, f.jsxs)(
        `div`,
        {
          className: `card card-shell dash-bento-card dash-insight-card`,
          children: [
            (0, f.jsx)(`div`, { className: `ct`, children: e.title }),
            (0, f.jsx)(`div`, { className: `dash-insight-card__value`, children: e.value }),
            (0, f.jsx)(`div`, { className: `dash-insight-card__hint`, children: e.hint })
          ]
        },
        e.title
      )
    )
  });
}
function L() {
  let e = d((e) => e.periodo),
    t = d((e) => e.pedidos),
    n = d((e) => e.produtos),
    r = d((e) => e.clientes),
    i = d((e) => e.status),
    a = d((e) => e.error),
    s = d((e) => e.setPeriodo),
    c = o((e) => e.filialId),
    u = C(),
    p = T(u, c),
    [m, h] = (0, l.useState)(() => E(p, w(u)));
  ((0, l.useEffect)(() => {
    h(E(p, w(u)));
  }, [u, p]),
    (0, l.useEffect)(() => {
      localStorage.setItem(p, m);
    }, [m, p]));
  let g = (0, l.useMemo)(() => S(t, n, r, e), [t, n, r, e]),
    _ = { semana: `Esta semana`, mes: `Este mês`, ano: `Este ano`, tudo: `Todos os períodos` },
    v = m === `operacional`,
    y = m === `gerencial`,
    b = m === `analitico`;
  return (0, f.jsxs)(`div`, {
    className: `dash-bento-page`,
    'data-testid': `dashboard-pilot-page`,
    children: [
      (0, f.jsxs)(`div`, {
        className: `page-controls-bar toolbar toolbar-shell toolbar-shell--page`,
        children: [
          (0, f.jsxs)(`div`, {
            className: `fg2 dash-page-toolbar`,
            children: [
              (0, f.jsxs)(`span`, {
                className: `table-cell-muted dash-page-toolbar__meta`,
                children: [c ?? `—`, ` · `, _[e]]
              }),
              (0, f.jsx)(O, { periodo: e, onChange: s })
            ]
          }),
          (0, f.jsx)(k, { view: m, onChange: h })
        ]
      }),
      a && (0, f.jsx)(`div`, { className: `alert al-r`, children: a }),
      i === `loading` &&
        (0, f.jsxs)(`div`, {
          className: `sk-card`,
          'data-testid': `dash-pilot-loading`,
          children: [
            (0, f.jsx)(`div`, { className: `sk-line` }),
            (0, f.jsx)(`div`, { className: `sk-line` }),
            (0, f.jsx)(`div`, { className: `sk-line` })
          ]
        }),
      i === `ready` &&
        (0, f.jsxs)(f.Fragment, {
          children: [
            (0, f.jsx)(F, {
              role: u,
              view: m,
              derived: g,
              pedidosCount: t.length,
              produtosCount: n.length,
              clientesCount: r.length
            }),
            (0, f.jsx)(A, {
              fat: g.fat,
              lucro: g.lucro,
              mg: g.mg,
              tk: g.tk,
              abertos: g.abertos,
              entreguesCount: g.entregues.length,
              allPedsCount: t.length
            }),
            v &&
              (0, f.jsxs)(f.Fragment, {
                children: [
                  (0, f.jsxs)(`section`, {
                    className: `dash-section dash-section--operacao dash-bento-panel dash-bento-panel--ops`,
                    children: [
                      (0, f.jsxs)(`div`, {
                        className: `dash-section-head`,
                        children: [
                          (0, f.jsx)(`h3`, { children: `Decisões de hoje` }),
                          (0, f.jsx)(`p`, {
                            children: `Fila, ruptura e sinais que pedem ação imediata.`
                          })
                        ]
                      }),
                      (0, f.jsx)(j, {
                        crit: g.crit,
                        baixo: g.baixo,
                        anivProximos: g.anivProximos,
                        hoje: g.hoje
                      })
                    ]
                  }),
                  (0, f.jsxs)(`div`, {
                    className: `dash-grid-main dash-bento-grid dash-bento-grid--primary`,
                    children: [
                      (0, f.jsxs)(`div`, {
                        className: `card card-shell dash-card dash-bento-card dash-bento-card--status`,
                        children: [
                          (0, f.jsx)(`div`, { className: `ct`, children: `Status dos pedidos` }),
                          (0, f.jsx)(N, { stMap: g.stMap })
                        ]
                      }),
                      (0, f.jsxs)(`div`, {
                        className: `card card-shell dash-card dash-card--top dash-bento-card`,
                        children: [
                          (0, f.jsx)(`div`, { className: `ct`, children: `Top produtos` }),
                          (0, f.jsx)(P, { topProdutos: g.topProdutos, maxFat: g.maxTopFat })
                        ]
                      })
                    ]
                  })
                ]
              }),
            (y || b) &&
              (0, f.jsxs)(`section`, {
                className: `dash-section dash-section--analise dash-bento-panel dash-bento-panel--analysis`,
                children: [
                  (0, f.jsxs)(`div`, {
                    className: `dash-section-head`,
                    children: [
                      (0, f.jsx)(`h3`, { children: b ? `Leitura analítica` : `Leitura gerencial` }),
                      (0, f.jsx)(`p`, {
                        children: b
                          ? `Profundidade para identificar padrão, cobertura e consistência operacional.`
                          : `Resultado, tendência e distribuição do desempenho comercial.`
                      })
                    ]
                  }),
                  b &&
                    (0, f.jsx)(I, { derived: g, clientesCount: r.length, produtosCount: n.length }),
                  (0, f.jsxs)(`div`, {
                    className: `dash-grid-main dash-bento-grid dash-bento-grid--primary`,
                    children: [
                      (0, f.jsxs)(`div`, {
                        className: `card card-shell dash-card dash-card--hero dash-bento-card dash-bento-card--chart`,
                        children: [
                          (0, f.jsx)(`div`, { className: `ct`, children: `Faturamento e lucro` }),
                          (0, f.jsx)(M, {
                            chartKeys: g.chartKeys,
                            grupos: g.grupos,
                            maxFat: g.maxChartFat
                          })
                        ]
                      }),
                      (0, f.jsxs)(`div`, {
                        className: `card card-shell dash-card dash-bento-card dash-bento-card--status`,
                        children: [
                          (0, f.jsx)(`div`, { className: `ct`, children: `Status dos pedidos` }),
                          (0, f.jsx)(N, { stMap: g.stMap })
                        ]
                      })
                    ]
                  }),
                  (0, f.jsx)(`div`, {
                    className: `dash-grid-cards dash-grid-cards--analise`,
                    children: (0, f.jsxs)(`div`, {
                      className: `card card-shell dash-card dash-card--top dash-bento-card`,
                      children: [
                        (0, f.jsx)(`div`, { className: `ct`, children: `Top produtos` }),
                        (0, f.jsx)(P, { topProdutos: g.topProdutos, maxFat: g.maxTopFat })
                      ]
                    })
                  })
                ]
              }),
            b &&
              (0, f.jsxs)(`section`, {
                className: `dash-section dash-section--operacao dash-bento-panel dash-bento-panel--ops`,
                children: [
                  (0, f.jsxs)(`div`, {
                    className: `dash-section-head`,
                    children: [
                      (0, f.jsx)(`h3`, { children: `Sinais operacionais de apoio` }),
                      (0, f.jsx)(`p`, {
                        children: `Contexto que ajuda a explicar resultado e orientar ajuste fino.`
                      })
                    ]
                  }),
                  (0, f.jsx)(j, {
                    crit: g.crit,
                    baixo: g.baixo,
                    anivProximos: g.anivProximos,
                    hoje: g.hoje
                  })
                ]
              })
          ]
        })
    ]
  });
}
function R(e, t) {
  return { apikey: e, Authorization: `Bearer ${t}`, 'Content-Type': `application/json` };
}
async function z(e) {
  let t = await e.text().catch(() => ``);
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}
function B(e, t, n) {
  if (!e.ok)
    throw t && typeof t == `object` && `message` in t && typeof t.message == `string`
      ? Error(t.message)
      : Error(n);
}
async function V(e, t) {
  let n = await fetch(
      `${e.url}/rest/v1/pedidos?filial_id=eq.${encodeURIComponent(t)}&order=data.desc`,
      { headers: R(e.key, e.token), signal: AbortSignal.timeout(15e3) }
    ),
    r = await z(n);
  return (B(n, r, `Erro ${n.status} ao carregar pedidos`), Array.isArray(r) ? r : []);
}
async function H(e, t) {
  let n = await fetch(
      `${e.url}/rest/v1/produtos?filial_id=eq.${encodeURIComponent(t)}&order=nome.asc`,
      { headers: R(e.key, e.token), signal: AbortSignal.timeout(15e3) }
    ),
    r = await z(n);
  return (B(n, r, `Erro ${n.status} ao carregar produtos`), Array.isArray(r) ? r : []);
}
async function U(e, t) {
  let n = await fetch(
      `${e.url}/rest/v1/clientes?filial_id=eq.${encodeURIComponent(t)}&order=nome.asc`,
      { headers: R(e.key, e.token), signal: AbortSignal.timeout(15e3) }
    ),
    r = await z(n);
  return (B(n, r, `Erro ${n.status} ao carregar clientes`), Array.isArray(r) ? r : []);
}
function W() {
  let t = d((e) => e.setData),
    r = d((e) => e.setStatus),
    i = n((e) => e.session),
    a = n((e) => e.status),
    s = o((e) => e.filialId),
    c = (0, l.useRef)(!1);
  (0, l.useEffect)(() => {
    if (a === `unknown`) return;
    if (a === `unauthenticated` || !i?.access_token) {
      r(`error`, `Sessão expirada. Faça login novamente.`);
      return;
    }
    if (!s) {
      r(`error`, `Nenhuma filial selecionada.`);
      return;
    }
    let { url: n, key: o, ready: l } = e();
    if (!l) {
      r(`error`, `Configuração do Supabase ausente.`);
      return;
    }
    if (c.current) return;
    ((c.current = !0), r(`loading`));
    let u = { url: n, key: o, token: i.access_token };
    Promise.all([V(u, s), H(u, s), U(u, s)])
      .then(([e, n, r]) => {
        t({ pedidos: e, produtos: n, clientes: r });
      })
      .catch((e) => {
        ((c.current = !1), r(`error`, e instanceof Error ? e.message : `Erro ao carregar dados.`));
      });
  }, [a, i, s, t, r]);
  function u() {
    if (((c.current = !1), !i?.access_token || !s)) return;
    let { url: n, key: a, ready: o } = e();
    if (!o) return;
    (r(`loading`), (c.current = !0));
    let l = { url: n, key: a, token: i.access_token };
    Promise.all([V(l, s), H(l, s), U(l, s)])
      .then(([e, n, r]) => t({ pedidos: e, produtos: n, clientes: r }))
      .catch((e) => {
        ((c.current = !1),
          r(`error`, e instanceof Error ? e.message : `Erro ao recarregar dados.`));
      });
  }
  return { reload: u };
}
c();
var G = null;
function K() {
  return (W(), (0, f.jsx)(L, {}));
}
function q(e) {
  ((G = (0, u.createRoot)(e)), G.render((0, f.jsx)(l.StrictMode, { children: (0, f.jsx)(K, {}) })));
}
function J() {
  G &&= (G.unmount(), null);
}
window.__SC_DASHBOARD_DIRECT_BRIDGE__ = { mount: q, unmount: J };
