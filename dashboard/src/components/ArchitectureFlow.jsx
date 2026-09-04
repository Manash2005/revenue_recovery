import React from "react";

const STEPS = [
  { num: "01", label: "Payment Event",  detail: "payment_failed webhook ingested and stored in SQLite",                           color: "var(--color-accent)" },
  { num: "02", label: "Tool Calls",     detail: "get_customer_history · get_retry_attempts · get_payment_failure_info",           color: "#a78bfa"             },
  { num: "03", label: "LLM Proposes",   detail: "Returns action + reasoning + confidence score (0 – 1)",                          color: "var(--color-text)"   },
  { num: "04", label: "Rules Gate",     detail: "MAX_RETRIES · HIGH_VALUE · INSUFFICIENT_HISTORY",                                color: "var(--color-amber)"  },
  { num: "05", label: "Action Taken",   detail: "retry · send_reminder · escalate_to_human · stop_pursuing",                     color: "var(--color-green)"  },
  { num: "06", label: "Audit Logged",   detail: "Full record: proposal + override (if any) + final action",                       color: "var(--color-muted)"  },
];

const panel = {
  background: "var(--color-panel)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  boxShadow: "var(--shadow-panel)",
  backdropFilter: "blur(20px)",
  padding: "1.75rem",
};

export default function ArchitectureFlow() {
  return (
    <div>
      <div
        className="text-xs font-semibold uppercase tracking-widest mb-4"
        style={{ color: "var(--color-muted)" }}
      >
        Architecture Snapshot
      </div>

      {/* Step flow */}
      <div
        className="flex overflow-x-auto"
        style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-panel)" }}
      >
        {STEPS.map((step, i) => (
          <div
            key={step.num}
            className="flex flex-col items-center text-center flex-1"
            style={{
              minWidth: "120px",
              padding: "1.5rem 1rem",
              background: "var(--color-panel)",
              backdropFilter: "blur(16px)",
              borderRight: i < STEPS.length - 1 ? "1px solid var(--color-border-light)" : "none",
            }}
          >
            <div className="text-xs font-bold tracking-widest mb-1" style={{ color: step.color, opacity: 0.7 }}>
              {step.num}
            </div>
            <div className="text-sm font-semibold mb-1.5" style={{ color: step.color }}>
              {step.label}
            </div>
            <div className="text-xs leading-relaxed" style={{ color: "var(--color-muted)", maxWidth: "110px" }}>
              {step.detail}
            </div>
          </div>
        ))}
      </div>

      {/* Written explanation */}
      <div style={{ ...panel, marginTop: "1.25rem" }}>
        <div className="text-sm font-semibold mb-3" style={{ color: "var(--color-text)" }}>How it works</div>
        <div className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
          A payment failure event is loaded from the database. The agent calls up to three read-only
          tools to gather customer history, retry attempt counts, and failure details. It sends this
          context to the LLM, which returns a structured decision — one of{" "}
          <strong className="font-semibold" style={{ color: "var(--color-text)" }}>retry</strong>,{" "}
          <strong className="font-semibold" style={{ color: "var(--color-text)" }}>send_reminder</strong>,{" "}
          <strong className="font-semibold" style={{ color: "var(--color-text)" }}>escalate_to_human</strong>, or{" "}
          <strong className="font-semibold" style={{ color: "var(--color-text)" }}>stop_pursuing</strong>{" "}
          — with a confidence score and plain-language reasoning.
        </div>
        <div className="text-sm leading-relaxed mt-3" style={{ color: "var(--color-muted)" }}>
          Before any action reaches a customer,{" "}
          <strong className="font-semibold" style={{ color: "var(--color-text)" }}>rules.py</strong>{" "}
          evaluates three deterministic guardrails: if the retry limit is already exhausted, if the
          payment exceeds the automatic recovery threshold, or if the customer has no prior history.
          When a rule fires, the LLM's proposal is overridden and the substituted action is recorded
          alongside the original proposal in the audit log — so every outcome is fully explainable.
        </div>
      </div>
    </div>
  );
}
