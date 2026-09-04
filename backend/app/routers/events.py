"""Endpoints for viewing recovery audit records."""

import json
import queue
import sqlite3
import threading
from collections.abc import Generator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from backend.app.agent.decision_engine import run_agent
from backend.app.models.db_models import DB_PATH
from backend.app.services.audit_logger import log_decision
from backend.app.services.compute_metrics import is_recoverable, load_ground_truth


router = APIRouter(tags=["events"])


def _event_from_row(row: sqlite3.Row) -> dict:
	"""Convert a payment event row into a complete API object."""

	return {
		"event_id": row["event_id"],
		"event_type": row["event_type"],
		"timestamp": row["timestamp"],
		"customer_id": row["customer_id"],
		"payment_id": row["payment_id"],
		"amount": row["amount"],
		"currency": row["currency"],
		"failure_reason": row["failure_reason"],
		"retry_count": row["retry_count"],
		"max_retries": row["max_retries"],
		"customer_history_depth": row["customer_history_depth"],
	}


def _fetch_event(event_id: str) -> tuple[dict, bool]:
	"""Fetch one payment event and whether it has an audit record."""

	with sqlite3.connect(DB_PATH) as connection:
		connection.row_factory = sqlite3.Row
		row = connection.execute(
			"""
			SELECT payment_events.*, audit_records.id AS audit_id
			FROM payment_events
			LEFT JOIN audit_records
				ON audit_records.event_id = payment_events.event_id
			WHERE payment_events.event_id = ?
			ORDER BY audit_records.timestamp DESC
			LIMIT 1
			""",
			(event_id,),
		).fetchone()

	if row is None:
		raise HTTPException(status_code=404, detail=f"Event not found: {event_id}")

	return _event_from_row(row), row["audit_id"] is not None


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


@router.get("/events")
def get_events() -> list[dict]:
	"""Return every payment event with its current audit status."""

	with sqlite3.connect(DB_PATH) as connection:
		connection.row_factory = sqlite3.Row
		rows = connection.execute(
			"""
			SELECT payment_events.*, audit_records.id AS audit_id
			FROM payment_events
			LEFT JOIN audit_records
				ON audit_records.event_id = payment_events.event_id
			ORDER BY payment_events.timestamp DESC
			"""
		).fetchall()

	return [
		{
			**_event_from_row(row),
			"audited": row["audit_id"] is not None,
		}
		for row in rows
	]


@router.get("/events/{event_id}")
def get_event(event_id: str) -> dict:
	"""Return one complete event and its audit status."""

	event, audited = _fetch_event(event_id)
	return {"event": event, "audited": audited}


def _sse_message(message: str, **payload: object) -> str:
	"""Format one friendly server-sent event message."""

	return f"data: {json.dumps({'message': message, **payload})}\n\n"


def _evaluation_category(final_action: str, truth_action: str | None) -> str:
	"""Classify a decision using the evaluator's binary outcome rules."""

	if truth_action is None:
		return "unlabeled"

	predicted_recoverable = is_recoverable(final_action)
	truth_recoverable = is_recoverable(truth_action)

	if predicted_recoverable and truth_recoverable:
		return "true_positive"
	if not predicted_recoverable and not truth_recoverable:
		return "true_negative"
	if predicted_recoverable:
		return "false_positive"
	return "false_negative"


def _run_single_event(event_id: str) -> Generator[str, None, None]:
	"""Evaluate one event and stream user-facing progress updates."""

	updates = queue.Queue()
	completed = object()

	try:
		event, audited = _fetch_event(event_id)
		yield _sse_message(
			"Event loaded. Preparing a single-event evaluation.",
			stage="loaded",
			event=event,
			audited=audited,
		)
		yield _sse_message(
			"Running the decision engine and checking recovery tools.",
			stage="running",
		)

		def evaluate() -> None:
			try:
				result = run_agent(
					event,
					progress_callback=lambda update: updates.put(update),
				)
				updates.put({"stage": "guardrails", "message": "Decision received; guardrails have been applied."})
				updates.put({"stage": "result", "result": result})
			except Exception as error:
				updates.put({"stage": "error", "error": str(error)})
			finally:
				updates.put(completed)

		threading.Thread(target=evaluate, daemon=True).start()
		while True:
			update = updates.get()
			if update is completed:
				break
			if update.get("stage") == "result":
				result = update["result"]
				break
			if update.get("stage") == "error":
				raise RuntimeError(update["error"])
			yield _sse_message(update["message"], **{key: value for key, value in update.items() if key != "message"})

		if not audited:
			log_decision(
				event=event,
				llm_proposal=result.llm_proposal,
				final_decision=result.final_decision,
				tool_calls=result.tool_calls,
				rule_override=result.rule_override,
				human_review_required=result.human_review_required,
			)

		ground_truth_action = load_ground_truth().get(event_id)
		category = _evaluation_category(
			result.final_decision.action,
			ground_truth_action,
		)

		result_payload = {
			"event": event,
			"audited_before_run": audited,
			"audited": True,
			"audit_saved": not audited,
			"llm_proposal": result.llm_proposal.model_dump(),
			"tool_calls": [call.model_dump() for call in result.tool_calls],
			"rule_override": result.rule_override.model_dump() if result.rule_override else None,
			"final_decision": result.final_decision.model_dump(),
			"ground_truth_action": ground_truth_action,
			"evaluation_category": category,
			"human_review_required": result.human_review_required,
			"audit_id": _latest_audit_id(event_id),
		}
		yield _sse_message(
			"Evaluation complete. The decision trace was saved to the audit log.",
			stage="complete",
			result=result_payload,
		)
	except Exception as error:
		yield _sse_message(
			"Evaluation could not be completed. No unvalidated decision was saved.",
			stage="error",
			error=str(error),
		)


def _latest_audit_id(event_id: str) -> int | None:
	"""Return the database ID for the latest saved audit record."""

	with sqlite3.connect(DB_PATH) as connection:
		row = connection.execute(
			"""
			SELECT id
			FROM audit_records
			WHERE event_id = ?
			ORDER BY id DESC
			LIMIT 1
			""",
			(event_id,),
		).fetchone()

	return row[0] if row else None


@router.post("/single-event/{event_id}")
def evaluate_single_event(event_id: str) -> StreamingResponse:
	"""Run one selected event and stream readable progress messages."""

	return StreamingResponse(
		_run_single_event(event_id),
		media_type="text/event-stream",
		headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
	)


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