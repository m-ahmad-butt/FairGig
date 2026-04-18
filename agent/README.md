# Agent Service

Python Flask service for AI agent functionality.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
```

2. Activate virtual environment:
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the service:
```bash
python app.py
```

The service will run on port 5000 (configurable in .env file).

## Endpoints

- `GET /` - Service status
- `GET /health` - Health check
- `POST /api/agent/analyze` - Analyze text
