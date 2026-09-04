import React, { useEffect, useMemo, useState } from "react";
import { evaluateSingleEvent, fetchEvents } from "../data/api.js";

/* ── Panel Styles ───────────────────────────────────────────────────────── */
const panelStyle = {
  background: "var(--color-panel)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  boxShadow: "var(--shadow-panel)",
  backdropFilter: "blur(20px)",
};

const ACTION_LABELS = {
  retry: "Retry",
  send_reminder: "Send reminder",
  escalate_to_human: "Escalate to human",
  stop_pursuing: "Stop pursuing",
};

const CATEGORY_LABELS = {
  true_positive: "True positive",
  true_negative: "True negative",
  false_positive: "False positive",
  false_negative: "False negative",
  unlabeled: "No ground truth",
};

function formatAmount(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}

function EventSummary({ event, audited }) {
  if (!event) return null;

  return (
    <div style={panelStyle} className="p-6 mb-8 flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span
              className="text-[0.65rem] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
              style={{
                background: audited ? "rgba(62,207,142,0.12)" : "rgba(255,255,255,0.06)",
                color: audited ? "var(--color-green)" : "var(--color-muted)",
              }}
            >
              {audited ? "Audited" : "Not audited"}
            </span>
            <span className="text-sm" style={{ fontFamily: "var(--font-mono)", color: "var(--color-accent)" }}>
              {event.event_id}
            </span>
          </div>
          <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Payment failure event</h2>
          <p className="text-sm" style={{ fontFamily: "var(--font-mono)", color: "var(--color-muted)" }}>
            {event.customer_id} <span className="mx-2 opacity-50">·</span> {event.payment_id}
          </p>
        </div>
        <div className="flex flex-col md:items-end gap-1 text-left md:text-right">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
            Amount at stake
          </span>
          <strong className="text-2xl font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-text)" }}>
            {formatAmount(event.amount, event.currency)}
          </strong>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span
          className="text-sm font-medium px-3 py-1.5 rounded"
          style={{ background: "rgba(224,96,96,0.1)", color: "var(--color-red)", border: "1px solid rgba(224,96,96,0.2)" }}
        >
          {event.failure_reason?.replaceAll("_", " ")}
        </span>
        <span className="text-sm font-medium px-3 py-1.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-muted)", border: "1px solid var(--color-border-light)" }}>
          {event.retry_count ?? 0} of {event.max_retries} retries used
        </span>
        <span className="text-sm font-medium px-3 py-1.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-muted)", border: "1px solid var(--color-border-light)" }}>
          {event.customer_history_depth} prior history events
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5" style={{ borderTop: "1px solid var(--color-border-light)" }}>
        {[
          ["Event type", event.event_type],
          ["Timestamp", event.timestamp],
          ["Currency", event.currency],
        ].map(([label, value]) => (
          <div className="flex flex-col gap-1" key={label}>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-faint)" }}>{label}</span>
            <strong className="text-sm" style={{ color: "var(--color-text)" }}>{value ?? "-"}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SingleEventEvaluator() {
  const [events, setEvents] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchEvents()
      .then((items) => {
        setEvents(items);
        if (items.length) setSelectedId(items[0].event_id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const selectedEvent = useMemo(
    () => events.find((event) => event.event_id === selectedId),
    [events, selectedId],
  );

  async function evaluate() {
    if (!selectedId || running) return;

    setRunning(true);
    setError(null);
    setResult(null);
    setLogs([]);

    try {
      await evaluateSingleEvent(selectedId, (update) => {
        setLogs((current) => [...current, update.message]);
        if (update.result) setResult(update.result);
        if (update.stage === "error") setError(update.error);
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  const categoryColor = (cat) => {
    if (cat === "true_positive") return "var(--color-green)";
    if (cat === "true_negative") return "var(--color-accent)";
    if (cat === "false_positive") return "var(--color-amber)";
    if (cat === "false_negative") return "var(--color-red)";
    return "var(--color-muted)";
  };

  const categoryBg = (cat) => {
    if (cat === "true_positive") return "rgba(62,207,142,0.1)";
    if (cat === "true_negative") return "rgba(79,142,247,0.1)";
    if (cat === "false_positive") return "rgba(240,169,82,0.1)";
    if (cat === "false_negative") return "rgba(224,96,96,0.1)";
    return "rgba(255,255,255,0.05)";
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Intro */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
          Single-event evaluation
        </div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)", fontFamily: "var(--font-serif)" }}>
          Inspect one decision trace
        </h1>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Select any payment event, including events already in the audit log.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
        <div className="flex flex-col gap-2 flex-1">
          <label htmlFor="event-select" className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
            Payment event
          </label>
          <select
            id="event-select"
            value={selectedId}
            onChange={(event) => {
              setSelectedId(event.target.value);
              setResult(null);
              setLogs([]);
              setError(null);
            }}
            disabled={loading || running}
            className="w-full px-3 py-2 text-sm rounded outline-none transition-colors"
            style={{
              background: "rgba(0,0,0,0.2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <option value="">{loading ? "Loading events..." : "Choose an event"}</option>
            {events.map((event) => (
              <option key={event.event_id} value={event.event_id}>
                {event.event_id} - {event.audited ? "Audited" : "Not audited"} - {event.failure_reason}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={evaluate}
          disabled={!selectedId || running}
          className="px-6 py-2 rounded text-sm font-bold tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          style={{
            background: "var(--color-accent)",
            color: "#fff",
          }}
        >
          {running ? "Evaluating..." : "Evaluate event"}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded mb-6 text-sm font-medium" style={{ background: "rgba(224,96,96,0.1)", color: "var(--color-red)", border: "1px solid rgba(224,96,96,0.25)" }}>
          {error}
        </div>
      )}

      <EventSummary event={result?.event ?? selectedEvent} audited={result ? result.audited : selectedEvent?.audited} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Logs column */}
        <div style={panelStyle} className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--color-border-light)", background: "rgba(13,17,23,0.4)" }}>
            <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--color-text)" }}>
              Evaluation activity
            </span>
            {running && (
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-accent)" }}>
                <span className="w-2 h-2 rounded-full animate-ping" style={{ background: "var(--color-accent)" }}></span>
                Working
              </span>
            )}
          </div>
          <div className="p-5 flex flex-col gap-3 min-h-[300px] text-sm" style={{ fontFamily: "var(--font-mono)", color: "var(--color-text)", background: "rgba(0,0,0,0.15)" }}>
            {logs.length === 0 && !running && <span className="italic" style={{ color: "var(--color-faint)" }}>Progress messages will appear here.</span>}
            {logs.map((message, index) => (
              <div key={`${index}`} className="leading-relaxed border-l-2 pl-3 py-0.5" style={{ borderColor: "var(--color-border-light)" }}>
                {message}
              </div>
            ))}
            {running && (
              <div className="leading-relaxed border-l-2 pl-3 py-0.5 animate-pulse" style={{ borderColor: "var(--color-accent)", color: "var(--color-muted)" }}>
                Waiting for the decision engine...
              </div>
            )}
          </div>
        </div>

        {/* Result column */}
        <div style={panelStyle} className="flex flex-col">
          <div className="p-5 border-b" style={{ borderColor: "var(--color-border-light)", background: "rgba(13,17,23,0.4)" }}>
            <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--color-text)" }}>
              Decision result
            </span>
          </div>
          <div className="p-6 flex flex-col gap-6">
            {result ? (
              <>
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>Final action</span>
                      <div className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
                        {ACTION_LABELS[result.final_decision.action] ?? result.final_decision.action}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>Confidence</span>
                      <strong className="text-xl font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-text)" }}>
                        {Math.round(result.final_decision.confidence * 100)}%
                      </strong>
                    </div>
                  </div>

                  <div
                    className="flex justify-between items-center px-4 py-3 rounded border"
                    style={{
                      background: categoryBg(result.evaluation_category),
                      borderColor: categoryColor(result.evaluation_category),
                      color: categoryColor(result.evaluation_category),
                    }}
                  >
                    <span className="text-sm font-bold uppercase tracking-wider">
                      {CATEGORY_LABELS[result.evaluation_category] ?? result.evaluation_category}
                    </span>
                    <small className="text-xs opacity-80 uppercase tracking-widest">Compared with ground truth</small>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>Reasoning</span>
                  <p className="text-sm leading-relaxed italic" style={{ color: "var(--color-text)" }}>
                    {result.final_decision.reasoning}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-6 pt-5" style={{ borderTop: "1px solid var(--color-border-light)" }}>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-faint)" }}>LLM proposal</span>
                    <strong className="text-sm" style={{ color: "var(--color-text)" }}>{ACTION_LABELS[result.llm_proposal.action] ?? result.llm_proposal.action}</strong>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-faint)" }}>Ground truth</span>
                    <strong className="text-sm" style={{ color: "var(--color-text)" }}>{ACTION_LABELS[result.ground_truth_action] ?? result.ground_truth_action ?? "No label"}</strong>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-faint)" }}>Rule override</span>
                    <strong className="text-sm" style={{ color: "var(--color-amber)" }}>{result.rule_override?.rule ?? "None"}</strong>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-faint)" }}>Tools called</span>
                    <strong className="text-sm" style={{ color: "var(--color-accent)" }}>
                      {result.tool_calls.length ? result.tool_calls.map((call) => call.tool_name).join(", ") : "None"}
                    </strong>
                  </div>
                </div>

                <div className="mt-2 text-xs leading-relaxed px-4 py-3 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "var(--color-muted)" }}>
                  {result.audit_saved
                    ? "This event was unaudited before the run and is now saved to the audit log."
                    : "This event was already audited; the existing audit record was preserved."}
                </div>
              </>
            ) : (
              <span className="italic text-sm" style={{ color: "var(--color-faint)" }}>Run an evaluation to see the complete decision.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}