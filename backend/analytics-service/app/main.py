import os
from datetime import datetime, timezone

from fastapi import FastAPI
from pymongo import MongoClient

service_name = os.getenv('SERVICE_NAME', 'analytics-service')
port = int(os.getenv('PORT', '8001'))
db_url = os.getenv('DATABASE_URL', 'mongodb://mongo:27017/analytics_service')

app = FastAPI(title=service_name)


@app.get('/health')
def health_check():
    db = 'down'
    try:
        client = MongoClient(db_url, serverSelectionTimeoutMS=1500)
        client.admin.command('ping')
        db = 'up'
    except Exception:
        db = 'down'

    return {
        'service': service_name,
        'status': 'ok',
        'db': db,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }


@app.get('/')
def root():
    return {'message': f'{service_name} is running'}
