from datetime import datetime, timezone

from fastapi import FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pymongo.errors import PyMongoError

from src.agents.screenshot_verifier_agent import AIScreenshotVerifierAgent
from src.config import get_settings
from src.models.schemas import ScreenshotVerificationRequest, ScreenshotVerificationResponse
from src.repositories.verification_repository import ScreenshotVerificationRepository
from src.services.screenshot_verifier_service import ScreenshotVerifierService
from src.tools.earnings_service_adapter import HttpEarningsServiceAdapter
from src.tools.interfaces import AdapterError

settings = get_settings()

app = FastAPI(title=settings.service_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)

verification_repository = ScreenshotVerificationRepository(
    database_url=settings.database_url,
    collection_name=settings.verification_collection
)

earnings_adapter = HttpEarningsServiceAdapter(
    base_url=settings.earnings_service_url,
    timeout_seconds=settings.request_timeout_seconds
)

try:
    screenshot_verifier_agent = AIScreenshotVerifierAgent(
        settings=settings,
        earnings_adapter=earnings_adapter
    )
except Exception:
    screenshot_verifier_agent = None

screenshot_verifier_service = None
if screenshot_verifier_agent is not None:
    screenshot_verifier_service = ScreenshotVerifierService(
        repository=verification_repository,
        verifier_agent=screenshot_verifier_agent
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

    try:
        verification_repository.ping()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f'Database ping failed: {exc}'
        )

    return {
        'service': settings.service_name,
        'status': 'ok',
        'db': 'up',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'port': settings.port,
        'caller': caller
    }


@app.get('/')
def root(x_service_name: str | None = Header(default=None, alias='x-service-name')):
    caller = _validate_service_header(x_service_name)
    return {
        'message': f'{settings.service_name} is running',
        'port': settings.port,
        'caller': caller,
        'endpoints': {
            'health': '/health',
            'verify_screenshot': '/ai/screenshot-verifier'
        }
    }


@app.post('/ai/screenshot-verifier', response_model=ScreenshotVerificationResponse)
def verify_screenshot(
    payload: ScreenshotVerificationRequest,
    x_service_name: str | None = Header(default=None, alias='x-service-name')
):
    _validate_service_header(x_service_name)

    if screenshot_verifier_service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='AI ScreenShotVerifier is not available. Check GROQ API configuration.'
        )

    try:
        return screenshot_verifier_service.verify(
            worker_id=payload.worker_id,
            session_id=payload.session_id
        )
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f'Verification cache database is unavailable: {exc}'
        ) from exc
    except AdapterError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='AI ScreenShotVerifier failed to process the request'
        )
