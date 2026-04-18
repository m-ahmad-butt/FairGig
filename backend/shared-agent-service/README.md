# shared-agent-service

## Run locally (without Docker)

1. python -m venv .venv
2. Activate the virtual environment
3. pip install -r requirements.txt
4. uvicorn src.main:app --host 0.0.0.0 --port 4005

## Health check

- GET /health

## AI ScreenShotVerifier

- POST /ai/screenshot-verifier
- Request body:

```json
{
  "worker_id": "6617f5c4f0a4f8d6b9b8d321",
  "session_id": "7b0c4e44-6a11-4c9e-a3f5-f2a4f315d011"
}
```

This endpoint:

1. Fetches evidence image_url and earning data from earnings-service via tool adapters.
2. Uses LangChain ReAct agent + Groq vision model to extract receipt fields.
3. Handles missing platform deduction by treating it as 0.
4. Computes and returns a confidence score.
5. Stores result in MongoDB and reuses cached evaluation for the same worker_id/session_id.

Required env values:

- GROQ_API or GROQ_API_KEY
- EARNINGS_SERVICE_URL (optional; defaults to internal service URL)

## Local Docker Compose

- docker compose -f docker-compose.local.yml up --build
