import React, { useEffect, useState } from "react";
import { fetchFailureCase } from "../data/api.js";

const panelStyle = {
  background: "rgba(224,96,96,0.04)",
  border: "1px solid rgba(224,96,96,0.22)",
  borderRadius: "var(--radius-md)",
  boxShadow: "var(--shadow-panel)",
  backdropFilter: "blur(20px)",
  padding: "1.75rem",
};

export default function FailureCaseCallout() {
  const [data, setData]   = useState(null);
  const [open, setOpen]   = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFailureCase().then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <div
        className="text-xs font-semibold uppercase tracking-widest mb-4"
        style={{ color: "var(--color-muted)" }}
      >
        Failure Case — Day 14 Requirement
      </div>

      <div style={panelStyle}>
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-1.5">
            <div className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
              {data?.title ?? "Schema Violation — Graceful Fallback"}
            </div>
            <div className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
              How the agent handles a malformed LLM response without crashing, silently skipping,
              or executing an unvalidated action on a customer account.
            </div>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex-shrink-0 text-sm font-medium px-4 py-1.5 rounded-full border transition-all duration-150"
            style={{
              background:  open ? "rgba(224,96,96,0.1)" : "rgba(255,255,255,0.05)",
              color:       open ? "var(--color-red)"    : "var(--color-muted)",
              borderColor: open ? "rgba(224,96,96,0.25)" : "var(--color-border)",
            }}
          >
            {open ? "Collapse" : "View Details"}
          </button>
        </div>

        {/* Detail */}
        {open && (
          <div
            className="grid grid-cols-2 gap-6 mt-6 pt-6"
            style={{ borderTop: "1px solid rgba(224,96,96,0.15)" }}
          >
            {error && (
              <div className="col-span-2 text-sm" style={{ color: "var(--color-red)" }}>
                Could not load failure case: {error}
              </div>
            )}

            {data && (
              <>
                {[
                  { label: "What went wrong",      value: data.what_went_wrong,  code: false },
                  { label: "Agent behaviour",       value: data.agent_behaviour,  code: false },
                  { label: "Safe default taken",    value: data.safe_default,     code: true  },
                  { label: "Why this is correct for a money-handling system", value: data.why_correct, code: false },
                ].map((f) => (
                  <div key={f.label} className="flex flex-col gap-2">
                    <div
                      className="text-xs font-semibold uppercase tracking-widest"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {f.label}
                    </div>
                    {f.code ? (
                      <code
                        className="text-sm px-3 py-2 rounded leading-relaxed block"
                        style={{
                          color: "var(--color-accent)",
                          background: "rgba(79,142,247,0.08)",
                          border: "1px solid rgba(79,142,247,0.15)",
                          fontFamily: "var(--font-mono)",
                          wordBreak: "break-all",
                        }}
                      >
                        {f.value}
                      </code>
                    ) : (
                      <div className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
                        {f.value}
                      </div>
                    )}
                  </div>
                ))}

                {/* Wide fields */}
                {[
                  { label: "Guard mechanism",  value: data.guard_mechanism  },
                  { label: "Schema enforced",  value: data.schema_enforced  },
                ].map((f) => (
                  <div key={f.label} className="col-span-2 flex flex-col gap-2">
                    <div
                      className="text-xs font-semibold uppercase tracking-widest"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {f.label}
                    </div>
                    <code
                      className="text-sm px-3 py-2 rounded leading-relaxed block"
                      style={{
                        color: "var(--color-accent)",
                        background: "rgba(79,142,247,0.08)",
                        border: "1px solid rgba(79,142,247,0.15)",
                        fontFamily: "var(--font-mono)",
                        wordBreak: "break-all",
                      }}
                    >
                      {f.value}
                    </code>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
