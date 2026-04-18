# earnings-service

## Run locally (without Docker)

1. npm install
2. npm run prisma:generate
3. npm run dev

## Health check

- GET /health

## Anomaly Trigger Integration

When evidence verification changes from false to true, earnings-service calls anomaly-service automatically:

- POST /anomalies/trigger

Environment variables:

- ANOMALY_SERVICE_INTERNAL_URL (preferred in containers)
- ANOMALY_SERVICE_URL
- ANOMALY_TRIGGER_TIMEOUT_MS (default: 4000)

## Local Docker Compose

- docker compose -f docker-compose.local.yml up --build
