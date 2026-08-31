"""Compute evaluation metrics from the agent audit log."""

import json
import sqlite3
from pathlib import Path

from backend.app.models.schemas import ClassificationMetrics


PROJECT_ROOT = Path(__file__).resolve().parents[3]

DB_PATH = PROJECT_ROOT / "data" / "synthetic_events.db"
GROUND_TRUTH_PATH = PROJECT_ROOT / "data" / "ground_truth.json"
EVALUATION_PATH = PROJECT_ROOT / "docs" / "evaluation_results.md"


RECOVERABLE_ACTIONS = {
    "retry",
    "send_reminder",
}

NON_RECOVERABLE_ACTIONS = {
    "escalate_to_human",
    "stop_pursuing",
}


def load_audit_records() -> list[dict]:
    """Read all records from the audit log."""

    with sqlite3.connect(DB_PATH) as connection:
        connection.row_factory = sqlite3.Row

        rows = connection.execute(
            """
            SELECT *
            FROM audit_records
            ORDER BY timestamp
            """
        ).fetchall()

    return [dict(row) for row in rows]


def load_ground_truth() -> dict[str, str]:
    """Load ground-truth records and index them by event ID."""

    with open(GROUND_TRUTH_PATH, "r") as file:
        records = json.load(file)

    if not isinstance(records, list):
        raise ValueError("ground_truth.json must contain a list of records.")

    ground_truth = {}
    for record in records:
        if not isinstance(record, dict):
            raise ValueError("Each ground-truth record must be an object.")

        event_id = record.get("event_id")
        action = record.get("ground_truth_action")

        if not event_id or action not in RECOVERABLE_ACTIONS | NON_RECOVERABLE_ACTIONS:
            raise ValueError(f"Invalid ground-truth record: {record}")

        ground_truth[event_id] = action

    return ground_truth


def is_recoverable(action: str) -> bool:
    """Convert the four-action decision into a binary outcome."""

    return action in RECOVERABLE_ACTIONS


def calculate_metrics(
    audit_records: list[dict],
    ground_truth: dict,
) -> ClassificationMetrics:
    """Compare agent decisions against ground truth."""

    true_positive = 0
    true_negative = 0
    false_positive = 0
    false_negative = 0

    false_positive_cost = 0.0
    false_negative_cost = 0.0

    rule_override_count = 0

    for record in audit_records:

        event_id = record["event_id"]

        if event_id not in ground_truth:
            print(
                f"Warning: no ground truth found for {event_id}"
            )
            continue

        agent_action = record["final_action"]
        truth_action = ground_truth[event_id]

        agent_recoverable = is_recoverable(agent_action)
        truth_recoverable = is_recoverable(truth_action)

        # ---------------------------------------------
        # Confusion matrix
        # ---------------------------------------------

        if agent_recoverable and truth_recoverable:
            true_positive += 1

        elif not agent_recoverable and not truth_recoverable:
            true_negative += 1

        elif agent_recoverable and not truth_recoverable:
            false_positive += 1

            false_positive_cost += float(
                record.get("amount", 0.0)
            )

        elif not agent_recoverable and truth_recoverable:
            false_negative += 1

            false_negative_cost += float(
                record.get("amount", 0.0)
            )

        # ---------------------------------------------
        # Rule override
        # ---------------------------------------------

        if record.get("rule_override"):
            rule_override_count += 1

    # ---------------------------------------------
    # Classification metrics
    # ---------------------------------------------

    precision_denominator = (
        true_positive + false_positive
    )

    recall_denominator = (
        true_positive + false_negative
    )

    precision = (
        true_positive / precision_denominator
        if precision_denominator
        else 0.0
    )

    recall = (
        true_positive / recall_denominator
        if recall_denominator
        else 0.0
    )

    f1_denominator = precision + recall

    f1_score = (
        2 * precision * recall / f1_denominator
        if f1_denominator
        else 0.0
    )

    return ClassificationMetrics(
        true_positive=true_positive,
        false_positive=false_positive,
        false_negative=false_negative,
        true_negative=true_negative,
        precision=precision,
        recall=recall,
        f1_score=f1_score,
        false_positive_cost=false_positive_cost,
        false_negative_cost=false_negative_cost,
    )

def save_metrics(
    metrics: ClassificationMetrics,
    output_path: Path,
) -> None:
    """Save evaluation results to a Markdown file."""

    total = (
        metrics.true_positive
        + metrics.true_negative
        + metrics.false_positive
        + metrics.false_negative
    )

    content = f"""# Evaluation Results

## Summary

**Total events evaluated:** {total}

## Confusion Matrix

| Metric | Count |
|---|---:|
| True Positives | {metrics.true_positive} |
| True Negatives | {metrics.true_negative} |
| False Positives | {metrics.false_positive} |
| False Negatives | {metrics.false_negative} |

## Classification Metrics

| Metric | Value |
|---|---:|
| Precision | {metrics.precision:.2%} |
| Recall | {metrics.recall:.2%} |
| F1 Score | {metrics.f1_score:.2%} |

## Error Cost

| Error Type | Cost |
|---|---:|
| False Positive Cost | {metrics.false_positive_cost:.2f} |
| False Negative Cost | {metrics.false_negative_cost:.2f} |

## Interpretation

The metrics above compare the agent's final actions against the
ground-truth labels generated for the synthetic evaluation dataset.

False positives represent cases where the agent classified a payment
as recoverable when the ground truth considered it non-recoverable.

False negatives represent cases where the agent classified a payment
as non-recoverable when the ground truth considered it recoverable.

False-positive cost is particularly important because allowing an
incorrect recovery action can create greater financial or operational
risk than unnecessarily stopping or escalating a payment.
"""

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(content, encoding="utf-8")

    print(f"\nEvaluation results saved to:")
    print(output_path)

def main():
    print("\n=== Revenue Recovery Agent — Metrics ===")

    audit_records = load_audit_records()
    ground_truth = load_ground_truth()

    print(f"Audit records: {len(audit_records)}")
    print(f"Ground-truth labels: {len(ground_truth)}")

    metrics = calculate_metrics(
        audit_records=audit_records,
        ground_truth=ground_truth,
    )

    save_metrics(
        metrics=metrics,
        output_path=EVALUATION_PATH,
    )


if __name__ == "__main__":
    main()
