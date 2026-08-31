""" Pydantic schemas for payment recovery agent """

from typing import Literal
from pydantic import BaseModel, Field
from datetime import datetime

#Event Schemas

class PaymentFailedEvent(BaseModel):
    """Event that triggers the revenue recovery workflow."""

    event_id: str = Field(min_length=1)

    event_type: Literal["payment_failed"] = "payment_failed"

    timestamp: datetime

    customer_id: str = Field(min_length=1)

    payment_id: str = Field(min_length=1)

    amount: float = Field(gt=0)

    currency: str = Field(
        min_length=3,
        max_length=3,
    )

    failure_reason: str = Field(min_length=1)

    retry_count: int | None = Field(
        default=None,
        ge=0,
    )

    max_retries: int = Field(
        ge=0,
    )

    customer_history_depth: int = Field(
        ge=0,
    )


#Decision Schema

class RecoveryDecision(BaseModel):
    """ Structured action proposed by the LLM """

    action : Literal[
        "retry",
        "send_reminder",
        "escalate_to_human",
        "stop_pursuing"
    ]

    reasoning : str = Field(min_length=1)

    confidence : float = Field(ge=0.0, le=1.0)

#Tool Call Schema

class ToolCallRecord(BaseModel):
    """ Records a tool called by the agent """ 
    
    tool_name : str = Field(min_length=1)
    arguments : dict
    result : dict

#Rule Override Schema

class RuleOverride(BaseModel):
    """ Records when the deterministic rules engine changes or rejects the LLM's proposal. """
    
    rule: str = Field(min_length=1)
    reason: str = Field(min_length=1)

#Audit Log Schema

class AuditRecord(BaseModel):
    """ Complete record of one agent decision """

    timestamp : datetime

    event_id : str = Field(min_length=1)
    customer_id : str = Field(min_length=1)
    event_type : Literal["payment_failed"]

    tool_calls : list[ToolCallRecord]

    llm_proposal : RecoveryDecision

    final_action : Literal[
        "retry",
        "send_reminder",
        "escalate_to_human",
        "stop_pursuing"
    ]

    rule_override : RuleOverride | None = None

    amount: float = Field(gt=0)

    human_review_required : bool

#Metrics Schema

class ClassificationMetrics(BaseModel):
    """ Classification metrics for evaluating agents decisions """

    true_positive : int = Field(ge=0)
    false_positive : int = Field(ge=0)
    false_negative : int = Field(ge=0)
    true_negative : int = Field(ge=0)

    precision: float = Field(
        ge=0.0,
        le=1.0,
    )

    recall: float = Field(
        ge=0.0,
        le=1.0,
    )

    f1_score: float = Field(
        ge=0.0,
        le=1.0,
    )

    false_positive_cost: float = Field(
        ge=0.0
    )

    false_negative_cost: float = Field(
        ge=0.0
    )

class AgentResult(BaseModel):
    """Complete result of one agent execution."""

    llm_proposal: RecoveryDecision

    final_decision: RecoveryDecision

    tool_calls: list[ToolCallRecord]

    rule_override: RuleOverride | None = None

    human_review_required: bool = False