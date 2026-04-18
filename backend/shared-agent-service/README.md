# shared-agent-service

## Run locally (without Docker)

1. python -m venv .venv
2. Activate the virtual environment
3. pip install -r requirements.txt
4. uvicorn src.main:app --host 0.0.0.0 --port 4005

## Health check

- GET /health

## Local Docker Compose

- docker compose -f docker-compose.local.yml up --build
