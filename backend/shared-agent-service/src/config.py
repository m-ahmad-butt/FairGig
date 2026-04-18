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
    groq_api_key: str
    groq_vision_model: str
    groq_agent_model: str
    request_timeout_seconds: int
    verification_collection: str
    screenshot_anomaly_confidence_threshold: float


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

    service_name = os.getenv('SERVICE_NAME', 'shared-agent-service')
    port = int(os.getenv('PORT', os.getenv('SHARED_AGENT_SERVICE_PORT', '4005')))
    database_url = (
        os.getenv('DATABASE_URL')
        or os.getenv('SHARED_AGENT_SERVICE_DATABASE_URL')
        or 'mongodb://mongo:27017/shared_agent_service'
    )
    cors_origins = _split_origins(
        os.getenv('CORS_ORIGINS', os.getenv('FRONTEND_URL', 'http://localhost:5173'))
    )

    earnings_service_url = (
        os.getenv('EARNINGS_SERVICE_INTERNAL_URL')
        or os.getenv('EARNINGS_SERVICE_URL')
        or 'http://earnings-service:4002'
    )

    groq_api_key = os.getenv('GROQ_API_KEY') or os.getenv('GROQ_API', '')
    groq_vision_model = os.getenv('GROQ_VISION_MODEL', 'llama-3.2-90b-vision-preview')
    groq_agent_model = os.getenv('GROQ_AGENT_MODEL', 'llama-3.1-70b-versatile')
    request_timeout_seconds = int(os.getenv('AGENT_HTTP_TIMEOUT_SECONDS', '15'))
    verification_collection = os.getenv(
        'SCREENSHOT_VERIFICATION_COLLECTION',
        'ai_screenshot_verifications'
    )
    screenshot_anomaly_confidence_threshold = float(
        os.getenv('SCREENSHOT_ANOMALY_CONFIDENCE_THRESHOLD', '80')
    )

    return Settings(
        service_name=service_name,
        port=port,
        database_url=database_url,
        cors_origins=cors_origins,
        earnings_service_url=earnings_service_url,
        groq_api_key=groq_api_key,
        groq_vision_model=groq_vision_model,
        groq_agent_model=groq_agent_model,
        request_timeout_seconds=request_timeout_seconds,
        verification_collection=verification_collection,
        screenshot_anomaly_confidence_threshold=screenshot_anomaly_confidence_threshold
    )
