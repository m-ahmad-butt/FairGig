# anomaly-service

## Run locally (without Docker)

1. python -m venv .venv
2. .venv\\Scripts\\Activate.ps1
3. pip install -r requirements.txt
4. uvicorn app.main:app --host 0.0.0.0 --port 8002

## Health check

- GET /health

## Anomaly Detection Agent

### Judge-Facing Detection API (Crafted Payload)

Judges can call detection logic directly without earnings-service or auth-service.

- POST /anomalies/detect

This endpoint accepts the current shift and historical shifts in the request body,
runs all rules, and returns anomaly details and explanation.

Example request body:

```json
{
  "worker_name": "Asha",
  "current_shift": {
    "session_id": "7b0c4e44-6a11-4c9e-a3f5-f2a4f315d011",
    "session_date": "2026-04-19T10:30:00Z",
    "platform": "Uber",
    "hours_worked": 0.6,
    "gross_earned": 24.0,
    "platform_deductions": 18.0,
    "net_received": 6.0
  },
  "historical_shifts": [
    {
      "session_id": "2f8bd0df-40f7-4f64-b1f6-d2e5f2cc9f2a",
      "session_date": "2026-04-18T09:30:00Z",
      "platform": "Uber",
      "hours_worked": 5.0,
      "gross_earned": 140.0,
      "platform_deductions": 30.0,
      "net_received": 110.0
    },
    {
      "session_id": "2474f2ae-0d94-4917-ab5c-5cb4c98d0157",
      "session_date": "2026-04-17T09:30:00Z",
      "platform": "Uber",
      "hours_worked": 4.5,
      "gross_earned": 126.0,
      "platform_deductions": 26.0,
      "net_received": 100.0
    }
  ]
}
```

Example response body:

```json
{
  "anomaly_detected": true,
  "triggered_calculations": [
    "Commission Spike",
    "Wage Collapse",
    "Ghost Deduction"
  ],
  "primary_trigger": "Ghost Deduction",
  "explanation": "Asha, we noticed unusual payout behavior in this shift, especially Ghost Deduction. Please review this payout and keep your records in case you need to dispute it.",
  "commission_spike": {
    "triggered": true,
    "current_ratio": 0.75,
    "historical_avg_ratio": 0.219,
    "historical_std_ratio": 0.0047,
    "threshold_ratio": 0.2284,
    "z_score": 113.7578
  },
  "wage_collapse": {
    "triggered": true,
    "current_hourly_rate": 10.0,
    "rolling_avg_hourly_rate": 22.11,
    "threshold_hourly_rate": 17.69,
    "drop_percentage": 54.77
  },
  "ghost_deduction": {
    "triggered": true,
    "current_hours_worked": 0.6,
    "current_deduction_amount": 18.0,
    "deduction_per_hour": 30.0,
    "baseline_deduction_per_hour": 5.74,
    "proportional_threshold": 10.33
  },
  "current_shift": {
    "session_id": "7b0c4e44-6a11-4c9e-a3f5-f2a4f315d011",
    "session_date": "2026-04-19T10:30:00Z",
    "platform": "Uber",
    "hours_worked": 0.6,
    "gross_earned": 24.0,
    "platform_deductions": 18.0,
    "net_received": 6.0
  },
  "historical_shifts_analyzed": 2
}
```

Quick curl example:

```bash
curl -X POST http://localhost:8002/anomalies/detect \
  -H "Content-Type: application/json" \
  -d @judge_payload.json
```

Interactive docs:

- GET /docs
- GET /openapi.json

Trigger endpoint (called when earnings evidence is verified in earnings-service):

- POST /anomalies/trigger

Example request body:

```json
{
  "worker_id": "6617f5c4f0a4f8d6b9b8d321",
  "session_id": "7b0c4e44-6a11-4c9e-a3f5-f2a4f315d011",
  "evidence_id": "c95f1458-7f0c-4db8-b4ca-f7fd9a972ed3",
  "verified": true
}
```

Worker anomaly read endpoints:

- GET /anomalies/worker/{worker_id}?limit=20
- GET /anomalies/{anomaly_id}

### Detection Rules

A shift is flagged if any of these conditions are true:

1. Commission Spike:
   current deduction_to_gross ratio > historical average + 2 \* historical stddev.
2. Wage Collapse:
   current effective hourly rate (net / hours) < 80% of the worker's 7-day rolling average.
3. Ghost Deduction:
   deduction is disproportionately high while worked hours are minimal.

The service stores the triggered calculations, details, and an empathetic explanation in MongoDB.

### LangChain + Groq

- Uses deterministic math rules to detect anomalies.
- Uses LangChain + Groq to generate a brief worker-facing empathetic explanation.

### External Services Used

- earnings-service:
  - /work-sessions/worker/{worker_id}
  - /earnings/worker/{worker_id}/session/{session_id}
  - /evidence/worker/{worker_id}/session/{session_id}
- auth-service:
  - /api/auth/workers/on-platform?worker_id={worker_id}
  - /workers/on-platform?worker_id={worker_id} (fallback)

### Required Environment Variables

- GROQ_API or GROQ_API_KEY
- EARNINGS_SERVICE_URL (or EARNINGS_SERVICE_INTERNAL_URL)
- AUTH_SERVICE_URL (or AUTH_SERVICE_INTERNAL_URL)
- DATABASE_URL (or ANOMALY_SERVICE_DATABASE_URL)

Optional tuning:

- GHOST_MINIMAL_HOURS_THRESHOLD
- GHOST_ABSOLUTE_DEDUCTION_FLOOR
- GHOST_DEDUCTION_MULTIPLIER

## Prisma note

Prisma schema is included as requested for MongoDB contract consistency across all services.

## Local Docker Compose

- docker compose -f docker-compose.local.yml up --build
