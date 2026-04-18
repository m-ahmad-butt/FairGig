# anomaly-service

## Run locally (without Docker)

1. python -m venv .venv
2. .venv\\Scripts\\Activate.ps1
3. pip install -r requirements.txt
4. uvicorn app.main:app --host 0.0.0.0 --port 8002

## Health check

- GET /health

## Prisma note

Prisma schema is included as requested for MongoDB contract consistency across all services.

## Local Docker Compose

- docker compose -f docker-compose.local.yml up --build
