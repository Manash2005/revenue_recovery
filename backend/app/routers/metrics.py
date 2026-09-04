"""Endpoints for audit logs and recovery summary metrics."""

from collections import Counter

from fastapi import APIRouter

from backend.app.services.compute_metrics import (
	RECOVERABLE_ACTIONS,
	calculate_metrics,
	load_audit_records,
	load_ground_truth,
)


router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/summary")
def get_metrics_summary() -> dict:
	"""Return evaluation and recovery summary metrics as JSON."""

	audit_records = load_audit_records()
	ground_truth = load_ground_truth()
	metrics = calculate_metrics(audit_records, ground_truth)

	action_breakdown = Counter(
		record["final_action"] for record in audit_records
	)

	recovery_opportunity_amount = sum(
		float(record["amount"])
		for record in audit_records
		if record["final_action"] in RECOVERABLE_ACTIONS
	)

	non_recoverable_events = metrics.true_negative + metrics.false_positive
	false_positive_rate = (
		metrics.false_positive / non_recoverable_events
		if non_recoverable_events
		else 0.0
	)

	rule_override_count = sum(
		1 for record in audit_records if record.get("rule_override")
	)

	return {
		"total_events": len(audit_records),
		"action_breakdown": dict(action_breakdown),
		"revenue_recovered": recovery_opportunity_amount,
		"false_positive_rate": false_positive_rate,
		"rule_override_count": rule_override_count,
		"classification": {
			"true_positive": metrics.true_positive,
			"true_negative": metrics.true_negative,
			"false_positive": metrics.false_positive,
			"false_negative": metrics.false_negative,
			"precision": metrics.precision,
			"recall": metrics.recall,
			"f1_score": metrics.f1_score,
		},
	}