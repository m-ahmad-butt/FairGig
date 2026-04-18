import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    service_name: str
    port: int
    database_url: str
    cors_origins: list[str]
    earnings_service_url: str
    auth_service_url: str
    groq_api_key: str
    groq_model: str
    request_timeout_seconds: int
    anomaly_collection: str
    ghost_minimal_hours_threshold: float
    ghost_absolute_deduction_floor: float
    ghost_deduction_multiplier: float


def load_environment() -> None:
    for parent in Path(__file__).resolve().parents:
        candidate = parent / '.env'
        if candidate.exists():
            load_dotenv(candidate)
            return

    load_dotenv()


def _split_origins(raw_origins: str) -> list[str]:
    origins = [origin.strip() for origin in raw_origins.split(',') if origin.strip()]
    return origins or ['*']


def get_settings() -> Settings:
    load_environment()

    service_name = os.getenv('SERVICE_NAME', 'anomaly-service')
    port = int(os.getenv('PORT', os.getenv('ANOMALY_SERVICE_PORT', '8002')))
    database_url = (
        os.getenv('DATABASE_URL')
        or os.getenv('ANOMALY_SERVICE_DATABASE_URL')
        or 'mongodb://mongo:27017/anomaly_service'
    )
    cors_origins = _split_origins(
        os.getenv('CORS_ORIGINS', os.getenv('FRONTEND_URL', 'http://localhost:5173'))
    )

    earnings_service_url = (
        os.getenv('EARNINGS_SERVICE_INTERNAL_URL')
        or os.getenv('EARNINGS_SERVICE_URL')
        or 'http://earnings-service:4002'
    )
    auth_service_url = (
        os.getenv('AUTH_SERVICE_INTERNAL_URL')
        or os.getenv('AUTH_SERVICE_URL')
        or 'http://auth-service:4001'
    )

    groq_api_key = os.getenv('GROQ_API_KEY') or os.getenv('GROQ_API', '')
    groq_model = os.getenv('GROQ_ANOMALY_MODEL', 'llama-3.1-70b-versatile')

    request_timeout_seconds = int(os.getenv('AGENT_HTTP_TIMEOUT_SECONDS', '15'))
    anomaly_collection = os.getenv('ANOMALY_COLLECTION', 'worker_earning_anomalies')

    ghost_minimal_hours_threshold = float(os.getenv('GHOST_MINIMAL_HOURS_THRESHOLD', '1.0'))
    ghost_absolute_deduction_floor = float(os.getenv('GHOST_ABSOLUTE_DEDUCTION_FLOOR', '10.0'))
    ghost_deduction_multiplier = float(os.getenv('GHOST_DEDUCTION_MULTIPLIER', '3.0'))

    return Settings(
        service_name=service_name,
        port=port,
        database_url=database_url,
        cors_origins=cors_origins,
        earnings_service_url=earnings_service_url,
        auth_service_url=auth_service_url,
        groq_api_key=groq_api_key,
        groq_model=groq_model,
        request_timeout_seconds=request_timeout_seconds,
        anomaly_collection=anomaly_collection,
        ghost_minimal_hours_threshold=ghost_minimal_hours_threshold,
        ghost_absolute_deduction_floor=ghost_absolute_deduction_floor,
        ghost_deduction_multiplier=ghost_deduction_multiplier
    )
