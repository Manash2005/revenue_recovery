"""Endpoints for viewing recovery audit records."""

import json
import sqlite3

from fastapi import APIRouter, HTTPException

from backend.app.models.db_models import DB_PATH


router = APIRouter(tags=["events"])


def _serialize_audit_row(row: sqlite3.Row) -> dict:
	"""Convert a database row into a dashboard-friendly response."""

	record = dict(row)

	tool_calls = json.loads(record["tool_calls"])
	rule_override = (
		json.loads(record["rule_override"])
		if record["rule_override"]
		else None
	)

	return {
		"id": record["id"],
		"timestamp": record["timestamp"],
		"event": {
			"event_id": record["event_id"],
			"event_type": record["event_type"],
			"customer_id": record["customer_id"],
			"payment_id": record["payment_id"],
			"amount": record["amount"],
			"currency": record["currency"],
			"failure_reason": record["failure_reason"],
			"retry_count": record["retry_count"],
			"max_retries": record["max_retries"],
			"customer_history_depth": record["customer_history_depth"],
		},
		"llm_proposal": {
			"action": record["llm_action"],
			"reasoning": record["llm_reasoning"],
			"confidence": record["llm_confidence"],
		},
		"tool_calls": tool_calls,
		"rule_override": rule_override,
		"final_action": record["final_action"],
		"human_review_required": bool(record["human_review_required"]),
	}


def _fetch_audit_rows(event_id: str | None = None) -> list[sqlite3.Row]:
	"""Fetch audit records with their corresponding payment event details."""

	query = """
		SELECT
			audit_records.*,
			payment_events.payment_id,
			payment_events.amount AS event_amount,
			payment_events.currency,
			payment_events.failure_reason,
			payment_events.retry_count,
			payment_events.max_retries,
			payment_events.customer_history_depth
		FROM audit_records
		JOIN payment_events
			ON payment_events.event_id = audit_records.event_id
	"""
	parameters = ()

	if event_id is not None:
		query += " WHERE audit_records.event_id = ?"
		parameters = (event_id,)

	query += " ORDER BY audit_records.timestamp DESC"

	with sqlite3.connect(DB_PATH) as connection:
		connection.row_factory = sqlite3.Row
		return connection.execute(query, parameters).fetchall()


@router.get("/audit-log")
def get_audit_log() -> list[dict]:
	"""Return all logged decisions."""

	return [_serialize_audit_row(row) for row in _fetch_audit_rows()]


@router.get("/audit-log/{event_id}")
def get_audit_record(event_id: str) -> dict:
	"""Return the latest logged decision for one event."""

	rows = _fetch_audit_rows(event_id)
	if not rows:
		raise HTTPException(
			status_code=404,
			detail=f"No audit record found for {event_id}",
		)

	return _serialize_audit_row(rows[0])


@router.get("/failure-case")
def get_failure_case() -> dict:
	"""
	Return a structured description of the agent's graceful failure handling.

	This describes what happens when the model repeatedly violates the
	RecoveryDecision schema — the agent retries once then raises a
	ValueError with a safe default rather than silently skipping or crashing.
	"""
	return {
		"title": "Schema Violation — Graceful Fallback",
		"what_went_wrong": (
			"During a batch run the LLM returned free-form text instead of "
			"the required JSON RecoveryDecision schema (action / reasoning / confidence). "
			"This can happen when the model adds explanation prose or wraps its "
			"answer in markdown code fences without a clean JSON body."
		),
		"agent_behaviour": (
			"The decision engine detected the malformed response, issued one "
			"corrective re-prompt, and — if the second attempt also failed — "
			"raised a ValueError with a clear diagnostic message. "
			"The batch_runner caught the exception, logged the failure to stdout, "
			"and continued processing the remaining events. "
			"No partial or unvalidated action was ever written to the audit log."
		),
		"safe_default": "skip — event excluded from audit log; no financial action taken",
		"why_correct": (
			"In a money-handling system, acting on a malformed or ambiguous "
			"decision is more dangerous than skipping it. "
			"The guardrails (rules.py) are the last gate before any action reaches "
			"a customer; if the LLM cannot produce a valid proposal, the rules layer "
			"never runs and nothing is executed. "
			"The event remains in the database and can be reprocessed or escalated "
			"manually — no revenue opportunity is permanently lost."
		),
		"guard_mechanism": "decision_engine.py — _parse_final_decision() with invalid_attempts < 2 retry cap",
		"schema_enforced": "RecoveryDecision(action: Literal['retry','send_reminder','escalate_to_human','stop_pursuing'], reasoning: str, confidence: float 0–1)",
	}