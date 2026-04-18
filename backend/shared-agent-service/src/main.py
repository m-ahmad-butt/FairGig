import os
from pathlib import Path
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient

for parent in Path(__file__).resolve().parents:
    candidate = parent / '.env'
    if candidate.exists():
        load_dotenv(candidate)
        break
else:
    load_dotenv()

service_name = os.getenv('SERVICE_NAME', 'shared-agent-service')
port = int(os.getenv('PORT', os.getenv('SHARED_AGENT_SERVICE_PORT', '4005')))
db_url = (
    os.getenv('DATABASE_URL')
    or os.getenv('SHARED_AGENT_SERVICE_DATABASE_URL')
    or 'mongodb://mongo:27017/shared_agent_service'
)

cors_origins = os.getenv('CORS_ORIGINS', os.getenv('FRONTEND_URL', 'http://localhost:5173'))
allowed_origins = [origin.strip() for origin in cors_origins.split(',') if origin.strip()]

app = FastAPI(title=service_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)


def _validate_service_header(x_service_name: str | None) -> str | None:
    if x_service_name is not None and not x_service_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='x-service-name header cannot be empty'
        )
    return x_service_name


@app.get('/health')
def health_check(x_service_name: str | None = Header(default=None, alias='x-service-name')):
    caller = _validate_service_header(x_service_name)

    db = 'down'
    try:
        client = MongoClient(db_url, serverSelectionTimeoutMS=1500)
        client.admin.command('ping')
        db = 'up'
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f'Database ping failed: {exc}'
        )

    return {
        'service': service_name,
        'status': 'ok',
        'db': db,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'port': port,
        'caller': caller
    }


@app.get('/')
def root(x_service_name: str | None = Header(default=None, alias='x-service-name')):
    caller = _validate_service_header(x_service_name)
    return {
        'message': f'{service_name} is running',
        'port': port,
        'caller': caller
    }
