"""Run the revenue recovery agent across the synthetic event dataset."""

import sqlite3
from pathlib import Path
from backend.app.agent.decision_engine import run_agent
from backend.app.services.audit_logger import log_decision


PROJECT_ROOT = Path(__file__).resolve().parents[3]

DB_PATH = PROJECT_ROOT / "data" / "synthetic_events.db"


BATCH_SIZE = 20


def load_events() -> list[dict]:
    """Load only the configured batch size from SQLite."""

    with sqlite3.connect(DB_PATH) as connection:
        connection.row_factory = sqlite3.Row

        rows = connection.execute(
            """
            SELECT *
            FROM payment_events
            ORDER BY timestamp
            LIMIT ?
            """,
            (BATCH_SIZE,),
        ).fetchall()

    return [dict(row) for row in rows]

def run_batch(events: list[dict]) -> list:
    """Run the recovery agent on every event."""

    results = []

    for index, event in enumerate(events, start=1):
        print(f"\n{'=' * 60}")
        print(f"Processing event {index}/{len(events)}")
        print(f"Event ID: {event['event_id']}")
        print(f"{'=' * 60}")

        try:
            decision = run_agent(event)

            audit_record = log_decision(
                event=event,
                llm_proposal=decision.llm_proposal,
                final_decision=decision.final_decision,
                tool_calls=decision.tool_calls,
                rule_override=decision.rule_override,
                human_review_required=decision.human_review_required,
            )

            results.append({
                "event": event,
                "decision": decision,
                "audit_record": audit_record,
            })

            print("\nDecision:")
            print("Action:", decision.final_decision.action)
            print("Confidence:", decision.final_decision.confidence)

        except Exception as error:
            print("\nAgent failed:")
            print(error)

    return results

def main():
    events = load_events()

    print(f"Loaded {len(events)} events.")

    results = run_batch(events)

    print("\n" + "=" * 60)
    print("BATCH COMPLETE")
    print("=" * 60)

    print(f"Events loaded: {len(events)}")
    print(f"Successful decisions: {len(results)}")


if __name__ == "__main__":
    main()
