import React, { useEffect, useState } from "react";
import { useCountUp, useBarWidth } from "../hooks/useAnimations.js";
import { fetchMetrics } from "../data/api.js";

/* ── Formatters ──────────────────────────────────────────────────────────── */
function fmt$(n) { return Math.round(n).toLocaleString("en-US"); }

/* ── Animated hero ───────────────────────────────────────────────────────── */
function HeroNumber({ value }) {
  const n = useCountUp(value, 2000);
  return (
    <div className="hero-value">
      <span className="hero-currency">$</span>
      {fmt$(n)}
    </div>
  );
}

/* ── Animated integer ────────────────────────────────────────────────────── */
function AnimInt({ value, className, duration = 1400 }) {
  const n = useCountUp(value, duration);
  return <span className={className}>{n}</span>;
}

/* ── Animated percent (in % units, e.g. 4.2) ─────────────────────────────── */
function AnimPct({ value, className, duration = 1400 }) {
  const n = useCountUp(Math.round(value * 10), duration);
  return <span className={className}>{(n / 10).toFixed(1)}%</span>;
}

/* ── Animated bar ────────────────────────────────────────────────────────── */
function Bar({ pct, color, delay = 300 }) {
  const w = useBarWidth(Math.min(pct, 100), delay, 1600);
  return (
    <div className="bar-track">
      <div className="bar-fill" style={{ width: `${w}%`, background: color }} />
    </div>
  );
}

/* ── Config ──────────────────────────────────────────────────────────────── */
const ACTIONS = {
  retry:             { label: "Retry",          color: "var(--green)"  },
  send_reminder:     { label: "Send Reminder",  color: "var(--accent)" },
  escalate_to_human: { label: "Escalate",       color: "var(--amber)"  },
  stop_pursuing:     { label: "Stop Pursuing",  color: "var(--red)"    },
};

const RULES = [
  { name: "MAX_RETRIES",          desc: "retry_count >= max_retries → escalate to human" },
  { name: "HIGH_VALUE_PAYMENT",   desc: "amount > $1,000 → escalate to human" },
  { name: "INSUFFICIENT_HISTORY", desc: "history_depth = 0 → downgrade retry to reminder" },
];

/* ── Skeleton ────────────────────────────────────────────────────────────── */
function Skel({ h, w, style }) {
  return <div className="skel" style={{ height: h, width: w, ...style }} />;
}

/* ── Override panel ──────────────────────────────────────────────────────── */
function OverridePanel({ count }) {
  const n = useCountUp(count, 1200);
  return (
    <div className="panel override-panel">
      <div className="stat-label">Rule Overrides — guardrails intercepted the LLM</div>
      <div className="override-count">{n}</div>
      <p className="override-note">
        Each time this number increments, <strong>rules.py</strong> changed or blocked the
        model's proposed action before it reached a customer. This is active protection,
        not a safety net that's never triggered.
      </p>
      <div className="rule-list">
        {RULES.map((r) => (
          <div className="rule-row" key={r.name}>
            <span className="rule-name">{r.name}</span>
            <span className="rule-desc">{r.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Action breakdown ────────────────────────────────────────────────────── */
function ActionBreakdown({ breakdown, total }) {
  return (
    <div className="panel">
      <div className="stat-label" style={{ marginBottom: "1.25rem" }}>Action Breakdown</div>
      <div className="breakdown-list">
        {Object.entries(breakdown).map(([action, count]) => {
          const cfg = ACTIONS[action] ?? { label: action, color: "var(--text-muted)" };
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div className="breakdown-row" key={action}>
              <div className="breakdown-row-head">
                <span style={{ color: cfg.color, fontWeight: 500, fontSize: "0.84rem" }}>
                  {cfg.label}
                </span>
                <span>
                  <span className="breakdown-count">{count}</span>
                  <span className="breakdown-pct">({pct}%)</span>
                </span>
              </div>
              <Bar pct={pct} color={cfg.color} delay={500} />
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: "1rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
        {total} total decisions
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────────────── */
export default function MetricsPanel() {
  const [data, setData]   = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMetrics().then(setData).catch((e) => setError(e.message));
  }, []);

  if (!data && !error) {
    return (
      <div>
        <div className="metrics-top">
          {[1,2,3].map((i) => (
            <div className="panel" key={i} style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
              <Skel h="0.8rem" w="40%" />
              <Skel h="3rem" w="65%" />
              <Skel h="0.8rem" w="55%" />
            </div>
          ))}
        </div>
        <div className="metrics-bottom" style={{ marginTop: "1.25rem" }}>
          {[1,2].map((i) => (
            <div className="panel" key={i} style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
              <Skel h="0.8rem" w="40%" />
              <Skel h="8rem" w="100%" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel" style={{ color: "var(--red)" }}>
        Failed to load metrics: {error}
      </div>
    );
  }

  const {
    total_events,
    revenue_recovered,
    false_positive_rate,
    action_breakdown,
    rule_override_count,
    classification,
  } = data;

  const fpPct   = (false_positive_rate * 100);
  const fpCount = classification.false_positive;
  const fpCost  = classification.false_positive_cost ?? 0;
  const totalAB = Object.values(action_breakdown).reduce((s, v) => s + v, 0);

  return (
    <div>
      {/* ── Row 1 ──────────────────────────────────────────── */}
      <div className="metrics-top">

        {/* Hero: Revenue Recovered */}
        <div className="panel hero-panel">
          <div className="hero-label">Estimated Revenue Recovered</div>
          <HeroNumber value={revenue_recovered} />

          <div className="hero-sub">
            <span className="tag tag-muted">{total_events} events processed</span>
            <span style={{ color: "var(--text-muted)" }}>
              Precision {(classification.precision * 100).toFixed(1)}% &nbsp;·&nbsp;
              Recall {(classification.recall * 100).toFixed(1)}% &nbsp;·&nbsp;
              F1 {(classification.f1_score * 100).toFixed(1)}%
            </span>
          </div>

          {/* Confusion matrix */}
          <div className="cm-strip">
            {[
              { label: "True Pos.",  value: classification.true_positive,  color: "var(--green)"  },
              { label: "True Neg.",  value: classification.true_negative,   color: "var(--accent)" },
              { label: "False Pos.", value: classification.false_positive,  color: "var(--amber)"  },
              { label: "False Neg.", value: classification.false_negative,  color: "var(--red)"    },
            ].map((c) => (
              <div className="cm-cell" key={c.label}>
                <div className="cm-label" style={{ color: c.color }}>{c.label}</div>
                <div className="cm-value" style={{ color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Total Events */}
        <div className="panel stat-panel">
          <div className="stat-label">Total Events</div>
          <AnimInt value={total_events} className="stat-value" />
          <div className="stat-body">
            <div className="stat-note">
              Full synthetic batch — payment failures across customers
            </div>
          </div>
        </div>

        {/* False-Positive Rate */}
        <div className="panel stat-panel">
          <div className="stat-label">False-Positive Rate</div>
          <AnimPct value={fpPct} className="stat-value" style={{ color: fpPct < 5 ? "var(--green)" : "var(--amber)" }} />
          <div className="stat-body">
            <Bar pct={fpPct} color={fpPct < 5 ? "var(--green)" : "var(--amber)"} delay={400} />
            <div className="stat-note" style={{ marginTop: "0.6rem" }}>
              {fpCount} customer{fpCount !== 1 ? "s" : ""} escalated who would have self-resolved
              {fpCost > 0 && (
                <> — <span style={{ color: "var(--amber)" }}>${fmt$(fpCost)} cost exposure</span></>
              )}
            </div>
            <div style={{ marginTop: "0.5rem" }}>
              {fpPct < 5
                ? <span className="tag tag-green">On target — below 5%</span>
                : <span className="tag tag-amber">Above 5% target</span>
              }
            </div>
          </div>
        </div>

      </div>

      {/* ── Row 2 ──────────────────────────────────────────── */}
      <div className="metrics-bottom">
        <ActionBreakdown breakdown={action_breakdown} total={totalAB} />
        <OverridePanel count={rule_override_count} />
      </div>
    </div>
  );
}
