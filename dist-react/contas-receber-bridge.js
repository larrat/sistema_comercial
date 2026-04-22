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
import { a as u, i as d, n as f, r as p, t as m } from './contasReceberApi-B1L-rMBw.js';
var h = r(t(), 1),
  g = s(),
  _ = a((e) => ({
    contas: [],
    baixas: [],
    status: `idle`,
    error: null,
    activeTab: `pendentes`,
    searchQuery: ``,
    inFlight: new Set(),
    setContas: (t) => e({ contas: t, status: `ready`, error: null }),
    setBaixas: (t) => e({ baixas: t }),
    setStatus: (t, n) => e({ status: t, error: n ?? null }),
    setActiveTab: (t) => e({ activeTab: t, searchQuery: `` }),
    setSearchQuery: (t) => e({ searchQuery: t }),
    upsertConta: (t) =>
      e((e) => ({
        contas: e.contas.some((e) => e.id === t.id)
          ? e.contas.map((e) => (e.id === t.id ? t : e))
          : [...e.contas, t]
      })),
    syncBaixa: (t) =>
      e((e) => ({
        baixas: e.baixas.some((e) => e.id === t.id)
          ? e.baixas.map((e) => (e.id === t.id ? t : e))
          : [t, ...e.baixas]
      })),
    removeBaixa: (t) => e((e) => ({ baixas: e.baixas.filter((e) => e.id !== t) })),
    removeBaixasByConta: (t) =>
      e((e) => ({ baixas: e.baixas.filter((e) => e.conta_receber_id !== t) })),
    setInFlight: (t, n) =>
      e((e) => {
        let r = new Set(e.inFlight);
        return (n ? r.add(t) : r.delete(t), { inFlight: r });
      })
  }));
function v(e) {
  return Number(Number(e || 0).toFixed(2));
}
function y() {
  return new Date().toISOString().split(`T`)[0];
}
function b(e) {
  return Number.isFinite(Number(e.valor_recebido))
    ? v(Number(e.valor_recebido))
    : e.status === `recebido`
      ? v(Number(e.valor || 0))
      : 0;
}
function x(e) {
  return Number.isFinite(Number(e.valor_em_aberto))
    ? v(Number(e.valor_em_aberto))
    : v(Math.max(0, Number(e.valor || 0) - b(e)));
}
function S(e) {
  return x(e) <= 0 || e.status === `recebido`
    ? `Recebido`
    : b(e) > 0 || e.status === `parcial`
      ? `Parcial`
      : `Pendente`;
}
function C(e) {
  return x(e) <= 0 || e.status === `recebido`
    ? `recebido`
    : e.vencimento < y()
      ? `vencido`
      : `pendente_ok`;
}
function w() {
  let t = _((e) => e.contas),
    r = _((e) => e.baixas),
    i = _((e) => e.setContas),
    a = _((e) => e.setBaixas),
    s = _((e) => e.setInFlight),
    c = n((e) => e.session),
    l = o((e) => e.filialId);
  function h() {
    let { url: t, key: n } = e();
    return { url: t, key: n, token: c?.access_token ?? ``, filialId: l ?? `` };
  }
  function g(e) {
    return r
      .filter((t) => t.conta_receber_id === e)
      .sort((e, t) => String(t.recebido_em || ``).localeCompare(String(e.recebido_em || ``)));
  }
  async function y() {
    let e = h(),
      [t, n] = await Promise.all([p(e), f(e)]);
    (i(t), a(n));
  }
  async function b(e, n, r, i) {
    let a = t.find((t) => t.id === e);
    if (!a) return { ok: !1, error: `Conta não encontrada.` };
    let o = x(a),
      c = v(n);
    if (c <= 0) return { ok: !1, error: `Informe um valor maior que zero.` };
    if (c > o + 0.001) return { ok: !1, error: `A baixa não pode ultrapassar o valor em aberto.` };
    s(e, !0);
    try {
      return (
        await u(h(), {
          baixaId: globalThis.crypto.randomUUID(),
          contaId: e,
          valor: c,
          recebidoEm: r,
          observacao: i
        }),
        await y(),
        { ok: !0 }
      );
    } catch (e) {
      return { ok: !1, error: e instanceof Error ? e.message : `Erro ao registrar baixa.` };
    } finally {
      s(e, !1);
    }
  }
  async function S(e) {
    let n = t.find((t) => t.id === e);
    if (!n) return { ok: !1, error: `Conta não encontrada.` };
    let r = x(n);
    return r <= 0
      ? { ok: !1, error: `Esta conta já está quitada.` }
      : b(e, r, new Date().toISOString(), `Recebimento total`);
  }
  async function C(e) {
    if (!t.find((t) => t.id === e)) return { ok: !1, error: `Conta não encontrada.` };
    s(e, !0);
    try {
      return (await d(h(), e), await y(), { ok: !0 });
    } catch (e) {
      return { ok: !1, error: e instanceof Error ? e.message : `Erro ao desfazer recebimento.` };
    } finally {
      s(e, !1);
    }
  }
  async function w(e, n) {
    let i = t.find((t) => t.id === e),
      a = r.find((t) => t.id === n && t.conta_receber_id === e);
    if (!i || !a) return { ok: !1, error: `Baixa não encontrada para estorno.` };
    s(e, !0);
    try {
      return (await m(h(), n), await y(), { ok: !0 });
    } catch (e) {
      return { ok: !1, error: e instanceof Error ? e.message : `Erro ao estornar baixa.` };
    } finally {
      s(e, !1);
    }
  }
  return {
    registrarBaixa: b,
    marcarRecebido: S,
    marcarPendente: C,
    estornarBaixa: w,
    getBaixasConta: g
  };
}
var T = i(),
  E = `receber-react-pilot`,
  D = `receber-legacy-shell`;
function O() {
  return new Date().toISOString().split(`T`)[0];
}
function k(e) {
  return Number(e ?? 0).toLocaleString(`pt-BR`, { style: `currency`, currency: `BRL` });
}
function A(e) {
  if (!e) return `-`;
  let t = new Date(e);
  return Number.isNaN(t.getTime())
    ? String(e).slice(0, 16).replace(`T`, ` `)
    : t.toLocaleString(`pt-BR`);
}
function j(e = new Date()) {
  let t = (e) => String(e).padStart(2, `0`);
  return `${e.getFullYear()}-${t(e.getMonth() + 1)}-${t(e.getDate())}T${t(e.getHours())}:${t(e.getMinutes())}`;
}
function M(e) {
  if (!e) return new Date().toISOString();
  let t = new Date(e);
  return Number.isNaN(t.getTime()) ? new Date().toISOString() : t.toISOString();
}
function N({ cr: e }) {
  let t = S(e);
  return (0, T.jsx)(`span`, {
    className: `bdg ${t === `Recebido` ? `bg` : t === `Parcial` ? `ba` : `bk`}`,
    children: t
  });
}
function P({ baixas: e, contaId: t, onEstornar: n }) {
  let [r, i] = (0, h.useState)(!1);
  return e.length
    ? (0, T.jsxs)(`details`, {
        className: `cr-baixas-details`,
        open: r,
        children: [
          (0, T.jsxs)(`summary`, {
            className: `cr-baixas-summary`,
            onClick: (e) => {
              (e.preventDefault(), i(!r));
            },
            children: [
              (0, T.jsx)(`span`, {
                children: `${e.length} baixa${e.length > 1 ? `s` : ``} registrada${e.length > 1 ? `s` : ``}`
              }),
              (0, T.jsx)(`span`, {
                className: `table-cell-caption table-cell-muted`,
                children: `Expandir`
              })
            ]
          }),
          (0, T.jsx)(`div`, {
            className: `cr-baixas-body`,
            children: (0, T.jsx)(`div`, {
              className: `cr-baixas-list`,
              children: e.map((e, r) =>
                (0, T.jsxs)(
                  `div`,
                  {
                    className: `cr-baixas-item`,
                    children: [
                      (0, T.jsxs)(`div`, {
                        className: `cr-baixas-item__head`,
                        children: [
                          (0, T.jsxs)(`span`, {
                            className: `table-cell-strong`,
                            children: [`Baixa `, r + 1]
                          }),
                          (0, T.jsx)(`span`, {
                            className: `tone-success table-cell-strong`,
                            children: k(e.valor)
                          })
                        ]
                      }),
                      (0, T.jsx)(`div`, {
                        className: `table-cell-caption table-cell-muted`,
                        children: A(e.recebido_em)
                      }),
                      e.observacao &&
                        (0, T.jsx)(`div`, {
                          className: `table-cell-caption`,
                          children: e.observacao
                        }),
                      (0, T.jsx)(`div`, {
                        className: `fg2`,
                        children: (0, T.jsx)(`button`, {
                          className: `btn btn-sm`,
                          onClick: () => n(t, e.id),
                          children: `Estornar`
                        })
                      })
                    ]
                  },
                  e.id
                )
              )
            })
          })
        ]
      })
    : (0, T.jsxs)(`details`, {
        className: `cr-baixas-details`,
        children: [
          (0, T.jsxs)(`summary`, {
            className: `cr-baixas-summary`,
            onClick: () => i(!r),
            children: [
              (0, T.jsx)(`span`, { children: `Ver histórico de baixas` }),
              (0, T.jsx)(`span`, {
                className: `table-cell-caption table-cell-muted`,
                children: `Expandir`
              })
            ]
          }),
          (0, T.jsx)(`div`, {
            className: `cr-baixas-body`,
            children: (0, T.jsx)(`div`, {
              className: `empty-inline`,
              children: `Sem baixas registradas para esta conta.`
            })
          })
        ]
      });
}
function F({ cr: e, inFlight: t, onReceber: n, onBaixaParcial: r, onDesfazer: i }) {
  return t
    ? (0, T.jsx)(`span`, {
        className: `table-cell-muted table-cell-caption`,
        children: `Salvando...`
      })
    : C(e) === `recebido`
      ? (0, T.jsx)(`button`, { className: `btn btn-sm`, onClick: i, children: `Desfazer` })
      : (0, T.jsxs)(`div`, {
          className: `fg2`,
          children: [
            (0, T.jsx)(`button`, {
              className: `btn btn-sm`,
              onClick: r,
              children: `Baixa parcial`
            }),
            (0, T.jsx)(`button`, {
              className: `btn btn-sm btn-p`,
              onClick: n,
              children: `Receber tudo`
            })
          ]
        });
}
function I({
  conta: e,
  baixas: t,
  statusEfetivo: n,
  inFlight: r,
  onReceber: i,
  onBaixaParcial: a,
  onDesfazer: o,
  onEstornar: s
}) {
  let c = b(e),
    l = x(e),
    u = t[0] ?? null;
  return (0, T.jsxs)(T.Fragment, {
    children: [
      (0, T.jsxs)(`tr`, {
        children: [
          (0, T.jsxs)(`td`, {
            children: [
              (0, T.jsx)(`div`, { className: `table-cell-strong`, children: e.cliente }),
              (0, T.jsx)(`div`, {
                className: `table-cell-caption`,
                children: (0, T.jsx)(N, { cr: e })
              })
            ]
          }),
          (0, T.jsx)(`td`, {
            className: `table-cell-muted`,
            children: e.pedido_num ? `#${e.pedido_num}` : `-`
          }),
          (0, T.jsx)(`td`, { className: `table-cell-strong`, children: k(e.valor) }),
          (0, T.jsx)(`td`, { className: `table-cell-strong tone-success`, children: k(c) }),
          (0, T.jsx)(`td`, {
            className: `table-cell-strong ${l > 0 ? `tone-warning` : `tone-success`}`,
            children: k(l)
          }),
          (0, T.jsx)(`td`, {
            className: n === `vencido` ? `tone-danger table-cell-strong` : `table-cell-muted`,
            children: e.vencimento
          }),
          (0, T.jsx)(`td`, {
            children: u
              ? (0, T.jsxs)(T.Fragment, {
                  children: [
                    (0, T.jsx)(`div`, { className: `table-cell-strong`, children: k(u.valor) }),
                    (0, T.jsx)(`div`, {
                      className: `table-cell-caption table-cell-muted`,
                      children: A(u.recebido_em)
                    })
                  ]
                })
              : (0, T.jsx)(`span`, { className: `table-cell-muted`, children: `Sem baixas` })
          }),
          (0, T.jsx)(`td`, {
            children: (0, T.jsx)(F, {
              cr: e,
              inFlight: r,
              onReceber: i,
              onBaixaParcial: a,
              onDesfazer: o
            })
          })
        ]
      }),
      (0, T.jsx)(`tr`, {
        className: `cr-baixas-row`,
        children: (0, T.jsx)(`td`, {
          colSpan: 8,
          children: (0, T.jsx)(P, { baixas: t, contaId: e.id, onEstornar: s })
        })
      })
    ]
  });
}
function L({
  conta: e,
  baixas: t,
  inFlight: n,
  onReceber: r,
  onBaixaParcial: i,
  onDesfazer: a,
  onEstornar: o
}) {
  let s = b(e),
    c = x(e);
  return (0, T.jsxs)(`div`, {
    className: `mobile-card`,
    children: [
      (0, T.jsxs)(`div`, {
        className: `mobile-card-head`,
        children: [
          (0, T.jsxs)(`div`, {
            className: `mobile-card-grow`,
            children: [
              (0, T.jsxs)(`div`, {
                className: `mobile-card-title`,
                children: [e.cliente, e.pedido_num ? ` - Ped. #${e.pedido_num}` : ``]
              }),
              (0, T.jsxs)(`div`, {
                className: `mobile-card-sub`,
                children: [`Vencimento: `, e.vencimento]
              })
            ]
          }),
          (0, T.jsx)(`div`, { children: (0, T.jsx)(N, { cr: e }) })
        ]
      }),
      (0, T.jsxs)(`div`, {
        className: `mobile-card-meta mobile-card-meta-gap`,
        children: [
          (0, T.jsxs)(`div`, { children: [`Total: `, (0, T.jsx)(`b`, { children: k(e.valor) })] }),
          (0, T.jsxs)(`div`, { children: [`Recebido: `, (0, T.jsx)(`b`, { children: k(s) })] }),
          (0, T.jsxs)(`div`, { children: [`Em aberto: `, (0, T.jsx)(`b`, { children: k(c) })] }),
          (0, T.jsxs)(`div`, {
            children: [
              `Ultima baixa:`,
              ` `,
              (0, T.jsx)(`b`, { children: A(e.ultimo_recebimento_em ?? e.recebido_em) })
            ]
          })
        ]
      }),
      (0, T.jsx)(`div`, {
        className: `mobile-card-actions`,
        children: (0, T.jsx)(F, {
          cr: e,
          inFlight: n,
          onReceber: r,
          onBaixaParcial: i,
          onDesfazer: a
        })
      }),
      (0, T.jsx)(P, { baixas: t, contaId: e.id, onEstornar: o })
    ]
  });
}
function R({
  contas: e,
  allBaixas: t,
  statusEfetivo: n,
  inFlight: r,
  searchQuery: i,
  onReceber: a,
  onBaixaParcial: o,
  onDesfazer: s,
  onEstornar: c
}) {
  let l = i.toLowerCase(),
    u = [...e]
      .sort((e, t) => e.vencimento.localeCompare(t.vencimento))
      .filter(
        (e) =>
          C(e) === n &&
          (!l ||
            e.cliente.toLowerCase().includes(l) ||
            String(e.pedido_num ?? ``).includes(l) ||
            S(e).toLowerCase().includes(l))
      );
  return u.length
    ? window.matchMedia(`(max-width: 1080px)`).matches
      ? (0, T.jsx)(T.Fragment, {
          children: u.map((e) =>
            (0, T.jsx)(
              L,
              {
                conta: e,
                baixas: t
                  .filter((t) => t.conta_receber_id === e.id)
                  .sort((e, t) =>
                    String(t.recebido_em || ``).localeCompare(String(e.recebido_em || ``))
                  ),
                inFlight: r.has(e.id),
                onReceber: () => a(e.id),
                onBaixaParcial: () => o(e.id),
                onDesfazer: () => s(e.id),
                onEstornar: c
              },
              e.id
            )
          )
        })
      : (0, T.jsx)(`div`, {
          className: `tw`,
          children: (0, T.jsxs)(`table`, {
            className: `tbl`,
            children: [
              (0, T.jsx)(`thead`, {
                children: (0, T.jsxs)(`tr`, {
                  children: [
                    (0, T.jsx)(`th`, { children: `Cliente` }),
                    (0, T.jsx)(`th`, { children: `Pedido` }),
                    (0, T.jsx)(`th`, { children: `Total` }),
                    (0, T.jsx)(`th`, { children: `Recebido` }),
                    (0, T.jsx)(`th`, { children: `Em aberto` }),
                    (0, T.jsx)(`th`, { children: `Vencimento` }),
                    (0, T.jsx)(`th`, { children: `Ultima baixa` }),
                    (0, T.jsx)(`th`, {})
                  ]
                })
              }),
              (0, T.jsx)(`tbody`, {
                children: u.map((e) =>
                  (0, T.jsx)(
                    I,
                    {
                      conta: e,
                      baixas: t
                        .filter((t) => t.conta_receber_id === e.id)
                        .sort((e, t) =>
                          String(t.recebido_em || ``).localeCompare(String(e.recebido_em || ``))
                        ),
                      statusEfetivo: n,
                      inFlight: r.has(e.id),
                      onReceber: () => a(e.id),
                      onBaixaParcial: () => o(e.id),
                      onDesfazer: () => s(e.id),
                      onEstornar: c
                    },
                    e.id
                  )
                )
              })
            ]
          })
        })
    : (0, T.jsxs)(`div`, {
        className: `empty`,
        children: [
          (0, T.jsx)(`div`, { className: `ico`, children: `CR` }),
          (0, T.jsx)(`p`, { children: `Nenhum lançamento encontrado.` })
        ]
      });
}
function z({ contas: e, baixas: t }) {
  let n = O(),
    r = n.slice(0, 7),
    i = e.filter((e) => C(e) !== `recebido`).reduce((e, t) => e + x(t), 0),
    a = e.filter((e) => C(e) !== `recebido` && e.vencimento < n).reduce((e, t) => e + x(t), 0),
    o = t.filter((e) => String(e.recebido_em ?? ``).slice(0, 7) === r),
    s = new Set(o.map((e) => e.conta_receber_id)),
    c = o.reduce((e, t) => e + Number(t.valor || 0), 0),
    l = e
      .filter(
        (e) => C(e) === `recebido` && String(e.recebido_em ?? ``).slice(0, 7) === r && !s.has(e.id)
      )
      .reduce((e, t) => e + Number(t.valor || 0), 0),
    u = Number((c + l).toFixed(2));
  return (0, T.jsxs)(`div`, {
    className: `mg bento-band`,
    children: [
      (0, T.jsxs)(`div`, {
        className: `met`,
        children: [
          (0, T.jsx)(`div`, { className: `ml`, children: `Em aberto` }),
          (0, T.jsx)(`div`, { className: `mv kpi-value-sm tone-warning`, children: k(i) })
        ]
      }),
      (0, T.jsxs)(`div`, {
        className: `met`,
        children: [
          (0, T.jsx)(`div`, { className: `ml`, children: `Vencido` }),
          (0, T.jsx)(`div`, { className: `mv kpi-value-sm tone-danger`, children: k(a) })
        ]
      }),
      (0, T.jsxs)(`div`, {
        className: `met`,
        children: [
          (0, T.jsx)(`div`, { className: `ml`, children: `Recebido no mês` }),
          (0, T.jsx)(`div`, { className: `mv kpi-value-sm tone-success`, children: k(u) })
        ]
      })
    ]
  });
}
function B({ conta: e, onConfirmar: t, onCancelar: n, error: r, submitting: i }) {
  let a = x(e),
    [o, s] = (0, h.useState)(String(a)),
    [c, l] = (0, h.useState)(j()),
    [u, d] = (0, h.useState)(``),
    f = (0, h.useRef)(null);
  (0, h.useEffect)(() => {
    (f.current?.focus(), f.current?.select());
  }, []);
  function p() {
    t(Number(o), M(c), u.trim() || null);
  }
  function m(e) {
    let t = e >= 1 ? a : Number((a * e).toFixed(2));
    s(String(t));
  }
  return (0, T.jsxs)(`div`, {
    className: `modal-wrap`,
    style: { display: `flex` },
    children: [
      (0, T.jsx)(`div`, { className: `modal-bg`, onClick: n }),
      (0, T.jsxs)(`div`, {
        className: `modal`,
        children: [
          (0, T.jsx)(`div`, {
            className: `modal-head`,
            children: (0, T.jsxs)(`div`, {
              className: `modal-title`,
              id: `cr-parcial-titulo`,
              children: [`Registrar baixa - `, e.cliente, e.pedido_num ? ` (#${e.pedido_num})` : ``]
            })
          }),
          (0, T.jsxs)(`div`, {
            className: `modal-body`,
            children: [
              (0, T.jsxs)(`div`, {
                className: `form-section-card form-gap-bottom-xs`,
                children: [
                  (0, T.jsx)(`div`, {
                    className: `form-section-head`,
                    children: (0, T.jsxs)(`div`, {
                      children: [
                        (0, T.jsx)(`div`, {
                          className: `form-section-title`,
                          children: `Resumo da conta`
                        }),
                        (0, T.jsx)(`p`, {
                          className: `form-section-copy`,
                          children: `Use o valor real recebido. O saldo restante continua aberto automaticamente.`
                        })
                      ]
                    })
                  }),
                  (0, T.jsxs)(`div`, {
                    className: `form-summary-grid`,
                    children: [
                      (0, T.jsxs)(`div`, {
                        className: `form-summary-item`,
                        children: [
                          (0, T.jsx)(`span`, {
                            className: `table-cell-caption table-cell-muted`,
                            children: `Total`
                          }),
                          (0, T.jsx)(`strong`, { children: k(e.valor) })
                        ]
                      }),
                      (0, T.jsxs)(`div`, {
                        className: `form-summary-item`,
                        children: [
                          (0, T.jsx)(`span`, {
                            className: `table-cell-caption table-cell-muted`,
                            children: `Recebido`
                          }),
                          (0, T.jsx)(`strong`, { children: k(b(e)) })
                        ]
                      }),
                      (0, T.jsxs)(`div`, {
                        className: `form-summary-item`,
                        children: [
                          (0, T.jsx)(`span`, {
                            className: `table-cell-caption table-cell-muted`,
                            children: `Em aberto`
                          }),
                          (0, T.jsx)(`strong`, { children: k(a) })
                        ]
                      })
                    ]
                  })
                ]
              }),
              r &&
                (0, T.jsx)(`div`, {
                  className: `alert alert-danger`,
                  style: { marginTop: `0.75rem` },
                  children: r
                }),
              (0, T.jsxs)(`div`, {
                className: `form-row`,
                children: [
                  (0, T.jsx)(`label`, { className: `form-label`, children: `Valor recebido` }),
                  (0, T.jsx)(`input`, {
                    ref: f,
                    className: `inp`,
                    type: `number`,
                    step: `0.01`,
                    min: `0.01`,
                    value: o,
                    onChange: (e) => s(e.target.value)
                  }),
                  (0, T.jsxs)(`div`, {
                    className: `form-quick-actions`,
                    children: [
                      (0, T.jsx)(`button`, {
                        type: `button`,
                        className: `btn btn-sm`,
                        onClick: () => m(0.25),
                        children: `25%`
                      }),
                      (0, T.jsx)(`button`, {
                        type: `button`,
                        className: `btn btn-sm`,
                        onClick: () => m(0.5),
                        children: `50%`
                      }),
                      (0, T.jsx)(`button`, {
                        type: `button`,
                        className: `btn btn-sm`,
                        onClick: () => m(1),
                        children: `Quitar saldo`
                      })
                    ]
                  })
                ]
              }),
              (0, T.jsxs)(`div`, {
                className: `form-row`,
                children: [
                  (0, T.jsx)(`label`, { className: `form-label`, children: `Data / hora` }),
                  (0, T.jsx)(`input`, {
                    className: `inp`,
                    type: `datetime-local`,
                    value: c,
                    onChange: (e) => l(e.target.value)
                  })
                ]
              }),
              (0, T.jsxs)(`div`, {
                className: `form-row`,
                children: [
                  (0, T.jsx)(`label`, {
                    className: `form-label`,
                    children: `Observação (opcional)`
                  }),
                  (0, T.jsx)(`input`, {
                    className: `inp`,
                    type: `text`,
                    placeholder: `Ex: Pix, transferência...`,
                    value: u,
                    onChange: (e) => d(e.target.value)
                  })
                ]
              })
            ]
          }),
          (0, T.jsxs)(`div`, {
            className: `modal-foot`,
            children: [
              (0, T.jsx)(`button`, {
                className: `btn btn-p`,
                onClick: p,
                disabled: i,
                children: i ? `Salvando...` : `Confirmar baixa`
              }),
              (0, T.jsx)(`button`, {
                className: `btn`,
                onClick: n,
                disabled: i,
                children: `Cancelar`
              })
            ]
          })
        ]
      })
    ]
  });
}
var V = [
  { key: `pendentes`, label: `Pendentes`, statusEfetivo: `pendente_ok` },
  { key: `vencidos`, label: `Vencidos`, statusEfetivo: `vencido` },
  { key: `recebidos`, label: `Recebidos`, statusEfetivo: `recebido` }
];
function H() {
  let e = _(l((e) => e.contas)),
    t = _(l((e) => e.baixas)),
    n = _((e) => e.status),
    r = _((e) => e.error),
    i = _((e) => e.activeTab),
    a = _((e) => e.setActiveTab),
    o = _((e) => e.searchQuery),
    s = _((e) => e.setSearchQuery),
    c = _(l((e) => e.inFlight)),
    { registrarBaixa: u, marcarRecebido: d, marcarPendente: f, estornarBaixa: p } = w(),
    [m, g] = (0, h.useState)(null),
    [v, y] = (0, h.useState)(null),
    [b, x] = (0, h.useState)(!1),
    S = m ? (e.find((e) => e.id === m) ?? null) : null;
  ((0, h.useEffect)(() => {
    function e(e) {
      if (e.origin !== window.location.origin) return;
      let t = e.data;
      !t || t.source !== D || (t.type === `receber:set-tab` && t.tab && a(t.tab));
    }
    return (window.addEventListener(`message`, e), () => window.removeEventListener(`message`, e));
  }, [a]),
    (0, h.useEffect)(() => {
      let t = e.filter((e) => C(e) !== `recebido`).length;
      window.postMessage(
        { source: E, type: `receber:state`, state: { tab: i, status: n, count: t } },
        window.location.origin
      );
    }, [i, n, e]));
  async function O(e) {
    let t = await d(e);
    t.ok || alert(t.error ?? `Erro ao registrar recebimento.`);
  }
  function A(e) {
    (y(null), g(e));
  }
  async function j(e, t, n) {
    if (!m) return;
    (x(!0), y(null));
    let r = await u(m, e, t, n);
    if ((x(!1), !r.ok)) {
      y(r.error ?? `Erro ao registrar baixa.`);
      return;
    }
    g(null);
  }
  async function M(e) {
    if (!confirm(`Desfazer todas as baixas desta conta e voltar para pendente?`)) return;
    let t = await f(e);
    t.ok || alert(t.error ?? `Erro ao desfazer recebimento.`);
  }
  async function N(n, r) {
    let i = e.find((e) => e.id === n),
      a = t.find((e) => e.id === r);
    if (!i || !a || !confirm(`Estornar a baixa de ${k(a.valor)} para ${i.cliente}?`)) return;
    let o = await p(n, r);
    o.ok || alert(o.error ?? `Erro ao estornar baixa.`);
  }
  let P = V.find((e) => e.key === i) ?? V[0];
  return n === `loading`
    ? (0, T.jsx)(`div`, {
        className: `empty`,
        children: (0, T.jsx)(`p`, { children: `Carregando contas a receber...` })
      })
    : n === `error`
      ? (0, T.jsx)(`div`, {
          className: `empty`,
          children: (0, T.jsx)(`p`, {
            className: `tone-danger`,
            children: r ?? `Erro ao carregar dados.`
          })
        })
      : (0, T.jsxs)(T.Fragment, {
          children: [
            (0, T.jsx)(z, { contas: e, baixas: t }),
            (0, T.jsx)(`div`, {
              className: `tabs`,
              children: V.map((e) =>
                (0, T.jsx)(
                  `button`,
                  {
                    className: `tb${i === e.key ? ` on` : ``}`,
                    onClick: () => a(e.key),
                    children: e.label
                  },
                  e.key
                )
              )
            }),
            (0, T.jsx)(`div`, {
              className: `tc on`,
              children: (0, T.jsxs)(`div`, {
                className: `card card-shell`,
                children: [
                  (0, T.jsx)(`div`, {
                    className: `toolbar toolbar-shell toolbar-shell--section`,
                    children: (0, T.jsx)(`div`, {
                      className: `toolbar-main`,
                      children: (0, T.jsx)(`input`, {
                        className: `inp input-w-sm`,
                        placeholder: `Cliente ou pedido...`,
                        value: o,
                        onChange: (e) => s(e.target.value)
                      })
                    })
                  }),
                  (0, T.jsx)(R, {
                    contas: e,
                    allBaixas: t,
                    statusEfetivo: P.statusEfetivo,
                    inFlight: c,
                    searchQuery: o,
                    onReceber: O,
                    onBaixaParcial: A,
                    onDesfazer: M,
                    onEstornar: N
                  })
                ]
              })
            }),
            S &&
              (0, T.jsx)(B, {
                conta: S,
                onConfirmar: j,
                onCancelar: () => g(null),
                error: v,
                submitting: b
              })
          ]
        });
}
function U() {
  let t = _((e) => e.setContas),
    r = _((e) => e.setBaixas),
    i = _((e) => e.setStatus),
    a = n((e) => e.session),
    s = n((e) => e.status),
    c = o((e) => e.filialId),
    l = (0, h.useRef)(!1);
  (0, h.useEffect)(() => {
    if (s === `unknown`) return;
    if (s === `unauthenticated` || !a?.access_token) {
      i(`error`, `Sessão expirada. Faça login novamente.`);
      return;
    }
    if (!c) {
      i(`error`, `Nenhuma filial selecionada.`);
      return;
    }
    let { url: n, key: o, ready: u } = e();
    if (!u) {
      i(`error`, `Configuração do Supabase ausente.`);
      return;
    }
    if (l.current) return;
    ((l.current = !0), i(`loading`));
    let d = { url: n, key: o, token: a.access_token, filialId: c };
    Promise.all([p(d), f(d)])
      .then(([e, n]) => {
        (t(e), r(n));
      })
      .catch((e) => {
        ((l.current = !1),
          i(`error`, e instanceof Error ? e.message : `Erro ao carregar contas a receber.`));
      });
  }, [s, a, c, t, r, i]);
  function u() {
    if (((l.current = !1), i(`loading`), !a?.access_token || !c)) return;
    let { url: n, key: o, ready: s } = e();
    if (!s) return;
    l.current = !0;
    let u = { url: n, key: o, token: a.access_token, filialId: c };
    Promise.all([p(u), f(u)])
      .then(([e, n]) => {
        (t(e), r(n));
      })
      .catch((e) => {
        ((l.current = !1),
          i(`error`, e instanceof Error ? e.message : `Erro ao recarregar contas a receber.`));
      });
  }
  return { reload: u };
}
c();
var W = null;
function G() {
  let e = n((e) => e.hydrate),
    t = o((e) => e.hydrate);
  return (
    (0, h.useEffect)(() => {
      (t(), e());
    }, [e, t]),
    U(),
    (0, T.jsx)(H, {})
  );
}
function K(e) {
  (c(),
    (W = (0, g.createRoot)(e)),
    W.render((0, T.jsx)(h.StrictMode, { children: (0, T.jsx)(G, {}) })));
}
function q() {
  W &&= (W.unmount(), null);
}
window.__SC_RECEBER_DIRECT_BRIDGE__ = { mount: K, unmount: q };
