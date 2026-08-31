"""SQLite table definitions for events and audit logs."""

import sqlite3
import json
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DB_PATH = PROJECT_ROOT / "data" / "synthetic_events.db"


def get_connection() -> sqlite3.Connection:
    """Create a connection to the SQLite database."""

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row

    return connection


def create_tables() -> None:
    """Create all application tables if they don't already exist."""

    connection = get_connection()

    # =====================================================
    # PAYMENT EVENTS
    # =====================================================

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS payment_events (
            event_id TEXT PRIMARY KEY,
            event_type TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            payment_id TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT NOT NULL,
            failure_reason TEXT NOT NULL,
            retry_count INTEGER,
            max_retries INTEGER NOT NULL,
            customer_history_depth INTEGER NOT NULL
        )
        """
    )

    # =====================================================
    # AUDIT RECORDS
    # =====================================================

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            timestamp TEXT NOT NULL,

            event_id TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            event_type TEXT NOT NULL,

            tool_calls TEXT NOT NULL,

            llm_action TEXT NOT NULL,
            llm_reasoning TEXT NOT NULL,
            llm_confidence REAL NOT NULL,

            final_action TEXT NOT NULL,

            amount REAL NOT NULL,

            rule_override TEXT,

            human_review_required INTEGER NOT NULL,

            FOREIGN KEY (event_id)
                REFERENCES payment_events(event_id)
        )
        """
    )

    connection.commit()
    connection.close()


def insert_event(event: dict) -> None:
    """Insert one synthetic payment event."""

    connection = get_connection()

    connection.execute(
        """
        INSERT INTO payment_events (
            event_id,
            event_type,
            timestamp,
            customer_id,
            payment_id,
            amount,
            currency,
            failure_reason,
            retry_count,
            max_retries,
            customer_history_depth
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            event["event_id"],
            event["event_type"],
            event["timestamp"],
            event["customer_id"],
            event["payment_id"],
            event["amount"],
            event["currency"],
            event["failure_reason"],
            event["retry_count"],
            event["max_retries"],
            event["customer_history_depth"],
        ),
    )

    connection.commit()
    connection.close()


def insert_audit_record(audit_record) -> None:
    """
    Insert one validated AuditRecord into the database.

    The structured tool calls and rule override are stored
    as JSON strings because SQLite does not have native
    list/dictionary columns.
    """

    connection = get_connection()

    connection.execute(
        """
        INSERT INTO audit_records (
            timestamp,
            event_id,
            customer_id,
            event_type,
            tool_calls,
            llm_action,
            llm_reasoning,
            llm_confidence,
            final_action,
            amount,
            rule_override,
            human_review_required
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            audit_record.timestamp.isoformat(),

            audit_record.event_id,
            audit_record.customer_id,
            audit_record.event_type,

            json.dumps(
                [
                    tool_call.model_dump()
                    for tool_call in audit_record.tool_calls
                ]
            ),

            audit_record.llm_proposal.action,
            audit_record.llm_proposal.reasoning,
            audit_record.llm_proposal.confidence,

            audit_record.final_action,

            audit_record.amount,

            (
                json.dumps(audit_record.rule_override.model_dump())
                if audit_record.rule_override
                else None
            ),

            int(audit_record.human_review_required),
        ),
    )

    connection.commit()
    connection.close()