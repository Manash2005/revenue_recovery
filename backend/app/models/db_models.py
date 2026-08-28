"""SQLite table definitions."""
# db_models.py

import sqlite3
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DB_PATH = PROJECT_ROOT / "data" / "synthetic_events.db"


def get_connection() -> sqlite3.Connection:
    """
    Create a connection to the SQLite database.
    """

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(DB_PATH)

    connection.row_factory = sqlite3.Row

    return connection


def create_tables() -> None:
    """
    Create the synthetic events table if it doesn't exist.
    """

    connection = get_connection()

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

    connection.commit()
    connection.close()


def insert_event(event: dict) -> None:
    """
    Insert one synthetic payment event.
    """

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