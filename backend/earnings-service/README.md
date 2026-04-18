# earnings-service

## Run locally (without Docker)

1. npm install
2. npm run prisma:generate
3. npm run dev

## Health check

- GET /health

## Evidence Upload (S3)

The endpoint below now generates a presigned S3 URL for image uploads:

- GET /evidence/presigned-url?session_id=<uuid>&file_type=image/jpeg

To avoid browser-to-S3 CORS issues, you can upload via earnings-service directly:

- POST /evidence/upload (multipart/form-data with fields: session_id, optional worker_id, image)

Required environment variables:

- AWS_S3_BUCKET
- AWS_REGION
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY

Optional environment variables:

- AWS_S3_UPLOAD_EXPIRES_SECONDS (default: 900)
- EVIDENCE_S3_PREFIX (default: evidence)
- EVIDENCE_PUBLIC_BASE_URL (if you want custom public image URL base)
- AWS_S3_ENDPOINT (for S3-compatible object storage)
- AWS_S3_FORCE_PATH_STYLE (true/false)

## Anomaly Trigger Integration

When evidence verification changes from false to true, earnings-service calls anomaly-service automatically:

- POST /anomalies/trigger

Environment variables:

- ANOMALY_SERVICE_INTERNAL_URL (preferred in containers)
- ANOMALY_SERVICE_URL
- ANOMALY_TRIGGER_TIMEOUT_MS (default: 4000)

## Local Docker Compose

- docker compose -f docker-compose.local.yml up --build
