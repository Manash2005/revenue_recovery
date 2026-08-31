"""Deterministic guardrails and stopping rules."""

from __future__ import annotations

from backend.app.models.schemas import (
    RecoveryDecision,
    RuleOverride,
)


VALID_ACTIONS = {
    "retry",
    "send_reminder",
    "escalate_to_human",
    "stop_pursuing",
}


def evaluate_guardrails(
    event: dict,
    decision: RecoveryDecision,
) -> tuple[RecoveryDecision, RuleOverride | None, bool]:
    """
    Apply deterministic guardrails to an LLM proposal.

    Returns:
        final_decision
        rule_override
        human_review_required
    """

    if decision.action not in VALID_ACTIONS:
        raise ValueError(
            f"Unsupported recovery action: {decision.action}"
        )

    retry_count = int(event.get("retry_count", 0))
    max_retries = int(event.get("max_retries", 0))
    amount = float(event.get("amount", 0.0))
    history_depth = int(
        event.get("customer_history_depth", 0)
    )

    # =====================================================
    # RULE 1: RETRY LIMIT
    # =====================================================

    if (
        decision.action == "retry"
        and retry_count >= max_retries
    ):
        final_decision = RecoveryDecision(
            action="escalate_to_human",
            reasoning=(
                "Guardrail: retry_count is already at or "
                "above max_retries; automatic retry is "
                "not allowed."
            ),
            confidence=min(
                float(decision.confidence),
                0.95,
            ),
        )

        override = RuleOverride(
            rule="MAX_RETRIES",
            reason=(
                "Retry limit has been reached. "
                "Automatic retry is not permitted."
            ),
        )

        return final_decision, override, True

    # =====================================================
    # RULE 2: HIGH-VALUE PAYMENT
    # =====================================================

    if (
        amount > 1000
        and decision.action
        in {"retry", "send_reminder"}
    ):
        final_decision = RecoveryDecision(
            action="escalate_to_human",
            reasoning=(
                "Guardrail: high-value payment exceeds "
                "automatic recovery limits; human review "
                "is required."
            ),
            confidence=min(
                float(decision.confidence),
                0.98,
            ),
        )

        override = RuleOverride(
            rule="HIGH_VALUE_PAYMENT",
            reason=(
                "Transaction amount exceeds the "
                "automatic recovery limit."
            ),
        )

        return final_decision, override, True

    # =====================================================
    # RULE 3: INSUFFICIENT CUSTOMER HISTORY
    # =====================================================

    if (
        history_depth == 0
        and decision.action == "retry"
    ):
        final_decision = RecoveryDecision(
            action="send_reminder",
            reasoning=(
                "Guardrail: insufficient customer history "
                "means automatic retry is unsafe; "
                "prefer a reminder instead."
            ),
            confidence=min(
                float(decision.confidence),
                0.93,
            ),
        )

        override = RuleOverride(
            rule="INSUFFICIENT_HISTORY",
            reason=(
                "Customer has insufficient history "
                "for an automatic retry."
            ),
        )

        return final_decision, override, False

    # =====================================================
    # NO OVERRIDE
    # =====================================================

    return decision, None, False