# Revenue Recovery

A bounded LLM agent for payment and subscription revenue recovery.

## Project Layout

- `backend/`: FastAPI, Pydantic, SQLite, Anthropic decision engine, and deterministic guardrails.
- `dashboard/`: React and Vite dashboard for audit logs and recovery metrics.
- `data/`: Generated SQLite events and manually labeled ground truth.
- `docs/`: Architecture and evaluation documentation.

## Setup

1. Create a virtual environment and install `requirements.txt`.
2. Copy `.env.example` to `.env` and configure the Anthropic API key.
3. Generate local synthetic data with `python backend/scripts/generate_synthetic_data.py`.
4. Run the API with `uvicorn backend.app.main:app --reload`.
5. Run the dashboard with `cd dashboard && npm install && npm run dev`.

The implementation modules and tests are intentionally placeholders for the next development phase.