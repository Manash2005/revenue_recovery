import React from "react";

const STEPS = [
  {
    num:    "01",
    label:  "Payment Event",
    detail: "payment_failed webhook ingested and stored in SQLite",
    color:  "var(--accent)",
  },
  {
    num:    "02",
    label:  "Tool Calls",
    detail: "get_customer_history · get_retry_attempts · get_payment_failure_info",
    color:  "#a78bfa",
  },
  {
    num:    "03",
    label:  "LLM Proposes",
    detail: "Returns action + reasoning + confidence score (0 – 1)",
    color:  "var(--text)",
  },
  {
    num:    "04",
    label:  "Rules Gate",
    detail: "MAX_RETRIES · HIGH_VALUE · INSUFFICIENT_HISTORY",
    color:  "var(--amber)",
  },
  {
    num:    "05",
    label:  "Action Executed",
    detail: "retry · send_reminder · escalate_to_human · stop_pursuing",
    color:  "var(--green)",
  },
  {
    num:    "06",
    label:  "Audit Logged",
    detail: "Full record: proposal → override applied → final action",
    color:  "var(--text-muted)",
  },
];

export default function ArchitectureFlow() {
  return (
    <div>
      <div className="section-heading">Architecture Snapshot</div>

      <div className="panel" style={{ padding: "0" }}>
        <div className="arch-flow">
          {STEPS.map((step) => (
            <div className="arch-step" key={step.num}>
              <div className="arch-step-num" style={{ color: step.color }}>{step.num}</div>
              <div className="arch-step-name" style={{ color: step.color }}>{step.label}</div>
              <div className="arch-step-detail">{step.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Written summary */}
      <div
        className="panel"
        style={{ marginTop: "1.25rem", fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: "1.7" }}
      >
        <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: "0.6rem", fontSize: "0.9rem" }}>
          How it works
        </div>
        A payment failure event is loaded from the database. The agent calls up to three
        read-only tools to gather customer history, retry attempt counts, and failure
        details. It then sends this context to the LLM, which returns a structured
        decision — one of <strong>retry</strong>, <strong>send_reminder</strong>,&nbsp;
        <strong>escalate_to_human</strong>, or <strong>stop_pursuing</strong> — with a
        confidence score and plain-language reasoning.
        <br /><br />
        Before any action reaches a customer, <strong>rules.py</strong> evaluates three
        deterministic guardrails: if the retry limit is already exhausted, if the
        payment value exceeds the automatic recovery threshold, or if the customer has
        no prior history. When a rule fires, the LLM's proposal is overridden and the
        substituted action is recorded alongside the original proposal in the audit log.
        <br /><br />
        Every decision — whether the LLM's proposal was accepted or overridden — is
        written to the audit log with the full chain of reasoning, making every outcome
        explainable and reviewable.
      </div>
    </div>
  );
}
