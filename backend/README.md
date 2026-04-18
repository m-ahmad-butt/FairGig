# FairGig Hackathon Backend Scaffold

This folder contains a fresh microservices scaffold aligned to your hackathon requirements.

## Services

- api-gateway (Node.js)
- auth-service (Node.js)
- earnings-service (Node.js)
- grievance-service (Node.js)
- certificate-service (Node.js)
- shared-agent-service (Node.js)
- analytics-service (FastAPI)
- anomaly-service (FastAPI)

Each service has:
- health endpoint at GET /health
- MongoDB connection config
- local docker-compose.local.yml
- README with single-start instructions

## Run all services

1. Copy each .env.example to .env in every service folder.
2. From this folder run:
   docker compose up --build

## API Gateway

Expose gateway on port 8080 and route traffic to all services via:
- /api/auth/*
- /api/earnings/*
- /api/grievance/*
- /api/certificate/*
- /api/shared-agent/*
- /api/analytics/*
- /api/anomaly/*
