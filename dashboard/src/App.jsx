import React, { useState } from "react";
import "./index.css";
import MetricsPanel       from "./components/MetricsPanel.jsx";
import AuditLogTable      from "./components/AuditLogTable.jsx";
import FailureCaseCallout from "./components/FailureCaseCallout.jsx";
import ArchitectureFlow   from "./components/ArchitectureFlow.jsx";
import SingleEventEvaluator from "./components/SingleEventEvaluator.jsx";

const TABS = [
  { id: "overview",     label: "Overview"         },
  { id: "audit",        label: "Audit Log"        },
  { id: "failure",      label: "Failure Case"     },
  { id: "architecture", label: "Architecture"     },
  { id: "evaluate",     label: "Evaluate Event"   },
];

export default function App() {
  const [tab, setTab] = useState("overview");

  const now = new Date().toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="app-shell">

      {/* Top bar */}
      <header className="topbar">
        <div style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}>
          <span className="topbar-brand">Recover</span>
          <span className="topbar-tag">AI-powered revenue recovery — bounded, gated, fully auditable</span>
        </div>
        <div className="topbar-right">
          <span className="live-dot" />
          Live &nbsp;·&nbsp; {now}
        </div>
      </header>

      {/* Navigation tabs */}
      <nav className="nav-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`nav-tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="main">
        {tab === "overview"     && <MetricsPanel />}
        {tab === "audit"        && <AuditLogTable />}
        {tab === "failure"      && <FailureCaseCallout />}
        {tab === "architecture" && <ArchitectureFlow />}
        {tab === "evaluate"     && <SingleEventEvaluator />}
      </main>

    </div>
  );
}