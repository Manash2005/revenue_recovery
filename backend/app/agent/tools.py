"""Read-only tools available to the recovery decision engine."""

import sqlite3
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DB_PATH = PROJECT_ROOT / "data" / "synthetic_events.db"


def get_customer_history(customer_id: str, payment_id: str | None = None, event_id: str | None = None) -> dict:
    """Return the customer's history information for the relevant payment event."""

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row

        query = """
            SELECT
                customer_id,
                customer_history_depth,
                payment_id,
                event_id
            FROM payment_events
            WHERE customer_id = ?
        """
        params: list[object] = [customer_id]

        if payment_id is not None:
            query += " AND payment_id = ?"
            params.append(payment_id)
        elif event_id is not None:
            query += " AND event_id = ?"
            params.append(event_id)

        query += " ORDER BY timestamp DESC LIMIT 1"

        row = conn.execute(query, tuple(params)).fetchone()

    if row is None:
        return {
            "customer_id": customer_id,
            "found": False,
        }

    return {
        "customer_id": row["customer_id"],
        "found": True,
        "customer_history_depth": row["customer_history_depth"],
        "payment_id": row["payment_id"],
        "event_id": row["event_id"],
    }


def get_retry_attempts(customer_id: str, payment_id: str | None = None, event_id: str | None = None) -> dict:
    """Return the current retry information for the specific payment event."""

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row

        query = """
            SELECT
                customer_id,
                retry_count,
                max_retries,
                payment_id,
                event_id
            FROM payment_events
            WHERE customer_id = ?
        """
        params: list[object] = [customer_id]

        if payment_id is not None:
            query += " AND payment_id = ?"
            params.append(payment_id)
        elif event_id is not None:
            query += " AND event_id = ?"
            params.append(event_id)

        query += " ORDER BY timestamp DESC LIMIT 1"

        row = conn.execute(query, tuple(params)).fetchone()

    if row is None:
        return {
            "customer_id": customer_id,
            "found": False,
        }

    return {
        "customer_id": row["customer_id"],
        "found": True,
        "retry_count": row["retry_count"],
        "max_retries": row["max_retries"],
        "payment_id": row["payment_id"],
        "event_id": row["event_id"],
    }


def get_payment_failure_info(customer_id: str, payment_id: str | None = None, event_id: str | None = None) -> dict:
    """Return the current failure information for the specific payment event."""

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row

        query = """
            SELECT
                customer_id,
                payment_id,
                amount,
                currency,
                failure_reason,
                event_id
            FROM payment_events
            WHERE customer_id = ?
        """
        params: list[object] = [customer_id]

        if payment_id is not None:
            query += " AND payment_id = ?"
            params.append(payment_id)
        elif event_id is not None:
            query += " AND event_id = ?"
            params.append(event_id)

        query += " ORDER BY timestamp DESC LIMIT 1"

        row = conn.execute(query, tuple(params)).fetchone()

    if row is None:
        return {
            "customer_id": customer_id,
            "found": False,
        }

    return {
        "customer_id": row["customer_id"],
        "found": True,
        "payment_id": row["payment_id"],
        "amount": row["amount"],
        "currency": row["currency"],
        "failure_reason": row["failure_reason"],
        "event_id": row["event_id"],
    }