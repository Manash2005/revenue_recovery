"""Generate synthetic payment and subscription recovery events."""


import json
import random
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.models.db_models import create_tables, insert_event


# =========================================================
# CONFIGURATION
# =========================================================

NUM_EVENTS = 200

MAX_RETRIES = 3

GROUND_TRUTH_PATH = PROJECT_ROOT / "data" / "ground_truth.json"

FAILURE_REASONS = [
    "insufficient_funds",
    "expired_card",
    "card_declined",
    "network_error",
    "bank_declined",
]

CURRENCIES = ["INR"]


# =========================================================
# CONTROLLED RANDOMNESS
# =========================================================

def weighted_choice(options):
    """
    Select an option using deliberately controlled probabilities.
    """

    values = [item[0] for item in options]
    weights = [item[1] for item in options]

    return random.choices(
        values,
        weights=weights,
        k=1,
    )[0]


def generate_retry_count() -> int:
    """
    Generate retry counts with realistic distribution.

    Most customers have fewer retries.
    Reaching the maximum is less common.
    """

    return weighted_choice(
        [
            (0, 35),
            (1, 30),
            (2, 25),
            (3, 10),
        ]
    )


def generate_amount() -> float:
    """
    Generate transaction amounts with a deliberate mix
    of normal and high-value transactions.
    """

    amount_type = weighted_choice(
        [
            ("small", 50),
            ("medium", 35),
            ("high", 15),
        ]
    )

    if amount_type == "small":
        return round(
            random.uniform(100, 500),
            2,
        )

    if amount_type == "medium":
        return round(
            random.uniform(500, 1000),
            2,
        )

    return round(
        random.uniform(1001, 5000),
        2,
    )


def generate_history_depth() -> int:
    """
    Generate customer history depth.

    Some customers are new.
    Others have substantial historical activity.
    """

    return weighted_choice(
        [
            (0, 15),
            (1, 15),
            (3, 25),
            (5, 25),
            (10, 15),
            (20, 5),
        ]
    )


def generate_failure_reason() -> str:
    """
    Generate a failure reason using controlled probabilities.
    """

    return weighted_choice(
        [
            ("insufficient_funds", 30),
            ("card_declined", 25),
            ("expired_card", 15),
            ("network_error", 20),
            ("bank_declined", 10),
        ]
    )


# =========================================================
# GROUND TRUTH
# =========================================================

def calculate_ground_truth(
    retry_count: int,
    amount: float,
    failure_reason: str,
    history_depth: int,
) -> str:
    """
    Deterministic business rules used to create
    the independent answer key.

    IMPORTANT:
    The LLM does NOT generate this label.
    """

    # Rule 1:
    # Maximum retries reached.
    if retry_count >= MAX_RETRIES:
        return "escalate_to_human"

    # Rule 2:
    # High-value transaction requires human review.
    if amount > 1000:
        return "escalate_to_human"

    # Rule 3:
    # Very limited customer history.
    if history_depth == 0:
        return "send_reminder"

    # Rule 4:
    # Insufficient funds may be temporary.
    if failure_reason == "insufficient_funds":
        return "send_reminder"

    # Rule 5:
    # Network errors are reasonable retry candidates.
    if failure_reason == "network_error":
        return "retry"

    # Rule 6:
    # Other failures can be retried while below the limit.
    return "retry"


# =========================================================
# EVENT GENERATION
# =========================================================

def generate_event(index: int) -> tuple[dict, str]:
    """
    Generate one payment_failed event and its ground truth.
    """

    event_id = f"evt_{index:04d}"

    customer_id = f"CUS{random.randint(1, 1000):04d}"

    payment_id = f"PAY{uuid.uuid4().hex[:8].upper()}"

    retry_count = generate_retry_count()

    amount = generate_amount()

    failure_reason = generate_failure_reason()

    history_depth = generate_history_depth()

    # Generate timestamps over approximately the
    # previous 30 days.
    timestamp = (
        datetime.now()
        - timedelta(
            days=random.randint(0, 30),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59),
        )
    ).isoformat()

    event = {
        "event_id": event_id,
        "event_type": "payment_failed",
        "timestamp": timestamp,
        "customer_id": customer_id,
        "payment_id": payment_id,
        "amount": amount,
        "currency": random.choice(CURRENCIES),
        "failure_reason": failure_reason,
        "retry_count": retry_count,
        "max_retries": MAX_RETRIES,
        "customer_history_depth": history_depth,
    }

    ground_truth = calculate_ground_truth(
        retry_count=retry_count,
        amount=amount,
        failure_reason=failure_reason,
        history_depth=history_depth,
    )

    return event, ground_truth


# =========================================================
# GROUND TRUTH FILE
# =========================================================

def save_ground_truth(records: list[dict]) -> None:
    """
    Save the independent answer key.
    """

    GROUND_TRUTH_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with GROUND_TRUTH_PATH.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            records,
            file,
            indent=2,
        )


# =========================================================
# MAIN
# =========================================================

def main():

    print("\n=== Synthetic Data Generator ===\n")

    # Create database/table.
    create_tables()

    ground_truth_records = []

    for index in range(1, NUM_EVENTS + 1):

        event, ground_truth = generate_event(index)

        # Insert event into SQLite.
        insert_event(event)

        # Store ONLY the information needed
        # to evaluate the agent later.
        ground_truth_records.append(
            {
                "event_id": event["event_id"],
                "ground_truth_action": ground_truth,
            }
        )

    # Save independent answer key.
    save_ground_truth(ground_truth_records)

    print(f"Generated {NUM_EVENTS} events.")

    print(f"Database: {PROJECT_ROOT / 'data' / 'synthetic_events.db'}")

    print(
        f"Ground truth: {GROUND_TRUTH_PATH}"
    )

    # Show a small sample.
    print("\nFirst 5 ground-truth labels:")

    for record in ground_truth_records[:5]:
        print(
            record["event_id"],
            "->",
            record["ground_truth_action"],
        )


if __name__ == "__main__":
    main()