import React, { useEffect, useState, useCallback } from "react";
import { fetchAuditLog } from "../data/api.js";

/* ── Config ──────────────────────────────────────────────────────────────── */
const ACTION = {
  retry:             { label: "Retry",         bg: "rgba(62,207,142,0.12)",  color: "var(--color-green)"  },
  send_reminder:     { label: "Send Reminder", bg: "rgba(79,142,247,0.12)",  color: "var(--color-accent)" },
  escalate_to_human: { label: "Escalate",      bg: "rgba(240,169,82,0.12)",  color: "var(--color-amber)"  },
  stop_pursuing:     { label: "Stop Pursuing", bg: "rgba(224,96,96,0.12)",   color: "var(--color-red)"    },
};

const FILTERS = [
  { key: "all",               label: "All" },
  { key: "retry",             label: "Retry" },
  { key: "send_reminder",     label: "Send Reminder" },
  { key: "escalate_to_human", label: "Escalate" },
  { key: "stop_pursuing",     label: "Stop Pursuing" },
  { key: "overridden",        label: "Rule Overridden" },
  { key: "human_review",      label: "Human Review" },
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmtAmt(n, currency = "USD") {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

function fmtTs(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d)) return ts;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

function confColor(v) {
  if (v >= 0.85) return "var(--color-green)";
  if (v >= 0.60) return "var(--color-amber)";
  return "var(--color-red)";
}

function matches(row, f) {
  if (f === "all")          return true;
  if (f === "overridden")   return !!row.rule_override;
  if (f === "human_review") return !!row.human_review_required;
  return row.final_action === f;
}

/* ── Sub-components ──────────────────────────────────────────────────────── */
function Badge({ action, small }) {
  const cfg = ACTION[action] ?? { label: action, bg: "rgba(255,255,255,0.06)", color: "var(--color-muted)" };
  return (
    <span
      className="inline-flex items-center gap-1.5 font-semibold rounded-full whitespace-nowrap"
      style={{
        background: cfg.bg,
        color: cfg.color,
        fontSize: small ? "0.68rem" : "0.74rem",
        padding: small ? "2px 8px" : "3px 11px",
      }}
    >
      <span
        className="rounded-full flex-shrink-0"
        style={{ width: 6, height: 6, background: cfg.color }}
      />
      {cfg.label}
    </span>
  );
}

function ConfBar({ value }) {
  if (value == null) return <span style={{ color: "var(--color-muted)" }}>—</span>;
  const pct   = Math.round(value * 100);
  const color = confColor(value);
  return (
    <div className="flex flex-col gap-1" style={{ minWidth: "90px" }}>
      <span className="text-sm font-semibold" style={{ fontVariantNumeric: "tabular-nums", color }}>
        {pct}%
      </span>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ── Key column: Final vs LLM ────────────────────────────────────────────── */
function ActionDelta({ llmAction, finalAction }) {
  if (llmAction === finalAction) {
    return <td className="px-4 py-3"><Badge action={finalAction} /></td>;
  }
  return (
    <td className="px-4 py-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Badge action={finalAction} />
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded"
            style={{
              color: "var(--color-amber)",
              background: "rgba(240,169,82,0.1)",
              border: "1px solid rgba(240,169,82,0.2)",
            }}
          >
            Rule gated
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-muted)" }}>
          LLM wanted: <Badge action={llmAction} small />
        </div>
      </div>
    </td>
  );
}

/* ── Expanded detail row ─────────────────────────────────────────────────── */
function DetailRow({ row, colSpan }) {
  const ev       = row.event ?? {};
  const llm      = row.llm_proposal ?? {};
  const override = row.rule_override;
  const tools    = row.tool_calls ?? [];

  const colStyle = {
    padding: "0 1.5rem",
    borderRight: "1px solid var(--color-border-light)",
  };

  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: 0 }}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(4, 1fr)",
            borderTop: "2px solid var(--color-accent-dim)",
            background: "rgba(10,14,22,0.55)",
            borderBottom: "1px solid var(--color-border)",
            padding: "1.25rem 1.5rem",
            gap: 0,
          }}
        >
          {/* LLM reasoning */}
          <div style={colStyle}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-faint)" }}>
              LLM Reasoning
            </div>
            <div className="text-sm leading-relaxed italic" style={{ color: "var(--color-muted)", whiteSpace: "normal", wordBreak: "break-word" }}>
              {llm.reasoning ?? "No reasoning recorded."}
            </div>
          </div>

          {/* Rule override */}
          <div style={colStyle}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-faint)" }}>
              {override ? "Rule Override Applied" : "Rule Override"}
            </div>
            {override ? (
              <div className="text-sm leading-relaxed" style={{ whiteSpace: "normal" }}>
                <div className="font-bold mb-1" style={{ color: "var(--color-amber)" }}>{override.rule}</div>
                <div className="mb-2" style={{ color: "var(--color-muted)" }}>{override.reason}</div>
                <div className="flex items-center gap-1 flex-wrap" style={{ color: "var(--color-muted)", fontSize: "0.78rem" }}>
                  LLM proposed <Badge action={llm.action} small /> — changed to <Badge action={row.final_action} small />
                </div>
              </div>
            ) : (
              <div className="text-sm" style={{ color: "var(--color-muted)" }}>
                None — LLM proposal accepted as-is
              </div>
            )}
          </div>

          {/* Payment context */}
          <div style={colStyle}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-faint)" }}>
              Payment Context
            </div>
            <div className="flex flex-col gap-1">
              {[
                ["Payment ID",    ev.payment_id],
                ["Retries",       `${ev.retry_count ?? 0} / ${ev.max_retries ?? "—"}`],
                ["History depth", ev.customer_history_depth],
                ["Currency",      ev.currency],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 text-sm">
                  <span style={{ color: "var(--color-muted)" }}>{k}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--color-text)" }}>{v ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tool calls */}
          <div style={{ padding: "0 0 0 1.5rem" }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-faint)" }}>
              Tool Calls ({tools.length})
            </div>
            <div className="flex flex-col gap-1">
              {tools.length === 0
                ? <span className="text-sm" style={{ color: "var(--color-muted)" }}>No tools called</span>
                : tools.map((t, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded self-start"
                    style={{ color: "var(--color-accent)", background: "var(--color-accent-dim)" }}
                  >
                    {t.tool_name}
                  </span>
                ))
              }
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */
function SkeletonRow({ cols }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="rounded animate-pulse-custom"
            style={{
              height: "0.75rem",
              width: i === 4 ? "130px" : "70px",
              background: "rgba(255,255,255,0.06)",
              animationDelay: `${i * 0.06}s`,
            }}
          />
        </td>
      ))}
    </tr>
  );
}

/* ── Table header cell ───────────────────────────────────────────────────── */
function TH({ children, highlight, style }) {
  return (
    <th
      className="px-4 py-3 text-left text-xs font-semibold tracking-widest uppercase whitespace-nowrap"
      style={{
        color: highlight ? "var(--color-text)" : "var(--color-muted)",
        borderBottom: "1px solid var(--color-border)",
        position: "sticky",
        top: 0,
        background: "rgba(13,17,23,0.92)",
        backdropFilter: "blur(20px)",
        zIndex: 2,
        userSelect: "none",
        ...style,
      }}
    >
      {children}
    </th>
  );
}

/* ── Main ────────────────────────────────────────────────────────────────── */
const COLS = 9;

export default function AuditLogTable() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [filter, setFilter]     = useState("all");
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    fetchAuditLog()
      .then((d) => { setRows(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  const toggle = useCallback((id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const filtered    = rows.filter((r) => matches(r, filter));
  const overriddenN = rows.filter((r) => r.rule_override).length;

  return (
    <div className="flex flex-col gap-4">

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="text-sm font-medium px-4 py-1.5 rounded-full border transition-all duration-150"
              style={{
                background:   filter === f.key ? "var(--color-accent-dim)"  : "var(--color-panel)",
                color:        filter === f.key ? "var(--color-accent)"       : "var(--color-muted)",
                borderColor:  filter === f.key ? "rgba(79,142,247,0.3)"      : "var(--color-border)",
              }}
            >
              {f.label}
              {f.key === "overridden" && !loading && ` (${overriddenN})`}
            </button>
          ))}
        </div>
        {!loading && !error && (
          <span className="text-sm" style={{ color: "var(--color-muted)" }}>
            {filtered.length} entries
          </span>
        )}
      </div>

      {/* Table */}
      <div
        className="overflow-hidden"
        style={{
          background: "var(--color-panel)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-panel)",
          backdropFilter: "blur(20px)",
        }}
      >
        {error ? (
          <div className="p-8 text-sm" style={{ color: "var(--color-red)" }}>
            Failed to load audit log: {error}
          </div>
        ) : (
          <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: "70vh" }}>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <TH style={{ width: "2.5rem" }} />
                  <TH>Event ID</TH>
                  <TH>Event Type</TH>
                  <TH>Customer</TH>
                  <TH highlight>Final Action vs LLM Proposal</TH>
                  <TH>Amount</TH>
                  <TH>Failure Reason</TH>
                  <TH>LLM Confidence</TH>
                  <TH>Human Review</TH>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={COLS} />)
                  : filtered.map((row) => {
                    const isOpen = expanded.has(row.id);
                    const ev     = row.event ?? {};
                    const llm    = row.llm_proposal ?? {};

                    return (
                      <React.Fragment key={row.id}>
                        <tr
                          style={{
                            borderBottom: isOpen ? "none" : "1px solid var(--color-border-light)",
                            background:   isOpen ? "rgba(79,142,247,0.04)" : "transparent",
                            transition:   "background 0.12s",
                          }}
                          onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.background = "var(--color-panel-hover)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = isOpen ? "rgba(79,142,247,0.04)" : "transparent"; }}
                        >
                          {/* Expand */}
                          <td className="pl-4 py-3">
                            <button
                              onClick={() => toggle(row.id)}
                              title={isOpen ? "Collapse" : "View reasoning"}
                              className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-all duration-150"
                              style={{
                                border:      "1px solid var(--color-border)",
                                background:  isOpen ? "var(--color-accent-dim)" : "none",
                                color:       isOpen ? "var(--color-accent)"     : "var(--color-muted)",
                              }}
                            >
                              {isOpen ? "−" : "+"}
                            </button>
                          </td>

                          {/* Event ID */}
                          <td
                            className="px-4 py-3 text-xs"
                            style={{ fontFamily: "var(--font-mono)", color: "var(--color-accent)" }}
                          >
                            {ev.event_id ?? "—"}
                          </td>

                          {/* Event type */}
                          <td className="px-4 py-3 text-sm" style={{ color: "var(--color-muted)" }}>
                            {ev.event_type === "payment_failed" ? "Payment Failure" : (ev.event_type ?? "—")}
                          </td>

                          {/* Customer */}
                          <td
                            className="px-4 py-3 text-sm"
                            style={{ fontFamily: "var(--font-mono)", color: "var(--color-muted)" }}
                          >
                            {ev.customer_id ?? "—"}
                          </td>

                          {/* Key column */}
                          <ActionDelta llmAction={llm.action} finalAction={row.final_action} />

                          {/* Amount */}
                          <td className="px-4 py-3">
                            <span
                              className="text-base font-bold"
                              style={{ fontFamily: "var(--font-serif)" }}
                            >
                              {fmtAmt(ev.amount, ev.currency)}
                            </span>
                          </td>

                          {/* Failure reason */}
                          <td className="px-4 py-3">
                            <span
                              className="text-sm px-2.5 py-1 rounded overflow-hidden whitespace-nowrap"
                              style={{
                                display: "inline-block",
                                maxWidth: "200px",
                                textOverflow: "ellipsis",
                                color: "var(--color-muted)",
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid var(--color-border-light)",
                              }}
                              title={ev.failure_reason}
                            >
                              {ev.failure_reason ?? "—"}
                            </span>
                          </td>

                          {/* Confidence */}
                          <td className="px-4 py-3">
                            <ConfBar value={llm.confidence} />
                          </td>

                          {/* Human review */}
                          <td className="px-4 py-3">
                            {row.human_review_required ? (
                              <span
                                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                style={{ background: "rgba(240,169,82,0.12)", color: "var(--color-amber)" }}
                              >
                                Required
                              </span>
                            ) : (
                              <span className="text-sm" style={{ color: "var(--color-faint)" }}>No</span>
                            )}
                          </td>
                        </tr>

                        {isOpen && <DetailRow row={row} colSpan={COLS} />}
                      </React.Fragment>
                    );
                  })
                }

                {!loading && !error && filtered.length === 0 && (
                  <tr>
                    <td colSpan={COLS} className="px-4 py-10 text-center text-sm" style={{ color: "var(--color-muted)" }}>
                      No entries match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
