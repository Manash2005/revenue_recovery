import "./index.css";
import React, { useState } from "react";
import MetricsPanel       from "./components/MetricsPanel.jsx";
import AuditLogTable      from "./components/AuditLogTable.jsx";
import FailureCaseCallout from "./components/FailureCaseCallout.jsx";
import ArchitectureFlow   from "./components/ArchitectureFlow.jsx";
import SingleEventEvaluator from "./components/SingleEventEvaluator.jsx";

const TABS = [
  { id: "overview",     label: "Overview"     },
  { id: "audit",        label: "Audit Log"    },
  { id: "failure",      label: "Failure Case" },
  { id: "architecture", label: "Architecture" },
  { id: "evaluator",    label: "Evaluator"    },
];

export default function App() {
  const [tab, setTab] = useState("overview");

  const now = new Date().toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 55% at 10% 0%, rgba(79,142,247,0.07) 0%, transparent 65%)," +
          "radial-gradient(ellipse 65% 45% at 90% 100%, rgba(62,207,142,0.05) 0%, transparent 60%)," +
          "#0d1117",
      }}
    >
      {/* ── Topbar ─────────────────────────────────────────────────── */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-10 border-b"
        style={{
          height: "58px",
          borderColor: "var(--color-border)",
          background: "rgba(13,17,23,0.9)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-baseline gap-4">
          <span
            className="text-xl font-black tracking-tight"
            style={{ fontFamily: "var(--font-serif)", color: "var(--color-text)" }}
          >
            Recover
          </span>
          <span className="text-sm" style={{ color: "var(--color-muted)" }}>
            AI-powered revenue recovery — bounded, gated, fully auditable
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-muted)" }}>
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--color-green)", boxShadow: "0 0 6px var(--color-green)" }}
          />
          Live &nbsp;·&nbsp; {now}
        </div>
      </header>

      {/* ── Nav tabs ───────────────────────────────────────────────── */}
      <nav
        className="flex-shrink-0 flex items-center px-10 border-b"
        style={{
          borderColor: "var(--color-border)",
          background: "rgba(13,17,23,0.7)",
          backdropFilter: "blur(12px)",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-5 text-sm font-medium transition-colors duration-150"
            style={{
              height: "42px",
              border: "none",
              background: "none",
              borderBottom: tab === t.id ? "2px solid var(--color-accent)" : "2px solid transparent",
              color: tab === t.id ? "var(--color-accent)" : "var(--color-muted)",
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Main content ───────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-10 py-8 flex flex-col gap-8 scrollbar-thin">
        {tab === "overview"     && <MetricsPanel />}
        {tab === "audit"        && <AuditLogTable />}
        {tab === "failure"      && <FailureCaseCallout />}
        {tab === "architecture" && <ArchitectureFlow />}
        {tab === "evaluator" && <SingleEventEvaluator />}
      </main>
    </div>
  );
}