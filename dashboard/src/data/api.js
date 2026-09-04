/**
 * api.js
 * ------
 * Thin fetch wrappers for the FastAPI backend.
 *
 * Backend base: VITE_API_BASE_URL in production, or the Vite proxy locally.
 *
 * Endpoints:
 *   GET /api/metrics/summary  → MetricsSummary
 *   GET /api/audit-log        → AuditRecord[]
 *   GET /api/failure-case     → FailureCaseDoc
 *   GET /api/events           → PaymentEvent[]
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const BASE = `${API_BASE_URL}/api`;

async function fetchJSON(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

/** GET /api/metrics/summary */
export const fetchMetrics     = () => fetchJSON("/metrics/summary");

/** GET /api/audit-log */
export const fetchAuditLog    = () => fetchJSON("/audit-log");

/** GET /api/failure-case */
export const fetchFailureCase = () => fetchJSON("/failure-case");
export const fetchEvents       = () => fetchJSON("/events");

/** Stream one single-event evaluation as friendly progress objects. */
export async function evaluateSingleEvent(eventId, onUpdate) {
  const response = await fetch(`${BASE}/single-event/${encodeURIComponent(eventId)}`, {
    method: "POST",
    headers: { Accept: "text/event-stream" },
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    const messages = buffer.split("\n\n");
    buffer = messages.pop() || "";
    for (const message of messages) {
      const line = message.split("\n").find((entry) => entry.startsWith("data: "));
      if (line) onUpdate(JSON.parse(line.slice(6)));
    }

    if (done) break;
  }
}
