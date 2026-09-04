/**
 * api.js
 * ------
 * Thin fetch wrappers for the FastAPI backend.
 *
 * Backend base: http://localhost:8000  (proxied via Vite → /api)
 *
 * Endpoints:
 *   GET /api/metrics/summary  → MetricsSummary
 *   GET /api/audit-log        → AuditRecord[]
 *   GET /api/failure-case     → FailureCaseDoc
 */

const BASE = "/api";

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
