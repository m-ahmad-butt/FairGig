# certificate-service

## Run locally (without Docker)

1. npm install
2. npm run prisma:generate
3. npm run dev

## Health check

- GET /health

## API contracts

### GET /income-certificate

Generates structured certificate data from verified earnings records.

Query params:
- worker_id (required)
- from_date (optional, format YYYY-MM-DD)
- to_date (optional, format YYYY-MM-DD)
- year (optional when date range is not provided)

Rules:
- If one of from_date/to_date is passed, both are required.
- If from_date/to_date are not passed, year is used (defaults to current year).

Response (JSON):
- worker_id
- from_date
- to_date
- range_label
- generated_at
- certificate_id
- summary (total_sessions, total_hours, total_gross, total_net)
- period_breakdown[] (key, label, sessions, hours, gross, net)
- sessions[] (verified sessions included in the certificate)

### GET /income-certificate/html

Generates a clean printable HTML certificate using verified earnings data.

Query params:
- worker_id (required)
- worker_name (optional)
- from_date (optional, format YYYY-MM-DD)
- to_date (optional, format YYYY-MM-DD)
- year (optional when date range is not provided)

Response:
- Content-Type: text/html
- Printable HTML document with summary, breakdown, and verified session table.

## Local Docker Compose

- docker compose -f docker-compose.local.yml up --build
