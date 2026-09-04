import React, { useEffect, useState } from "react";
import { useCountUp, useBarWidth } from "../hooks/useAnimations.js";
import { fetchMetrics } from "../data/api.js";

/* ── Shared inline styles ────────────────────────────────────────────────── */
const panel = {
  background: "var(--color-panel)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  boxShadow: "var(--shadow-panel)",
  backdropFilter: "blur(20px)",
};

/* ── Formatters ──────────────────────────────────────────────────────────── */
function fmt(n) { return Math.round(n).toLocaleString("en-IN"); }

/* ── Count-up hero ───────────────────────────────────────────────────────── */
function HeroNumber({ value }) {
  const n = useCountUp(value, 2000);
  return (
    <div className="flex items-baseline mt-2 leading-none" style={{ fontFamily: "var(--font-serif)" }}>
      <span className="text-3xl font-normal" style={{ color: "var(--color-muted)", alignSelf: "flex-start", marginTop: "4px" }}>₹</span>
      <span className="text-5xl font-black tracking-tight ml-0.5" style={{ color: "var(--color-text)" }}>
        {fmt(n)}
      </span>
    </div>
  );
}

/* ── Count-up integer ────────────────────────────────────────────────────── */
function AnimInt({ value, className }) {
  const n = useCountUp(value, 1400);
  return <span className={className}>{n}</span>;
}

/* ── Count-up percentage ─────────────────────────────────────────────────── */
function AnimPct({ value, color }) {
  const n = useCountUp(Math.round(value * 10), 1400);
  return (
    <div className="text-4xl font-bold tracking-tight mt-2 leading-none" style={{ fontFamily: "var(--font-serif)", color }}>
      {(n / 10).toFixed(1)}%
    </div>
  );
}

/* ── Animated bar ────────────────────────────────────────────────────────── */
function Bar({ pct, color, delay = 300 }) {
  const w = useBarWidth(Math.min(pct, 100), delay, 1600);
  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${w}%`, background: color }}
      />
    </div>
  );
}

/* ── Config ──────────────────────────────────────────────────────────────── */
const ACTIONS = {
  retry:             { label: "Retry",         color: "var(--color-green)"  },
  send_reminder:     { label: "Send Reminder", color: "var(--color-accent)" },
  escalate_to_human: { label: "Escalate",      color: "var(--color-amber)"  },
  stop_pursuing:     { label: "Stop Pursuing", color: "var(--color-red)"    },
};

const RULES = [
  { name: "MAX_RETRIES",          desc: "retry_count >= max_retries → escalate to human" },
  { name: "HIGH_VALUE_PAYMENT",   desc: "amount > $1,000 → escalate to human" },
  { name: "INSUFFICIENT_HISTORY", desc: "history_depth = 0 → downgrade retry to reminder" },
];

/* ── Skeleton block ──────────────────────────────────────────────────────── */
function Skel({ className }) {
  return (
    <div
      className={`rounded-md animate-pulse-custom ${className}`}
      style={{ background: "rgba(255,255,255,0.06)" }}
    />
  );
}

/* ── Panel wrapper ───────────────────────────────────────────────────────── */
function Panel({ children, className = "", style = {} }) {
  return (
    <div className={`p-6 ${className}`} style={{ ...panel, ...style }}>
      {children}
    </div>
  );
}

/* ── Stat label ──────────────────────────────────────────────────────────── */
function StatLabel({ children }) {
  return (
    <div className="text-sm font-medium" style={{ color: "var(--color-muted)" }}>
      {children}
    </div>
  );
}

/* ── Confusion matrix strip ──────────────────────────────────────────────── */
function CMStrip({ classification }) {
  const cells = [
    { label: "True Pos.",  value: classification.true_positive,  color: "var(--color-green)"  },
    { label: "True Neg.",  value: classification.true_negative,   color: "var(--color-accent)" },
    { label: "False Pos.", value: classification.false_positive,  color: "var(--color-amber)"  },
    { label: "False Neg.", value: classification.false_negative,  color: "var(--color-red)"    },
  ];
  return (
    <div
      className="grid grid-cols-4 mt-5 pt-4"
      style={{ borderTop: "1px solid var(--color-border-light)" }}
    >
      {cells.map((c, i) => (
        <div
          key={c.label}
          className="flex flex-col gap-1"
          style={{
            padding: "0 1rem",
            paddingLeft: i === 0 ? 0 : undefined,
            borderRight: i < 3 ? "1px solid var(--color-border-light)" : "none",
          }}
        >
          <div
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: c.color }}
          >
            {c.label}
          </div>
          <div
            className="text-2xl font-bold leading-none"
            style={{ fontFamily: "var(--font-serif)", color: c.color }}
          >
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Override panel ──────────────────────────────────────────────────────── */
function OverridePanel({ count }) {
  const n = useCountUp(count, 1200);
  return (
    <Panel style={{ ...panel, borderColor: "rgba(240,169,82,0.25)", background: "rgba(240,169,82,0.04)" }}>
      <StatLabel>Rule Overrides — guardrails intercepted the LLM</StatLabel>
      <div
        className="text-5xl font-black mt-2 leading-none"
        style={{ fontFamily: "var(--font-serif)", color: "var(--color-amber)" }}
      >
        {n}
      </div>
      <p className="text-sm mt-4 mb-5 leading-relaxed" style={{ color: "var(--color-muted)" }}>
        Each time this increments, <strong className="font-semibold" style={{ color: "var(--color-text)" }}>rules.py</strong> changed
        or blocked the model's proposed action before it reached a customer.
        This is active protection, not a safety net that's never triggered.
      </p>
      <div
        className="flex flex-col gap-3 pt-4"
        style={{ borderTop: "1px solid var(--color-border-light)" }}
      >
        {RULES.map((r) => (
          <div key={r.name} className="flex items-baseline gap-3">
            <code
              className="text-xs font-semibold px-2 py-0.5 rounded flex-shrink-0"
              style={{
                color: "var(--color-amber)",
                background: "rgba(240,169,82,0.1)",
                border: "1px solid rgba(240,169,82,0.2)",
              }}
            >
              {r.name}
            </code>
            <span className="text-sm" style={{ color: "var(--color-muted)" }}>{r.desc}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ── Action breakdown ────────────────────────────────────────────────────── */
function ActionBreakdown({ breakdown, total }) {
  return (
    <Panel>
      <StatLabel>Action Breakdown</StatLabel>
      <div className="flex flex-col gap-4 mt-5">
        {Object.entries(breakdown).map(([action, count]) => {
          const cfg = ACTIONS[action] ?? { label: action, color: "var(--color-muted)" };
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={action} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium" style={{ color: cfg.color }}>
                  {cfg.label}
                </span>
                <span>
                  <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{count}</span>
                  <span className="text-xs ml-1" style={{ color: "var(--color-muted)" }}>({pct}%)</span>
                </span>
              </div>
              <Bar pct={pct} color={cfg.color} delay={500} />
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-sm" style={{ color: "var(--color-muted)" }}>
        {total} total decisions
      </div>
    </Panel>
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
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-4 gap-5">
          {[1,2,3,4].map((i) => (
            <Panel key={i} className="flex flex-col gap-3">
              <Skel className="h-3 w-1/3" />
              <Skel className="h-12 w-2/3" />
              <Skel className="h-3 w-1/2" />
            </Panel>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-5">
          {[1,2].map((i) => (
            <Panel key={i} className="flex flex-col gap-4">
              <Skel className="h-3 w-1/3" />
              <Skel className="h-32 w-full" />
            </Panel>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Panel>
        <p className="text-sm" style={{ color: "var(--color-red)" }}>Failed to load metrics: {error}</p>
      </Panel>
    );
  }

  const {
    total_events,
    audited_events,
    revenue_recovered,
    false_positive_rate,
    action_breakdown,
    rule_override_count,
    classification,
  } = data;

  const fpPct   = false_positive_rate * 100;
  const fpCount = classification.false_positive;
  const fpCost  = classification.false_positive_cost ?? 0;
  const totalAB = Object.values(action_breakdown).reduce((s, v) => s + v, 0);
  const fpColor = fpPct < 5 ? "var(--color-green)" : "var(--color-amber)";

  return (
    <div className="flex flex-col gap-5">

      {/* ── Row 1 ───────────────────────────────────────────────── */}
      <div className="grid gap-5" style={{ gridTemplateColumns: "2.4fr 0.8fr 0.8fr 1.1fr" }}>

        {/* Hero */}
        <Panel className="flex flex-col">
          <StatLabel>Estimated Revenue Recovered</StatLabel>
          <HeroNumber value={revenue_recovered} />
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            <span
              className="text-xs font-medium px-3 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.07)", color: "var(--color-muted)" }}
            >
              {total_events} events processed
            </span>
            <span className="text-sm" style={{ color: "var(--color-muted)" }}>
              Precision {(classification.precision * 100).toFixed(1)}% &nbsp;·&nbsp;
              Recall {(classification.recall * 100).toFixed(1)}% &nbsp;·&nbsp;
              F1 {(classification.f1_score * 100).toFixed(1)}%
            </span>
          </div>
          <CMStrip classification={classification} />
        </Panel>

        {/* Total events */}
        <Panel className="flex flex-col">
          <StatLabel>Total Events</StatLabel>
          <AnimInt
            value={total_events}
            className="text-5xl font-bold mt-2 leading-none tracking-tight"
          />
          <p className="text-sm mt-auto pt-4 leading-relaxed" style={{ color: "var(--color-muted)" }}>
            In synthetic batch
          </p>
        </Panel>

        {/* Audited events */}
        <Panel className="flex flex-col">
          <StatLabel>Audited Events</StatLabel>
          <AnimInt
            value={audited_events}
            className="text-5xl font-bold mt-2 leading-none tracking-tight"
          />
          <p className="text-sm mt-auto pt-4 leading-relaxed" style={{ color: "var(--color-muted)" }}>
            Saved to audit log
          </p>
        </Panel>

        {/* FP rate */}
        <Panel className="flex flex-col">
          <StatLabel>False-Positive Rate</StatLabel>
          <AnimPct value={fpPct} color={fpColor} />
          <div className="mt-auto pt-4 flex flex-col gap-2">
            <Bar pct={fpPct} color={fpColor} delay={400} />
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
              {fpCount} customer{fpCount !== 1 ? "s" : ""} escalated who would have self-resolved
              {fpCost > 0 && (
                <> — <span style={{ color: "var(--color-amber)" }}>₹{fmt(fpCost)} cost exposure</span></>
              )}
            </p>
            <span
              className="text-xs font-semibold px-3 py-1 rounded-full self-start"
              style={fpPct < 5
                ? { background: "rgba(62,207,142,0.12)", color: "var(--color-green)" }
                : { background: "rgba(240,169,82,0.12)", color: "var(--color-amber)" }
              }
            >
              {fpPct < 5 ? "On target — below 5%" : "Above 5% target"}
            </span>
          </div>
        </Panel>

      </div>

      {/* ── Row 2 ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-5" style={{ gridTemplateColumns: "1fr 1.6fr" }}>
        <ActionBreakdown breakdown={action_breakdown} total={totalAB} />
        <OverridePanel count={rule_override_count} />
      </div>

    </div>
  );
}
