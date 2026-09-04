import React, { useEffect, useMemo, useState } from "react";
import { evaluateSingleEvent, fetchEvents } from "../data/api.js";

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

function formatAmount(amount, currency = "INR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}

function EventSummary({ event, audited }) {
  if (!event) return null;

  return (
    <div className="single-event-summary">
      <div className="single-event-status-row">
        <span className={`event-status ${audited ? "audited" : "unaudited"}`}>
          {audited ? "Audited" : "Not audited"}
        </span>
        <span className="single-event-id">{event.event_id}</span>
      </div>
      <div className="single-event-grid">
        {[
          ["Customer", event.customer_id],
          ["Payment", event.payment_id],
          ["Amount", formatAmount(event.amount, event.currency)],
          ["Failure", event.failure_reason],
          ["Retries", `${event.retry_count ?? 0} / ${event.max_retries}`],
          ["History depth", event.customer_history_depth],
          ["Event type", event.event_type],
          ["Timestamp", event.timestamp],
        ].map(([label, value]) => (
          <div className="single-event-field" key={label}>
            <span>{label}</span>
            <strong>{value ?? "-"}</strong>
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

  return (
    <section className="single-event-page">
      <div className="section-intro">
        <p className="section-heading">Single-event evaluation</p>
        <h1>Inspect one decision trace</h1>
        <p>Select any payment event, including events already in the audit log.</p>
      </div>

      <div className="single-event-controls">
        <label htmlFor="event-select">Payment event</label>
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
        >
          <option value="">{loading ? "Loading events..." : "Choose an event"}</option>
          {events.map((event) => (
            <option key={event.event_id} value={event.event_id}>
              {event.event_id} - {event.audited ? "Audited" : "Not audited"} - {event.failure_reason}
            </option>
          ))}
        </select>
        <button className="evaluate-button" onClick={evaluate} disabled={!selectedId || running}>
          {running ? "Evaluating..." : "Evaluate event"}
        </button>
      </div>

      {error && <div className="single-event-error">{error}</div>}

      <EventSummary event={result?.event ?? selectedEvent} audited={result ? result.audited : selectedEvent?.audited} />

      <div className="single-event-columns">
        <div className="panel single-event-log">
          <div className="single-event-panel-title">
            <span>Evaluation activity</span>
            {running && <span className="activity-indicator">Working</span>}
          </div>
          <div className="friendly-log" aria-live="polite">
            {logs.length === 0 && !running && <span className="log-muted">Progress messages will appear here.</span>}
            {logs.map((message, index) => <div key={`${message}-${index}`}>{message}</div>)}
            {running && <div className="log-pulse">Waiting for the decision engine...</div>}
          </div>
        </div>

        <div className="panel single-event-result">
          <div className="single-event-panel-title">Decision result</div>
          {result ? (
            <>
              <div className="decision-result-action">{ACTION_LABELS[result.final_decision.action] ?? result.final_decision.action}</div>
              <p>{result.final_decision.reasoning}</p>
              <div className="single-event-field"><span>LLM proposal</span><strong>{ACTION_LABELS[result.llm_proposal.action] ?? result.llm_proposal.action}</strong></div>
              <div className="single-event-field"><span>Confidence</span><strong>{Math.round(result.final_decision.confidence * 100)}%</strong></div>
              <div className="single-event-field"><span>Ground truth</span><strong>{ACTION_LABELS[result.ground_truth_action] ?? result.ground_truth_action ?? "No label"}</strong></div>
              <div className="single-event-field"><span>Evaluation</span><strong className={`evaluation-category ${result.evaluation_category}`}>{CATEGORY_LABELS[result.evaluation_category] ?? result.evaluation_category}</strong></div>
              <div className="single-event-field"><span>Rule override</span><strong>{result.rule_override?.rule ?? "None"}</strong></div>
              <div className="single-event-field"><span>Tools called</span><strong>{result.tool_calls.length ? result.tool_calls.map((call) => call.tool_name).join(", ") : "None"}</strong></div>
              <div className="single-event-audit-note">
                {result.audit_saved ? "This event was unaudited before the run and is now saved to the audit log." : "This event was already audited; the existing audit record was preserved."}
              </div>
            </>
          ) : (
            <span className="log-muted">Run an evaluation to see the complete decision.</span>
          )}
        </div>
      </div>
    </section>
  );
}