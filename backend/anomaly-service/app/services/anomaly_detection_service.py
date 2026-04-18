from datetime import datetime, timezone

from app.config import Settings
from app.models.schemas import (
    AnomalyDetectionResponse,
    CommissionSpikeDetails,
    GhostDeductionDetails,
    ShiftSnapshot,
    WageCollapseDetails,
    WorkerAnomalyListResponse,
    WorkerProfile
)
from app.repositories.anomaly_repository import AnomalyRepository
from app.services.anomaly_explanation_service import AnomalyExplanationService
from app.services.anomaly_rules_service import AnomalyRulesService
from app.tools.interfaces import AdapterError, AuthServiceAdapter, EarningsServiceAdapter


class AnomalyDetectionService:
    def __init__(
        self,
        settings: Settings,
        repository: AnomalyRepository,
        earnings_adapter: EarningsServiceAdapter,
        auth_adapter: AuthServiceAdapter,
        rules_service: AnomalyRulesService,
        explanation_service: AnomalyExplanationService
    ):
        self._settings = settings
        self._repository = repository
        self._earnings_adapter = earnings_adapter
        self._auth_adapter = auth_adapter
        self._rules_service = rules_service
        self._explanation_service = explanation_service

    def process_verified_event(
        self,
        worker_id: str,
        session_id: str,
        evidence_id: str | None = None
    ) -> AnomalyDetectionResponse:
        evidence_payload = self._earnings_adapter.fetch_evidence_by_worker_session(worker_id, session_id)
        evidence = evidence_payload.get('evidence') or {}

        if evidence.get('verified') is not True:
            raise ValueError('Evidence is not verified. Trigger is allowed only for verified=true updates.')

        sessions_payload = self._earnings_adapter.fetch_worker_sessions(worker_id)
        sessions = sessions_payload.get('sessions') or []

        normalized_shifts: list[ShiftSnapshot] = []
        for session in sessions:
            normalized = self._normalize_shift_from_session(session)
            if normalized is not None:
                normalized_shifts.append(normalized)

        current_shift = next((item for item in normalized_shifts if item.session_id == session_id), None)
        if current_shift is None:
            current_shift = self._fallback_current_shift(worker_id, session_id)
            if current_shift is not None:
                normalized_shifts.append(current_shift)

        if current_shift is None:
            raise ValueError('Unable to construct earning snapshot for provided worker_id and session_id')

        historical_shifts = [
            shift
            for shift in normalized_shifts
            if shift.session_id != current_shift.session_id and shift.session_date < current_shift.session_date
        ]

        evaluation = self._rules_service.evaluate(
            current_shift=current_shift,
            historical_shifts=historical_shifts,
            ghost_minimal_hours_threshold=self._settings.ghost_minimal_hours_threshold,
            ghost_absolute_deduction_floor=self._settings.ghost_absolute_deduction_floor,
            ghost_deduction_multiplier=self._settings.ghost_deduction_multiplier
        )

        worker_profile = self._get_worker_profile(worker_id)

        explanation = self._explanation_service.generate_explanation(
            worker_name=worker_profile.name if worker_profile else None,
            triggered_calculations=evaluation['triggered_calculations'],
            primary_trigger=evaluation['primary_trigger'],
            commission_spike=evaluation['commission_spike'].model_dump(),
            wage_collapse=evaluation['wage_collapse'].model_dump(),
            ghost_deduction=evaluation['ghost_deduction'].model_dump()
        )

        stored = self._repository.upsert_result(
            worker_id=worker_id,
            session_id=session_id,
            payload={
                'evidence_id': evidence.get('id') or evidence_id,
                'image_url': evidence.get('image_url'),
                'verified': True,
                'anomaly_detected': bool(evaluation['triggered_calculations']),
                'triggered_calculations': evaluation['triggered_calculations'],
                'primary_trigger': evaluation['primary_trigger'],
                'explanation': explanation,
                'commission_spike': evaluation['commission_spike'].model_dump(),
                'wage_collapse': evaluation['wage_collapse'].model_dump(),
                'ghost_deduction': evaluation['ghost_deduction'].model_dump(),
                'worker': worker_profile.model_dump() if worker_profile else None,
                'current_shift': current_shift.model_dump(),
                'historical_shifts_analyzed': len(historical_shifts),
                'generated_at': datetime.now(timezone.utc)
            }
        )

        return self._to_response(stored)

    def list_worker_anomalies(self, worker_id: str, limit: int = 20) -> WorkerAnomalyListResponse:
        documents = self._repository.list_by_worker(worker_id, limit=limit)
        anomalies = [self._to_response(document) for document in documents]
        return WorkerAnomalyListResponse(
            worker_id=worker_id,
            count=len(anomalies),
            anomalies=anomalies
        )

    def get_anomaly_by_id(self, anomaly_id: str) -> AnomalyDetectionResponse | None:
        document = self._repository.find_by_id(anomaly_id)
        if document is None:
            return None
        return self._to_response(document)

    def _fallback_current_shift(self, worker_id: str, session_id: str) -> ShiftSnapshot | None:
        earning_payload = self._earnings_adapter.fetch_earning_by_worker_session(worker_id, session_id)

        session = dict(earning_payload.get('session') or {})
        earning = dict(earning_payload.get('earning') or {})

        if not session:
            return None

        session['id'] = session.get('id') or session_id
        session['earning'] = earning
        return self._normalize_shift_from_session(session)

    def _get_worker_profile(self, worker_id: str) -> WorkerProfile | None:
        try:
            payload = self._auth_adapter.fetch_worker_profile(worker_id)
        except AdapterError:
            payload = None

        if not payload:
            return None

        worker_identifier = str(payload.get('id') or payload.get('_id') or '').strip()
        if not worker_identifier:
            return None

        worker_name = str(payload.get('name') or 'Worker').strip() or 'Worker'

        return WorkerProfile(
            id=worker_identifier,
            name=worker_name,
            platform=self._optional_string(payload.get('platform')),
            category=self._optional_string(payload.get('category')),
            city=self._optional_string(payload.get('city')),
            zone=self._optional_string(payload.get('zone'))
        )

    def _normalize_shift_from_session(self, session: dict) -> ShiftSnapshot | None:
        earning = session.get('earning')
        if not isinstance(earning, dict):
            return None

        session_id = str(session.get('id') or session.get('session_id') or '').strip()
        if not session_id:
            return None

        date_candidate = session.get('session_date') or session.get('start_time')
        session_date = self._parse_datetime(date_candidate)
        if session_date is None:
            return None

        platform = str(session.get('platform') or 'unknown').strip() or 'unknown'

        gross_earned = self._to_non_negative_float(earning.get('gross_earned'))
        platform_deductions = self._to_non_negative_float(earning.get('platform_deductions'))
        net_received = self._to_non_negative_float(earning.get('net_received'))
        hours_worked = self._to_non_negative_float(session.get('hours_worked'))

        return ShiftSnapshot(
            session_id=session_id,
            session_date=session_date,
            platform=platform,
            hours_worked=round(hours_worked, 4),
            gross_earned=round(gross_earned, 4),
            platform_deductions=round(platform_deductions, 4),
            net_received=round(net_received, 4)
        )

    def _to_response(self, document: dict) -> AnomalyDetectionResponse:
        now = datetime.now(timezone.utc)

        commission_payload = document.get('commission_spike') or {}
        wage_payload = document.get('wage_collapse') or {}
        ghost_payload = document.get('ghost_deduction') or {}

        worker_payload = document.get('worker') or None
        worker = WorkerProfile.model_validate(worker_payload) if worker_payload else None

        current_shift_payload = document.get('current_shift') or {}

        return AnomalyDetectionResponse(
            id=str(document.get('_id') or document.get('id') or ''),
            worker_id=str(document.get('worker_id') or ''),
            session_id=str(document.get('session_id') or ''),
            evidence_id=document.get('evidence_id'),
            anomaly_detected=bool(document.get('anomaly_detected')),
            triggered_calculations=list(document.get('triggered_calculations') or []),
            primary_trigger=document.get('primary_trigger'),
            explanation=str(document.get('explanation') or ''),
            commission_spike=CommissionSpikeDetails.model_validate(
                {
                    'triggered': False,
                    'current_ratio': 0,
                    'historical_avg_ratio': 0,
                    'historical_std_ratio': 0,
                    'threshold_ratio': 0,
                    **commission_payload
                }
            ),
            wage_collapse=WageCollapseDetails.model_validate(
                {
                    'triggered': False,
                    'current_hourly_rate': 0,
                    'rolling_avg_hourly_rate': 0,
                    'threshold_hourly_rate': 0,
                    'drop_percentage': 0,
                    **wage_payload
                }
            ),
            ghost_deduction=GhostDeductionDetails.model_validate(
                {
                    'triggered': False,
                    'current_hours_worked': 0,
                    'current_deduction_amount': 0,
                    'deduction_per_hour': 0,
                    'baseline_deduction_per_hour': 0,
                    'proportional_threshold': 0,
                    **ghost_payload
                }
            ),
            worker=worker,
            current_shift=ShiftSnapshot.model_validate(current_shift_payload),
            historical_shifts_analyzed=int(document.get('historical_shifts_analyzed') or 0),
            created_at=document.get('created_at') or document.get('generated_at') or now,
            updated_at=document.get('updated_at') or document.get('generated_at') or now
        )

    def _parse_datetime(self, value) -> datetime | None:
        if isinstance(value, datetime):
            if value.tzinfo is None:
                return value.replace(tzinfo=timezone.utc)
            return value

        if isinstance(value, str):
            normalized = value.strip()
            if not normalized:
                return None

            normalized = normalized.replace('Z', '+00:00')
            try:
                parsed = datetime.fromisoformat(normalized)
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)
                return parsed
            except ValueError:
                return None

        return None

    def _to_non_negative_float(self, value) -> float:
        try:
            parsed = float(value)
        except (TypeError, ValueError):
            return 0.0

        if parsed < 0:
            return 0.0

        return parsed

    def _optional_string(self, value) -> str | None:
        if value is None:
            return None

        normalized = str(value).strip()
        return normalized or None
