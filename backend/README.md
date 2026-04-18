# FairGig Hackathon Backend (Minimal 5-Service Startup)

This backend is a **simple startup scaffold** with independent services and only minimal startup routes.

## Why 5 services
The original requirement doc lists 6 logical services. To keep deployment simple (4-5 services), this scaffold merges:
- `analytics-service` + `certificate renderer` responsibilities in one service boundary for now.

## Services in this scaffold
1. `auth-service` (FastAPI)
2. `earnings-service` (FastAPI)
3. `anomaly-service` (FastAPI)
4. `grievance-service` (Node.js)
5. `analytics-service` (Node.js; includes certificate placeholder responsibility)

## Requirement alignment from req.md
- FastAPI required: `anomaly-service` + at least one more service -> covered (`auth-service`, `earnings-service`)
- Grievance service must be Node.js -> covered
- Independent runnable services with single start command -> covered

## AI ideas alignment from ai.md (planned, not implemented)
- Heat map by zones -> analytics-service (planned)
- Income recommendation from other users -> analytics-service (planned)
- Anomaly detection -> anomaly-service (planned)
- Complaints forum, discussions, polling, trending -> grievance-service (planned)

## Startup commands

### 1) auth-service
- `cd auth-service`
- `pip install -r requirements.txt`
- `python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload`

### 2) earnings-service
- `cd earnings-service`
- `pip install -r requirements.txt`
- `python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload`

### 3) anomaly-service
- `cd anomaly-service`
- `pip install -r requirements.txt`
- `python -m uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload`

### 4) grievance-service
- `cd grievance-service`
- `npm install`
- `npm run dev`

### 5) analytics-service
- `cd analytics-service`
- `npm install`
- `npm run dev`

## Note
This is intentionally minimal and does not include business logic yet.

## Optional Docker startup
Build and run each service independently (example for auth-service):
- `cd auth-service`
- `docker build -t fairgig-auth .`
- `docker run -p 8001:8001 fairgig-auth`

Use matching ports for other services:
- earnings-service: `8002`
- anomaly-service: `8003`
- grievance-service: `8004`
- analytics-service: `8005`
