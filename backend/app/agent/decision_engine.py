"""OpenRouter-backed decision engine and tool-loop orchestration."""

import json
import os
import re
import sqlite3
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import ValidationError

from backend.app.agent.prompts import SYSTEM_PROMPT, build_event_prompt
from backend.app.agent.rules import evaluate_guardrails
from backend.app.agent.tools import (
    get_customer_history,
    get_payment_failure_info,
    get_retry_attempts,
)
from backend.app.models.schemas import (
    RecoveryDecision,
    ToolCallRecord,
    RuleOverride,
    AgentResult,
)
from backend.app.services.audit_logger import log_decision


# =========================================================
# SETUP
# =========================================================

load_dotenv()

MODEL = os.getenv("OPENROUTER_MODEL") or "openrouter/free"
PROJECT_ROOT = Path(__file__).resolve().parents[3]
DB_PATH = PROJECT_ROOT / "data" / "synthetic_events.db"

api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENROUTER_KEY")
if not api_key:
    raise ValueError("OPENROUTER_API_KEY or OPENROUTER_KEY is not set.")

client = OpenAI(
    api_key=api_key,
    base_url="https://openrouter.ai/api/v1",
    default_headers={
        "HTTP-Referer": "https://localhost",
        "X-Title": "Revenue Recovery Agent",
    },
)


# =========================================================
# TOOL DEFINITIONS
# =========================================================

TOOL_FUNCTIONS = {
    "get_customer_history": get_customer_history,
    "get_retry_attempts": get_retry_attempts,
    "get_payment_failure_info": get_payment_failure_info,
}

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_customer_history",
            "description": "Return a customer's prior payment history relevant to the event.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {"type": "string"},
                    "payment_id": {"type": ["string", "null"]},
                    "event_id": {"type": ["string", "null"]},
                },
                "required": ["customer_id"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_retry_attempts",
            "description": "Return the retry count and max retries for the customer's latest relevant payment event.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {"type": "string"},
                    "payment_id": {"type": ["string", "null"]},
                    "event_id": {"type": ["string", "null"]},
                },
                "required": ["customer_id"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_payment_failure_info",
            "description": "Return the latest failure details for the customer's relevant payment event.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {"type": "string"},
                    "payment_id": {"type": ["string", "null"]},
                    "event_id": {"type": ["string", "null"]},
                },
                "required": ["customer_id"],
                "additionalProperties": False,
            },
        },
    },
]


# =========================================================
# LOAD ONE EVENT
# =========================================================

def load_one_event() -> dict:
    """
    Load one event from the SQLite database.
    """

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row

        row = conn.execute(
            """
            SELECT *
            FROM payment_events
            ORDER BY RANDOM()
            LIMIT 1
            """
        ).fetchone()

    if row is None:
        raise ValueError("No events found in database.")

    return dict(row)


# =========================================================
# FINAL DECISION PARSER
# =========================================================

def _parse_final_decision(content: str) -> RecoveryDecision:
    """Parse a JSON decision returned by the model."""

    if not content:
        raise ValueError("Model returned no final decision content.")

    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.IGNORECASE)
        cleaned = cleaned.strip()

    try:
        payload = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError("Model did not return valid JSON for the final RecoveryDecision.") from exc

    try:
        return RecoveryDecision.model_validate(payload)
    except ValidationError as exc:
        raise ValueError(f"Invalid RecoveryDecision payload: {payload}") from exc


# =========================================================
# TOOL ARGUMENT NORMALIZATION
# =========================================================

def _normalize_tool_arguments(raw_args):
    """Remove empty values from tool arguments before calling a Python tool."""
    if not isinstance(raw_args, dict):
        return {}

    normalized = {}
    for key, value in raw_args.items():
        if value is None:
            continue
        if isinstance(value, dict) and not value:
            continue
        if isinstance(value, list) and not value:
            continue
        normalized[key] = value
    return normalized


# =========================================================
# RUN AGENT
# =========================================================

def run_agent(event: dict) -> AgentResult:
    """
    Run the bounded tool-using decision loop.
    """

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": build_event_prompt(event)},
    ]

    tool_call_records = []
    invalid_attempts = 0

    while True:
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.2,
        )

        choice = response.choices[0]
        message = choice.message

        print("\n--- LLM RESPONSE ---")
        print(message)

        if message.tool_calls:
            for tool_call in message.tool_calls:
                tool_name = tool_call.function.name
                print("\n--- TOOL CALL ---")
                print("Tool:", tool_name)

                if tool_name not in TOOL_FUNCTIONS:
                    raise ValueError(f"Unknown tool requested: {tool_name}")

                try:
                    raw_arguments = json.loads(tool_call.function.arguments)
                except json.JSONDecodeError as exc:
                    raise ValueError(f"Tool arguments for {tool_name} were not valid JSON.") from exc

                arguments = _normalize_tool_arguments(raw_arguments)
                result = TOOL_FUNCTIONS[tool_name](**arguments)

                tool_call_records.append(
                    ToolCallRecord(
                        tool_name=tool_name,
                        arguments=arguments,
                        result=result,
                    )
                )

                print("Arguments:", arguments)
                print("Tool result:", result)

                messages.append({
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [{
                        "id": tool_call.id,
                        "type": "function",
                        "function": {
                            "name": tool_name,
                            "arguments": tool_call.function.arguments,
                        },
                    }],
                })
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": tool_name,
                    "content": json.dumps({"result": result}),
                })

            continue

        content = message.content or ""

        try:
            decision = _parse_final_decision(content)
        except ValueError as exc:
            invalid_attempts += 1
            if invalid_attempts >= 2:
                raise ValueError(
                    "Model repeatedly violated the RecoveryDecision schema. "
                    "It must return only JSON with action/reasoning/confidence and "
                    "action must be one of retry, send_reminder, escalate_to_human, stop_pursuing."
                ) from exc

            messages.append({
                "role": "user",
                "content": (
                    "Your previous answer was invalid. Return ONLY valid JSON with exactly "
                    "these keys: action, reasoning, confidence. The action value must be "
                    "one of retry, send_reminder, escalate_to_human, stop_pursuing. "
                    "Do not return a tool name or any extra text."
                ),
            })
            continue

        final_decision, rule_override, human_review_required = evaluate_guardrails(event, decision)

        return AgentResult(
            llm_proposal=decision,
            final_decision=final_decision,
            tool_calls=tool_call_records,
            rule_override=rule_override,
            human_review_required=human_review_required,
        )


# =========================================================
# MAIN
# =========================================================

def main():

    print("\n=== Revenue Recovery Agent — Day 10 ===")

    # -----------------------------------------------------
    # Load event
    # -----------------------------------------------------

    event = load_one_event()

    print("\n--- EVENT ---")

    for key, value in event.items():
        print(f"{key}: {value}")

    # -----------------------------------------------------
    # Run agent
    # -----------------------------------------------------

    try:

        result = run_agent(event)

        

    except ValidationError as error:

        print("\n--- DECISION VALIDATION FAILED ---")
        print(error)
        return

    except Exception as error:

        print("\n--- AGENT ERROR ---")
        print(error)
        return

    # -----------------------------------------------------
    # Validate decision
    # -----------------------------------------------------

    print("\n--- LLM PROPOSAL ---")

    print("Action:", result.llm_proposal.action)
    print("Reasoning:", result.llm_proposal.reasoning)
    print("Confidence:", result.llm_proposal.confidence)


    print("\n--- TOOL CALLS ---")

    for tool_call in result.tool_calls:
        print("Tool:", tool_call.tool_name)
        print("Arguments:", tool_call.arguments)
        print("Result:", tool_call.result)


    print("\n--- RULE OVERRIDE ---")

    if result.rule_override:
        print("Rule:", result.rule_override.rule)
        print("Reason:", result.rule_override.reason)
    else:
        print("No rule override.")


    print("\n--- FINAL DECISION ---")

    print("Action:", result.final_decision.action)
    print("Reasoning:", result.final_decision.reasoning)
    print("Confidence:", result.final_decision.confidence)

    print(
        "Human review required:",
        result.human_review_required,
    )

    # -----------------------------------------------------
    # AUDIT LOG
    # -----------------------------------------------------

    audit_record = log_decision(

        event=event,

        llm_proposal=result.llm_proposal,

        final_decision=result.final_decision,

        tool_calls=result.tool_calls,

        rule_override=result.rule_override,

        human_review_required=result.human_review_required,
    )

    print("\n--- AUDIT LOGGED ---")

    print(
        "Audit event:",
        audit_record.event_id
    )

    print(
        "Final action:",
        audit_record.final_action
    )

    print(
        "Rule override:",
        (
            audit_record.rule_override.rule
            if audit_record.rule_override
            else "None"
        )
    )


# =========================================================
# ENTRY POINT
# =========================================================

if __name__ == "__main__":
    main()