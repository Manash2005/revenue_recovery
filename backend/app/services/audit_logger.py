"""Audit logging for revenue recovery agent decisions."""

from datetime import datetime

from backend.app.models.schemas import (
    AuditRecord,
    RecoveryDecision,
    ToolCallRecord,
    RuleOverride,
)
from backend.app.models.db_models import (
    create_tables,
    insert_audit_record,
)


def log_decision(
    event: dict,
    llm_proposal: RecoveryDecision,
    final_decision: RecoveryDecision,
    tool_calls: list[ToolCallRecord],
    rule_override: RuleOverride | None = None,
    human_review_required: bool = False,
) -> AuditRecord:
    """
    Create, validate, and persist an audit record
    for one agent decision.

    Parameters
    ----------
    event:
        The payment event being processed.

    llm_proposal:
        The action proposed by the LLM before guardrails.

    final_decision:
        The action that the system ultimately allowed.

    tool_calls:
        All tools called during the agent run.

    rule_override:
        Information about a deterministic rule that changed
        the LLM's proposed action.

    human_review_required:
        Whether a human must review this case.

    Returns
    -------
    AuditRecord
        The validated audit record.
    """

    # -----------------------------------------------------
    # Create the audit record
    # -----------------------------------------------------

    audit_record = AuditRecord(
        timestamp=datetime.now(),

        event_id=event["event_id"],

        customer_id=event["customer_id"],

        event_type=event["event_type"],

        tool_calls=tool_calls,

        llm_proposal=llm_proposal,

        final_action=final_decision.action,

        rule_override=rule_override,

        amount=float(event["amount"]),

        human_review_required=human_review_required,
    )

    # -----------------------------------------------------
    # Persist the record
    # -----------------------------------------------------

    create_tables()

    insert_audit_record(audit_record)

    return audit_record