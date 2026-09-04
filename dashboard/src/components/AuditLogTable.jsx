import React, { useEffect, useState, useCallback } from "react";
import { fetchAuditLog } from "../data/api.js";

/* ── Config ──────────────────────────────────────────────────────────────── */
const ACTION = {
  retry:             { label: "Retry",         cls: "retry",    dotCls: "badge-dot-retry"    },
  send_reminder:     { label: "Send Reminder", cls: "reminder", dotCls: "badge-dot-reminder" },
  escalate_to_human: { label: "Escalate",      cls: "escalate", dotCls: "badge-dot-escalate" },
  stop_pursuing:     { label: "Stop Pursuing", cls: "stop",     dotCls: "badge-dot-stop"     },
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
function fmtAmt(amount, currency = "USD") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(amount);
}

function fmtTs(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d)) return ts;
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function confColor(v) {
  if (v >= 0.85) return "var(--green)";
  if (v >= 0.60) return "var(--amber)";
  return "var(--red)";
}

function matchesFilter(row, f) {
  if (f === "all")          return true;
  if (f === "overridden")   return !!row.rule_override;
  if (f === "human_review") return !!row.human_review_required;
  return row.final_action === f;
}

/* ── Action badge ────────────────────────────────────────────────────────── */
function Badge({ action, small }) {
  const cfg = ACTION[action] ?? { label: action, cls: "stop", dotCls: "badge-dot-stop" };
  return (
    <span
      className={`badge badge-${cfg.cls}`}
      style={small ? { fontSize: "0.68rem", padding: "2px 8px" } : {}}
    >
      <span className={`badge-dot ${cfg.dotCls}`} />
      {cfg.label}
    </span>
  );
}

/* ── Confidence bar ──────────────────────────────────────────────────────── */
function ConfBar({ value }) {
  if (value == null) return <span className="dim">—</span>;
  const pct   = Math.round(value * 100);
  const color = confColor(value);
  return (
    <div className="conf-bar">
      <span className="conf-pct" style={{ color }}>{pct}%</span>
      <div className="bar-track" style={{ width: "100%" }}>
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ── The key column: Final action vs LLM proposal ────────────────────────── */
function ActionDelta({ llmAction, finalAction }) {
  if (llmAction === finalAction) {
    return (
      <td>
        <Badge action={finalAction} />
      </td>
    );
  }
  return (
    <td>
      <div className="action-cell">
        <div className="action-cell-row">
          <Badge action={finalAction} />
          <span className="gated-label">Rule gated</span>
        </div>
        <div className="llm-proposed">
          LLM wanted: <Badge action={llmAction} small />
        </div>
      </div>
    </td>
  );
}

/* ── Expanded detail ─────────────────────────────────────────────────────── */
function DetailRow({ row, colSpan }) {
  const ev       = row.event ?? {};
  const llm      = row.llm_proposal ?? {};
  const override = row.rule_override;
  const tools    = row.tool_calls ?? [];

  return (
    <tr className="detail-row">
      <td colSpan={colSpan}>
        <div className="detail-inner">

          {/* LLM reasoning */}
          <div className="detail-col">
            <div className="detail-col-label">LLM Reasoning</div>
            <div className="detail-col-value italic">
              {llm.reasoning ?? "No reasoning recorded."}
            </div>
          </div>

          {/* Rule override */}
          <div className="detail-col">
            <div className="detail-col-label">
              {override ? "Rule Override Applied" : "Rule Override"}
            </div>
            {override ? (
              <div className="detail-col-value">
                <div className="override-applied">{override.rule}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.4rem" }}>
                  {override.reason}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  LLM proposed <Badge action={llm.action} small /> — rules changed to <Badge action={row.final_action} small />
                </div>
              </div>
            ) : (
              <div className="detail-col-value" style={{ color: "var(--text-muted)" }}>
                None — LLM proposal accepted as-is
              </div>
            )}
          </div>

          {/* Payment context */}
          <div className="detail-col">
            <div className="detail-col-label">Payment Context</div>
            <div className="detail-col-value">
              {[
                ["Payment ID",   ev.payment_id],
                ["Retries",      `${ev.retry_count ?? 0} / ${ev.max_retries ?? "—"}`],
                ["History depth", ev.customer_history_depth],
                ["Currency",     ev.currency],
              ].map(([k, v]) => (
                <div className="detail-kv" key={k}>
                  <span className="detail-kv-key">{k}</span>
                  <span className="detail-kv-val">{v ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tools */}
          <div className="detail-col">
            <div className="detail-col-label">Tool Calls ({tools.length})</div>
            <div className="detail-col-value">
              {tools.length === 0
                ? <span style={{ color: "var(--text-muted)" }}>No tools called</span>
                : tools.map((t, i) => (
                  <div key={i} style={{ marginBottom: "0.2rem" }}>
                    <span className="tool-chip">{t.tool_name}</span>
                  </div>
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
        <td key={i} style={{ padding: "0.85rem 1.1rem" }}>
          <div
            className="skel"
            style={{
              height: "0.75rem",
              width: i === 4 ? "130px" : "72px",
              animationDelay: `${i * 0.06}s`,
            }}
          />
        </td>
      ))}
    </tr>
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

  const filtered     = rows.filter((r) => matchesFilter(r, filter));
  const overriddenN  = rows.filter((r) => r.rule_override).length;

  return (
    <div>
      {/* Toolbar */}
      <div className="audit-toolbar">
        <div className="filter-group">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`filter-btn${filter === f.key ? " active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              {f.key === "overridden" && !loading && ` (${overriddenN})`}
            </button>
          ))}
        </div>
        {!loading && !error && (
          <span className="entry-count">{filtered.length} entries</span>
        )}
      </div>

      {/* Table */}
      <div className="table-panel">
        {error ? (
          <div style={{ padding: "2rem", color: "var(--red)", fontSize: "0.9rem" }}>
            Failed to load audit log: {error}
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "2rem" }} />
                  <th>Event ID</th>
                  <th>Event Type</th>
                  <th>Customer</th>
                  <th className="key-col">Final Action vs LLM Proposal</th>
                  <th>Amount</th>
                  <th>Failure Reason</th>
                  <th>LLM Confidence</th>
                  <th>Human Review</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonRow key={i} cols={COLS} />
                  ))
                  : filtered.map((row) => {
                    const isOpen = expanded.has(row.id);
                    const ev     = row.event ?? {};
                    const llm    = row.llm_proposal ?? {};

                    return (
                      <React.Fragment key={row.id}>
                        <tr className={isOpen ? "expanded" : ""}>

                          {/* Expand toggle */}
                          <td style={{ padding: "0.85rem 0.5rem 0.85rem 1.1rem" }}>
                            <button
                              className="expand-btn"
                              onClick={() => toggle(row.id)}
                              title={isOpen ? "Collapse" : "Show reasoning and detail"}
                            >
                              {isOpen ? "−" : "+"}
                            </button>
                          </td>

                          {/* Event ID */}
                          <td className="code accent">{ev.event_id ?? "—"}</td>

                          {/* Event type */}
                          <td className="dim">
                            {ev.event_type === "payment_failed" ? "Payment Failure" : ev.event_type ?? "—"}
                          </td>

                          {/* Customer */}
                          <td className="dim code">{ev.customer_id ?? "—"}</td>

                          {/* THE KEY COLUMN */}
                          <ActionDelta
                            llmAction={llm.action}
                            finalAction={row.final_action}
                          />

                          {/* Amount */}
                          <td>
                            <span className="amount">{fmtAmt(ev.amount, ev.currency)}</span>
                          </td>

                          {/* Failure reason */}
                          <td>
                            <span className="reason-chip" title={ev.failure_reason}>
                              {ev.failure_reason ?? "—"}
                            </span>
                          </td>

                          {/* Confidence */}
                          <td><ConfBar value={llm.confidence} /></td>

                          {/* Human review */}
                          <td>
                            {row.human_review_required
                              ? <span className="review-pill required">Required</span>
                              : <span className="review-pill none">No</span>
                            }
                          </td>

                        </tr>

                        {isOpen && <DetailRow row={row} colSpan={COLS} />}
                      </React.Fragment>
                    );
                  })
                }

                {!loading && !error && filtered.length === 0 && (
                  <tr>
                    <td colSpan={COLS} style={{ textAlign:"center", padding:"2.5rem", color:"var(--text-muted)" }}>
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
