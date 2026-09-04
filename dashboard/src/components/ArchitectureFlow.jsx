import React from "react";

const STEPS = [
  {
    num: "01",
    label: "Payment Event Ingested",
    detail: "A payment_failed webhook is ingested and stored in the SQLite database.",
    color: "var(--color-accent)",
    bg: "rgba(79,142,247,0.08)",
  },
  {
    num: "02",
    label: "Context Gathering (Tool Calls)",
    detail: "The agent fetches customer history, retry attempts, and payment failure details from read-only backend services.",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.08)",
  },
  {
    num: "03",
    label: "LLM Decision Engine",
    detail: "The LLM evaluates the context and returns a structured action (retry, send_reminder, escalate_to_human, stop_pursuing) with a confidence score and reasoning.",
    color: "var(--color-text)",
    bg: "rgba(255,255,255,0.05)",
  },
  {
    num: "04",
    label: "Deterministic Rules Gate",
    detail: "The proposed action must pass strict guardrails (MAX_RETRIES, HIGH_VALUE, INSUFFICIENT_HISTORY). If a rule fires, it overrides the LLM proposal.",
    color: "var(--color-amber)",
    bg: "rgba(240,169,82,0.08)",
  },
  {
    num: "05",
    label: "Action Execution",
    detail: "The final, validated action is executed. Invalid actions never reach the customer.",
    color: "var(--color-green)",
    bg: "rgba(62,207,142,0.08)",
  },
  {
    num: "06",
    label: "Audit Trail Logging",
    detail: "Every outcome is permanently recorded with the LLM reasoning, the rule override (if any), and the final action executed, ensuring total explainability.",
    color: "var(--color-muted)",
    bg: "rgba(122,143,168,0.08)",
  },
];

function Arrow() {
  return (
    <div className="flex justify-center my-1" style={{ opacity: 0.4 }}>
      <svg width="24" height="40" viewBox="0 0 24 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 4L12 36M12 36L6 30M12 36L18 30"
          stroke="var(--color-muted)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function ArchitectureFlow() {
  return (
    <div className="max-w-3xl mx-auto w-full pb-10">
      <div className="flex flex-col gap-2 mb-10 text-center">
        <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
          System Architecture
        </div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-text)" }}>
          Bounded AI Execution Pipeline
        </h2>
        <p className="text-sm mt-2" style={{ color: "var(--color-muted)" }}>
          How events are safely processed, gated by rules, and audited for complete observability.
        </p>
      </div>

      <div className="flex flex-col items-center">
        {STEPS.map((step, index) => (
          <React.Fragment key={step.num}>
            <div
              className="w-full flex items-start p-6 relative transition-transform duration-200 hover:-translate-y-1"
              style={{
                background: "var(--color-panel)",
                border: "1px solid var(--color-border)",
                borderLeft: `4px solid ${step.color}`,
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-panel)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div
                className="w-12 h-12 flex items-center justify-center rounded-full mr-5 flex-shrink-0"
                style={{ background: step.bg, color: step.color, border: `1px solid ${step.color}40` }}
              >
                <span className="text-base font-bold font-mono tracking-tighter">{step.num}</span>
              </div>
              <div className="flex flex-col gap-1.5 pt-1 text-left">
                <span className="text-lg font-bold" style={{ color: step.color }}>
                  {step.label}
                </span>
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-text)", opacity: 0.8 }}>
                  {step.detail}
                </p>
              </div>
            </div>

            {/* Arrow connecting the cards (skip after the last card) */}
            {index < STEPS.length - 1 && <Arrow />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
