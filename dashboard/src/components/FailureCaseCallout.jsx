import React, { useEffect, useState } from "react";
import { fetchFailureCase } from "../data/api.js";

export default function FailureCaseCallout() {
  const [data, setData]   = useState(null);
  const [open, setOpen]   = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFailureCase().then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <div className="section-heading">Failure Case</div>

      <div className="panel failure-panel">
        {/* Header — always visible */}
        <div className="failure-header">
          <div className="failure-header-left">
            <div className="failure-title">
              {data?.title ?? "Schema Violation — Graceful Fallback"}
            </div>
            <div className="failure-subtitle">
              How the agent handles a malformed LLM response without crashing, silently skipping,
              or executing an unvalidated action on a customer account.
            </div>
          </div>
          <button
            className={`failure-toggle${open ? " open" : ""}`}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Collapse" : "View Details"}
          </button>
        </div>

        {/* Detail — collapsible */}
        {open && (
          <div className="failure-body">
            {error && (
              <div style={{ gridColumn: "span 2", color: "var(--red)", fontSize: "0.85rem" }}>
                Could not load failure case: {error}
              </div>
            )}

            {data && (
              <>
                <div className="failure-field">
                  <div className="failure-field-label">What went wrong</div>
                  <div className="failure-field-value">{data.what_went_wrong}</div>
                </div>

                <div className="failure-field">
                  <div className="failure-field-label">Agent behaviour</div>
                  <div className="failure-field-value">{data.agent_behaviour}</div>
                </div>

                <div className="failure-field">
                  <div className="failure-field-label">Safe default taken</div>
                  <div className="failure-field-value">
                    <span className="code-inline">{data.safe_default}</span>
                  </div>
                </div>

                <div className="failure-field">
                  <div className="failure-field-label">Why this is correct for a money-handling system</div>
                  <div className="failure-field-value">{data.why_correct}</div>
                </div>

                <div className="failure-field full">
                  <div className="failure-field-label">Guard mechanism</div>
                  <div className="failure-field-value">
                    <span className="code-inline">{data.guard_mechanism}</span>
                  </div>
                </div>

                <div className="failure-field full">
                  <div className="failure-field-label">Schema enforced</div>
                  <div className="failure-field-value">
                    <span className="code-inline">{data.schema_enforced}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
