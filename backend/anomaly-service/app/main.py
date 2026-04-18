from datetime import datetime, timezone

from fastapi import FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pymongo.errors import PyMongoError

from app.config import get_settings
from app.models.schemas import (
    AnomalyDetectionResponse,
    AnomalyTriggerRequest,
    DirectAnomalyDetectionRequest,
    DirectAnomalyDetectionResponse,
    WorkerAnomalyListResponse
)
from app.repositories.anomaly_repository import AnomalyRepository
from app.services.anomaly_detection_service import AnomalyDetectionService
from app.services.anomaly_explanation_service import AnomalyExplanationService
from app.services.anomaly_rules_service import AnomalyRulesService
from app.tools.auth_service_adapter import HttpAuthServiceAdapter
from app.tools.earnings_service_adapter import HttpEarningsServiceAdapter
from app.tools.interfaces import AdapterError

settings = get_settings()

app = FastAPI(title=settings.service_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)

repository = AnomalyRepository(
    database_url=settings.database_url,
    collection_name=settings.anomaly_collection
)
earnings_adapter = HttpEarningsServiceAdapter(
    base_url=settings.earnings_service_url,
    timeout_seconds=settings.request_timeout_seconds
)
auth_adapter = HttpAuthServiceAdapter(
    base_url=settings.auth_service_url,
    timeout_seconds=settings.request_timeout_seconds
)
rules_service = AnomalyRulesService()
explanation_service = AnomalyExplanationService(settings=settings)

anomaly_detection_service = AnomalyDetectionService(
    settings=settings,
    repository=repository,
    earnings_adapter=earnings_adapter,
    auth_adapter=auth_adapter,
    rules_service=rules_service,
    explanation_service=explanation_service
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
        repository.ping()
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
            'detect_anomaly_direct': '/anomalies/detect',
            'trigger_anomaly_detection': '/anomalies/trigger',
            'list_worker_anomalies': '/anomalies/worker/{worker_id}',
            'get_anomaly_by_id': '/anomalies/{anomaly_id}'
        }
    }


@app.post(
    '/anomalies/detect',
    response_model=DirectAnomalyDetectionResponse,
    summary='Detect anomalies from crafted payload',
    description=(
        'Judge-facing endpoint. Accepts current_shift and historical_shifts directly, '
        'runs Commission Spike, Wage Collapse, and Ghost Deduction rules, '
        'and returns the anomaly decision plus explanation.'
    )
)
def detect_anomaly_direct(
    payload: DirectAnomalyDetectionRequest,
    x_service_name: str | None = Header(default=None, alias='x-service-name')
):
    _validate_service_header(x_service_name)

    try:
        evaluation = rules_service.evaluate(
            current_shift=payload.current_shift,
            historical_shifts=payload.historical_shifts,
            ghost_minimal_hours_threshold=settings.ghost_minimal_hours_threshold,
            ghost_absolute_deduction_floor=settings.ghost_absolute_deduction_floor,
            ghost_deduction_multiplier=settings.ghost_deduction_multiplier
        )

        explanation = explanation_service.generate_explanation(
            worker_name=payload.worker_name,
            triggered_calculations=evaluation['triggered_calculations'],
            primary_trigger=evaluation['primary_trigger'],
            commission_spike=evaluation['commission_spike'].model_dump(),
            wage_collapse=evaluation['wage_collapse'].model_dump(),
            ghost_deduction=evaluation['ghost_deduction'].model_dump()
        )

        return DirectAnomalyDetectionResponse(
            anomaly_detected=bool(evaluation['triggered_calculations']),
            triggered_calculations=evaluation['triggered_calculations'],
            primary_trigger=evaluation['primary_trigger'],
            explanation=explanation,
            commission_spike=evaluation['commission_spike'],
            wage_collapse=evaluation['wage_collapse'],
            ghost_deduction=evaluation['ghost_deduction'],
            current_shift=payload.current_shift,
            historical_shifts_analyzed=len(payload.historical_shifts)
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Direct anomaly detection failed to process the request'
        )


@app.post('/anomalies/trigger', response_model=AnomalyDetectionResponse)
def trigger_anomaly_detection(
    payload: AnomalyTriggerRequest,
    x_service_name: str | None = Header(default=None, alias='x-service-name')
):
    _validate_service_header(x_service_name)

    if payload.verified is not True:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Anomaly detection trigger requires verified=true'
        )

    try:
        return anomaly_detection_service.process_verified_event(
            worker_id=payload.worker_id,
            session_id=payload.session_id,
            evidence_id=payload.evidence_id
        )
    except AdapterError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f'Anomaly database is unavailable: {exc}'
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Anomaly detection failed to process the request'
        )


@app.get('/anomalies/worker/{worker_id}', response_model=WorkerAnomalyListResponse)
def list_worker_anomalies(
    worker_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    x_service_name: str | None = Header(default=None, alias='x-service-name')
):
    _validate_service_header(x_service_name)

    try:
        return anomaly_detection_service.list_worker_anomalies(worker_id=worker_id, limit=limit)
    except AdapterError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f'Anomaly database is unavailable: {exc}'
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@app.get('/anomalies/{anomaly_id}', response_model=AnomalyDetectionResponse)
def get_anomaly_by_id(
    anomaly_id: str,
    x_service_name: str | None = Header(default=None, alias='x-service-name')
):
    _validate_service_header(x_service_name)

    try:
        anomaly = anomaly_detection_service.get_anomaly_by_id(anomaly_id)
        if anomaly is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Anomaly record not found'
            )
        return anomaly
    except AdapterError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f'Anomaly database is unavailable: {exc}'
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
