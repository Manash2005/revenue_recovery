import "./index.css";
import React, { useEffect, useState, useRef } from "react";
import MetricsPanel         from "./components/MetricsPanel.jsx";
import AuditLogTable        from "./components/AuditLogTable.jsx";
import FailureCaseCallout   from "./components/FailureCaseCallout.jsx";
import ArchitectureFlow     from "./components/ArchitectureFlow.jsx";
import SingleEventEvaluator from "./components/SingleEventEvaluator.jsx";
import useReveal            from "./hooks/useReveal.js";

/* ── Reusable scroll-reveal wrapper ─────────────────────────────────────── */
function Reveal({ children, className = "", delay = 0, direction = "up" }) {
  const ref = useReveal({ threshold: 0.12 });
  const animClass = direction === "left" ? "reveal-left" : direction === "right" ? "reveal-right" : "reveal";
  return (
    <div
      ref={ref}
      className={`${animClass} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ── Story prose block ───────────────────────────────────────────────────── */
function Prose({ children, className = "", delay = 0 }) {
  return (
    <Reveal delay={delay} className={`max-w-4xl mx-auto text-center ${className}`}>
      {children}
    </Reveal>
  );
}

/* ── Chapter label ───────────────────────────────────────────────────────── */
function Chapter({ number, label }) {
  return (
    <Reveal className="flex items-center justify-center gap-3 mb-8">
      <span
        className="text-xs font-bold tracking-widest uppercase"
        style={{ color: "var(--color-faint)" }}
      >
        Chapter {number}
      </span>
      <span className="h-px w-12 opacity-20" style={{ background: "var(--color-muted)" }} />
      <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--color-accent)" }}>
        {label}
      </span>
    </Reveal>
  );
}

/* ── Pull-quote ──────────────────────────────────────────────────────────── */
function PullQuote({ children }) {
  return (
    <Reveal className="my-16">
      <blockquote
        className="text-center text-2xl font-light italic leading-relaxed mx-auto max-w-4xl px-4"
        style={{
          color: "var(--color-text)",
          borderLeft: "none",
          fontFamily: "var(--font-serif)",
        }}
      >
        <span style={{ color: "var(--color-accent)", fontSize: "3rem", lineHeight: 0.5, verticalAlign: "-0.4rem", marginRight: "0.2rem" }}>"</span>
        {children}
        <span style={{ color: "var(--color-accent)", fontSize: "3rem", lineHeight: 0.5, verticalAlign: "-0.4rem", marginLeft: "0.2rem" }}>"</span>
      </blockquote>
    </Reveal>
  );
}

/* ── Inline stat highlight ───────────────────────────────────────────────── */
function InlineStat({ value, label, color = "var(--color-accent)" }) {
  return (
    <Reveal className="glass flex flex-col items-center text-center px-8 py-6" style={{ borderRadius: "var(--radius-lg)" }}>
      <span className="text-4xl font-black" style={{ fontFamily: "var(--font-serif)", color }}>
        {value}
      </span>
      <span className="text-xs mt-2 font-medium uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
        {label}
      </span>
    </Reveal>
  );
}

/* ── Problem / solution row ──────────────────────────────────────────────── */
function TwoColNarrative({ left, right }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      <Reveal direction="left" className="glass p-7" style={{ borderRadius: "var(--radius-md)", borderLeft: "3px solid var(--color-red)" }}>
        {left}
      </Reveal>
      <Reveal direction="right" delay={150} className="glass p-7" style={{ borderRadius: "var(--radius-md)", borderLeft: "3px solid var(--color-green)" }}>
        {right}
      </Reveal>
    </div>
  );
}

/* ── Sticky nav ──────────────────────────────────────────────────────────── */
function StickyNav({ visible }) {
  const NAV = [
    { href: "#problem",       label: "The Problem"   },
    { href: "#solution",      label: "The Solution"  },
    { href: "#proof",         label: "The Proof"     },
    { href: "#transparency",  label: "Transparency"  },
    { href: "#live-run",      label: "Live Run"      },
    { href: "#resilience",    label: "Resilience"    },
    { href: "#how-it-works",  label: "How It Works"  },
  ];
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 py-3 transition-all duration-500"
      style={{
        background: visible ? "rgba(8,12,18,0.9)" : "transparent",
        backdropFilter: visible ? "blur(24px)" : "none",
        borderBottom: visible ? "1px solid var(--color-border)" : "none",
        transform: visible ? "translateY(0)" : "translateY(-100%)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div className="flex items-center gap-0.5 overflow-x-auto">
        <span
          className="text-base font-black tracking-tight mr-6 flex-shrink-0"
          style={{ fontFamily: "var(--font-serif)", color: "var(--color-text)" }}
        >
          Gate <span style={{ color: "var(--color-accent)" }}> Keeper </span>
        </span>
        {NAV.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-150 whitespace-nowrap flex-shrink-0"
            style={{ color: "var(--color-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-muted)"; e.currentTarget.style.background = "none"; }}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

/* ── Horizontal rule with label ──────────────────────────────────────────── */
function SceneDivider({ label }) {
  return (
    <div className="flex items-center gap-4 my-28 max-w-5xl mx-auto px-6">
      <div className="flex-1 h-px opacity-10" style={{ background: "var(--color-muted)" }} />
      <span
        className="text-xs font-bold tracking-widest uppercase px-4 py-1 rounded-full flex-shrink-0"
        style={{ color: "var(--color-faint)", border: "1px solid var(--color-border-light)" }}
      >
        {label}
      </span>
      <div className="flex-1 h-px opacity-10" style={{ background: "var(--color-muted)" }} />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   MAIN APP
────────────────────────────────────────────────────────────────────────── */
export default function App() {
  const [navVisible, setNavVisible] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setNavVisible(!entry.isIntersecting),
      { threshold: 0.05 }
    );
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <StickyNav visible={navVisible} />

      {/* ── Ambient orbs ───────────────────────────────────────────── */}
      <div aria-hidden className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="orb" style={{ width: 700, height: 700, top: "-15%", left: "-10%", background: "radial-gradient(circle, rgba(79,142,247,0.1) 0%, transparent 70%)", animation: "float-slow 12s ease-in-out infinite" }} />
        <div className="orb" style={{ width: 500, height: 500, bottom: "10%", right: "-5%", background: "radial-gradient(circle, rgba(62,207,142,0.07) 0%, transparent 70%)", animation: "float-slow 16s ease-in-out infinite reverse" }} />
        <div className="orb" style={{ width: 400, height: 400, top: "40%", left: "50%", background: "radial-gradient(circle, rgba(240,169,82,0.05) 0%, transparent 70%)", animation: "float-slow 20s ease-in-out infinite 4s" }} />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          HERO — Hook the reader
      ══════════════════════════════════════════════════════════════ */}
      <div
        ref={heroRef}
        className="relative flex flex-col items-center justify-center text-center px-4"
        style={{ minHeight: "100vh", zIndex: 1, paddingTop: "80px", paddingBottom: "80px" }}
      >
        <div className="hero-fade hero-delay-1 inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-10"
          style={{ background: "rgba(79,142,247,0.1)", color: "var(--color-accent)", border: "1px solid rgba(79,142,247,0.2)" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-green)", boxShadow: "0 0 6px var(--color-green)" }} />
          AI Revenue Recovery — Live System
        </div>

        <h1
          className="hero-fade hero-delay-2 font-black tracking-tight mb-6"
          style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(2.8rem, 7vw, 5.5rem)", lineHeight: 1.08, maxWidth: "900px", color: "var(--color-text)" }}
        >
          Every failed payment is a customer
          <br />
          <span style={{ color: "var(--color-accent)" }}>
            you can still save.
          </span>
        </h1>

        <p
          className="hero-fade hero-delay-3 text-xl leading-relaxed mb-4"
          style={{ color: "var(--color-muted)", fontWeight: 300, maxWidth: "800px" }}
        >
          Payment failures happen every day. Most companies let a cron job retry once
          or twice, then write off the loss. This system does something different.
        </p>

        <p
          className="hero-fade hero-delay-4 text-base leading-relaxed mb-12"
          style={{ color: "var(--color-faint)", maxWidth: "700px" }}
        >
          Scroll down to see how an AI agent handles real payment failures —
          and why it never gets to act unsupervised.
        </p>

        <div className="hero-fade hero-delay-5 flex items-center gap-4">
          <a
            href="#problem"
            className="px-8 py-3 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-105"
            style={{ background: "linear-gradient(135deg, #4f8ef7 0%, #3ba8f5 100%)", color: "#fff", boxShadow: "0 4px 24px rgba(79,142,247,0.35)" }}
          >
            Read the story
          </a>
          <a
            href="#how-it-works"
            className="px-8 py-3 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-105 glass"
            style={{ color: "var(--color-text)" }}
          >
            Skip to architecture
          </a>
        </div>

        {/* Scroll cue */}
        <div className="hero-fade hero-delay-5 absolute bottom-10 left-1/2 flex flex-col items-center gap-2" style={{ transform: "translateX(-50%)" }}>
          <span className="text-xs uppercase tracking-widest" style={{ color: "var(--color-faint)" }}>scroll</span>
          <div className="w-5 h-8 rounded-full flex items-start justify-center pt-1.5" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="w-1 h-2 rounded-full" style={{ background: "var(--color-muted)", animation: "float-slow 1.8s ease-in-out infinite" }} />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          CHAPTER 1 — The Problem
      ══════════════════════════════════════════════════════════════ */}
      <div id="problem" className="relative px-4" style={{ zIndex: 1 }}>
        <div className="max-w-5xl mx-auto">

          <Chapter number="01" label="The Problem" />

          <Prose delay={0}>
            <h2 className="text-4xl font-black mb-6 leading-tight" style={{ fontFamily: "var(--font-serif)", color: "var(--color-text)" }}>
              A payment fails. <br />
              <span style={{ color: "var(--color-red)" }}>What happens next?</span>
            </h2>
          </Prose>

          <Prose delay={100} className="mb-14">
            <p className="text-lg leading-loose" style={{ color: "var(--color-muted)" }}>
              A customer's card gets declined. Maybe they forgot to update their billing details.
              Maybe it's a temporary network hiccup. Maybe the card was genuinely stolen.
              In each case, the right action is completely different.
            </p>
          </Prose>

          <TwoColNarrative
            left={
              <>
                <div className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--color-red)" }}>The old way</div>
                <p className="text-sm leading-loose" style={{ color: "var(--color-muted)" }}>
                  A scheduled job retries the charge automatically. It doesn't know if the card is expired,
                  if the customer flagged fraud, or if they already cancelled. It just retries — 
                  sometimes making a bad situation worse, sometimes emailing a customer who was about to self-resolve.
                </p>
              </>
            }
            right={
              <>
                <div className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--color-green)" }}>What you actually need</div>
                <p className="text-sm leading-loose" style={{ color: "var(--color-muted)" }}>
                  A system that reads the failure reason, checks the customer's history, 
                  knows how many retries have already happened, understands the amount at stake —
                  and then picks the right action for that specific situation.
                </p>
              </>
            }
          />

          <PullQuote>
            The difference between retrying a declined card and escalating it to a human
            can be worth hundreds of dollars. And that decision should take context, not just a timer.
          </PullQuote>

        </div>
      </div>

      <SceneDivider label="Enter the agent" />

      {/* ══════════════════════════════════════════════════════════════
          CHAPTER 2 — The Solution
      ══════════════════════════════════════════════════════════════ */}
      <div id="solution" className="relative px-4" style={{ zIndex: 1 }}>
        <div className="max-w-5xl mx-auto">

          <Chapter number="02" label="The Solution" />

          <Prose delay={0}>
            <h2 className="text-4xl font-black mb-6 leading-tight" style={{ fontFamily: "var(--font-serif)", color: "var(--color-text)" }}>
              An AI agent that reads the room.
              <br />
              <span style={{ color: "var(--color-accent)" }}>Then asks permission first.</span>
            </h2>
          </Prose>

          <Prose delay={100} className="mb-16">
            <p className="text-lg leading-loose" style={{ color: "var(--color-muted)" }}>
              For each failed payment, the agent gathers the customer's payment history,
              the number of previous retries, and the exact failure reason.
              It hands all of this to an LLM and asks: <em>"What's the right call here?"</em>
            </p>
          </Prose>

          <Reveal className="glass max-w-3xl mx-auto p-8 mb-10" style={{ borderRadius: "var(--radius-lg)" }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-5 text-center" style={{ color: "var(--color-muted)" }}>
              The 4 possible decisions
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { action: "Retry", desc: "Safe to attempt the charge again", color: "var(--color-green)" },
                { action: "Send Reminder", desc: "Email or notify the customer gently", color: "var(--color-accent)" },
                { action: "Escalate", desc: "A human needs to look at this", color: "var(--color-amber)" },
                { action: "Stop Pursuing", desc: "This one isn't worth recovering", color: "var(--color-red)" },
              ].map((d, i) => (
                <Reveal key={d.action} delay={i * 80} className="flex flex-col items-center text-center gap-2 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--color-border-light)" }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color, boxShadow: `0 0 8px ${d.color}` }} />
                  <span className="text-sm font-bold" style={{ color: d.color }}>{d.action}</span>
                  <span className="text-xs leading-snug" style={{ color: "var(--color-muted)" }}>{d.desc}</span>
                </Reveal>
              ))}
            </div>
          </Reveal>

          <Prose delay={200} className="mb-10">
            <p className="text-base leading-loose" style={{ color: "var(--color-muted)" }}>
              But here's the critical part — the LLM never acts directly on a customer.
              Before any decision is executed, it passes through a layer of deterministic rules.
              These rules can override the LLM if it's wrong.
            </p>
          </Prose>

          <Reveal className="glass-strong max-w-3xl mx-auto p-7 mb-4" style={{ borderRadius: "var(--radius-md)", borderLeft: "4px solid var(--color-amber)" }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--color-amber)" }}>
              The three guardrails — always enforced, no exceptions
            </div>
            <div className="flex flex-col gap-3">
              {[
                { rule: "MAX_RETRIES", explanation: "If we've already retried too many times, we escalate to a human instead of trying again and annoying the customer." },
                { rule: "HIGH_VALUE_PAYMENT", explanation: "Payments above a certain amount are too risky to automate. A human reviews them every time." },
                { rule: "INSUFFICIENT_HISTORY", explanation: "If we know nothing about the customer, we send a gentle reminder rather than assuming intent." },
              ].map((r, i) => (
                <Reveal key={r.rule} delay={i * 100} className="flex items-start gap-4">
                  <code className="text-xs font-bold px-2 py-1 rounded flex-shrink-0 mt-0.5" style={{ color: "var(--color-amber)", background: "rgba(240,169,82,0.12)", border: "1px solid rgba(240,169,82,0.2)" }}>{r.rule}</code>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>{r.explanation}</p>
                </Reveal>
              ))}
            </div>
          </Reveal>

          <Prose delay={100} className="mt-8">
            <p className="text-sm leading-loose" style={{ color: "var(--color-faint)" }}>
              When a rule fires, we don't hide it. The original LLM proposal and the override
              are both written to the audit log so you can see exactly why the final decision differs.
            </p>
          </Prose>

        </div>
      </div>

      <SceneDivider label="The results" />

      {/* ══════════════════════════════════════════════════════════════
          CHAPTER 3 — The Proof (live metrics)
      ══════════════════════════════════════════════════════════════ */}
      <div id="proof" className="relative px-4 md:px-6 lg:px-8 xl:px-10" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto">

          <Chapter number="03" label="The Proof" />

          <Prose delay={0}>
            <h2 className="text-4xl font-black mb-6 leading-tight" style={{ fontFamily: "var(--font-serif)", color: "var(--color-text)" }}>
              We ran it on payment failures.
              <br />
              <span style={{ color: "var(--color-green)" }}>Here's what happened.</span>
            </h2>
          </Prose>

          <Prose delay={100} className="mb-14">
            <p className="text-lg leading-loose" style={{ color: "var(--color-muted)" }}>
              These numbers are pulled live from the system's own database, not from a marketing slide.
              Every metric you see below traces back to an individual, reviewable decision.
            </p>
          </Prose>

          <Reveal>
            <MetricsPanel />
          </Reveal>

        </div>
      </div>

      <SceneDivider label="Every decision, open" />

      {/* ══════════════════════════════════════════════════════════════
          CHAPTER 4 — Transparency (audit log)
      ══════════════════════════════════════════════════════════════ */}
      <div id="transparency" className="relative px-4 md:px-6 lg:px-8 xl:px-10" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto">

          <Chapter number="04" label="Transparency" />

          <Prose delay={0}>
            <h2 className="text-4xl font-black mb-6 leading-tight" style={{ fontFamily: "var(--font-serif)", color: "var(--color-text)" }}>
              Every single decision
              <br />
              <span style={{ color: "var(--color-accent)" }}>is written down.</span>
            </h2>
          </Prose>

          <Prose delay={100} className="mb-6">
            <p className="text-lg leading-loose" style={{ color: "var(--color-muted)" }}>
              "The AI decided." That answer is not acceptable in a system that touches customer money.
              Below is the complete audit trail — what the LLM proposed, what the rules changed,
              and what action was finally taken.
            </p>
          </Prose>

          <Prose delay={150} className="mb-14">
            <p className="text-sm leading-loose" style={{ color: "var(--color-faint)" }}>
              Click any row to expand it. You'll see the LLM's full reasoning, the override reason if one was applied,
              and every tool call the agent made to gather context.
            </p>
          </Prose>

          <Reveal>
            <AuditLogTable />
          </Reveal>

        </div>
      </div>

      <SceneDivider label="See it live" />

      {/* ══════════════════════════════════════════════════════════════
          CHAPTER 5 — Live Run (evaluator)
      ══════════════════════════════════════════════════════════════ */}
      <div id="live-run" className="relative px-4 md:px-6 lg:px-8 xl:px-10" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto">

          <Chapter number="05" label="Live Run" />

          <Prose delay={0}>
            <h2 className="text-4xl font-black mb-6 leading-tight" style={{ fontFamily: "var(--font-serif)", color: "var(--color-text)" }}>
              Pick an event.
              <br />
              <span style={{ color: "var(--color-green)" }}>Watch the agent decide.</span>
            </h2>
          </Prose>

          <Prose delay={100} className="mb-14">
            <p className="text-lg leading-loose" style={{ color: "var(--color-muted)" }}>
              Select any payment failure from the dropdown below and trigger a live run.
              You'll see the agent call its tools, get the LLM response, apply the rules, 
              and produce a final decision — step by step, in real time.
            </p>
          </Prose>

          <Reveal>
            <SingleEventEvaluator />
          </Reveal>

        </div>
      </div>

      <SceneDivider label="When things break" />

      {/* ══════════════════════════════════════════════════════════════
          CHAPTER 6 — Resilience (failure case)
      ══════════════════════════════════════════════════════════════ */}
      <div id="resilience" className="relative px-4 md:px-6 lg:px-8 xl:px-10" style={{ zIndex: 1 }}>
        <div className="max-w-5xl mx-auto">

          <Chapter number="06" label="Resilience" />

          <Prose delay={0}>
            <h2 className="text-4xl font-black mb-6 leading-tight" style={{ fontFamily: "var(--font-serif)", color: "var(--color-text)" }}>
              What if the AI returns garbage?
              <br />
              <span style={{ color: "var(--color-amber)" }}>We planned for that too.</span>
            </h2>
          </Prose>

          <Prose delay={100} className="mb-8">
            <p className="text-lg leading-loose" style={{ color: "var(--color-muted)" }}>
              Large language models are not perfect. Sometimes they return a malformed response.
              A naive system would either crash, silently skip the event, or — worst of all —
              execute an unvalidated action. This system does none of those things.
            </p>
          </Prose>

          <Prose delay={150} className="mb-14">
            <p className="text-base leading-loose" style={{ color: "var(--color-muted)" }}>
              Every LLM response is validated against a strict schema before it's even considered.
              If it fails validation, the system falls back to a safe default, logs the failure,
              and moves on. No customer is affected. No decision is silently lost.
            </p>
          </Prose>

          <Reveal>
            <FailureCaseCallout />
          </Reveal>

        </div>
      </div>

      <SceneDivider label="Under the hood" />

      {/* ══════════════════════════════════════════════════════════════
          CHAPTER 7 — Architecture
      ══════════════════════════════════════════════════════════════ */}
      <div id="how-it-works" className="relative px-4 md:px-6 lg:px-8 xl:px-10" style={{ zIndex: 1 }}>
        <div className="max-w-5xl mx-auto">

          <Chapter number="07" label="How It Works" />

          <Prose delay={0}>
            <h2 className="text-4xl font-black mb-6 leading-tight" style={{ fontFamily: "var(--font-serif)", color: "var(--color-text)" }}>
              Six stages. Six checkpoints.
              <br />
              <span style={{ color: "var(--color-accent)" }}>Zero unmonitored steps.</span>
            </h2>
          </Prose>

          <Prose delay={100} className="mb-14">
            <p className="text-lg leading-loose" style={{ color: "var(--color-muted)" }}>
              Here's the full pipeline — from the moment a payment failure comes in,
              to the moment a decision is written to the audit log — and every gate in between.
            </p>
          </Prose>

          <Reveal>
            <ArchitectureFlow />
          </Reveal>

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════ */}
      <footer className="relative mt-32 px-4 pb-16 text-center" style={{ zIndex: 1 }}>
        <div className="section-divider mb-16" />
        <Reveal>
          <div className="text-3xl font-black mb-3" style={{ fontFamily: "var(--font-serif)", color: "var(--color-text)" }}>
            Recover
          </div>
          <p className="text-sm mb-2" style={{ color: "var(--color-muted)", maxWidth: "380px", margin: "0 auto 0.5rem" }}>
            AI-powered payment recovery. Bounded by deterministic rules.
            Fully auditable. Never silent.
          </p>
          <p className="text-xs mt-6" style={{ color: "var(--color-faint)" }}>
            Built with FastAPI · React · Tailwind v4 · SQLite · All events are synthetic
          </p>
        </Reveal>
      </footer>
    </>
  );
}