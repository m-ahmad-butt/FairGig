from datetime import datetime, timezone

from src.agents.screenshot_verifier_agent import AIScreenshotVerifierAgent
from src.models.schemas import (
    ActualEarningData,
    ReceiptExtraction,
    ScreenshotVerificationResponse
)
from src.repositories.verification_repository import ScreenshotVerificationRepository
from src.services.confidence import calculate_confidence_score


class ScreenshotVerifierService:
    def __init__(
        self,
        repository: ScreenshotVerificationRepository,
        verifier_agent: AIScreenshotVerifierAgent,
        anomaly_confidence_threshold: float = 80.0
    ):
        self._repository = repository
        self._verifier_agent = verifier_agent
        self._anomaly_confidence_threshold = max(0.0, min(float(anomaly_confidence_threshold), 100.0))

    def verify(self, worker_id: str, session_id: str) -> ScreenshotVerificationResponse:
        cached_document = self._repository.find_by_worker_and_session(worker_id, session_id)
        if cached_document:
            return self._to_response(cached_document, cached=True)

        agent_output = self._verifier_agent.evaluate(worker_id, session_id)

        extracted_data = self._normalize_extracted(agent_output.extracted_data)
        actual_data = self._normalize_actual(agent_output.actual_data)

        confidence_score = calculate_confidence_score(extracted_data, actual_data)
        anomaly_detected, anomaly_types = self._detect_anomalies(
            extracted_data=extracted_data,
            actual_data=actual_data,
            confidence_score=confidence_score
        )

        stored_document = self._repository.upsert_result(
            worker_id=worker_id,
            session_id=session_id,
            image_url=agent_output.image_url,
            platform_name=extracted_data.platform_name,
            gross_amount=extracted_data.gross_amount,
            platform_deduction=extracted_data.platform_deduction,
            net_amount=extracted_data.net_amount,
            confidence_score=confidence_score,
            extracted_payload=extracted_data.model_dump(),
            actual_payload=actual_data.model_dump(),
            anomaly_detected=anomaly_detected,
            anomaly_types=anomaly_types,
            anomaly_confidence_threshold=self._anomaly_confidence_threshold
        )

        return self._to_response(stored_document, cached=False)

    def _normalize_extracted(self, extracted_data: ReceiptExtraction) -> ReceiptExtraction:
        gross_amount = round(max(float(extracted_data.gross_amount), 0.0), 2)
        platform_deduction = round(max(float(extracted_data.platform_deduction), 0.0), 2)
        net_amount = round(max(gross_amount - platform_deduction, 0.0), 2)

        return extracted_data.model_copy(
            update={
                'gross_amount': gross_amount,
                'platform_deduction': platform_deduction,
                'net_amount': net_amount
            }
        )

    def _normalize_actual(self, actual_data: ActualEarningData) -> ActualEarningData:
        return actual_data.model_copy(
            update={
                'gross_amount': round(max(float(actual_data.gross_amount), 0.0), 2),
                'platform_deduction': round(max(float(actual_data.platform_deduction), 0.0), 2),
                'net_amount': round(max(float(actual_data.net_amount), 0.0), 2)
            }
        )

    def _to_response(self, document: dict, cached: bool) -> ScreenshotVerificationResponse:
        extracted_payload = document.get('extracted_payload') or {}
        actual_payload = document.get('actual_payload') or {}

        extracted_data = ReceiptExtraction.model_validate(extracted_payload)
        actual_data = ActualEarningData.model_validate(actual_payload)
        confidence_score = float(document.get('confidence_score', 0))

        stored_anomaly_detected = document.get('anomaly_detected')
        stored_anomaly_types = document.get('anomaly_types')
        stored_threshold = document.get('anomaly_confidence_threshold')

        anomaly_threshold = (
            float(stored_threshold)
            if stored_threshold is not None
            else self._anomaly_confidence_threshold
        )

        if isinstance(stored_anomaly_types, list) and stored_anomaly_detected is not None:
            anomaly_detected = bool(stored_anomaly_detected)
            anomaly_types = [str(item) for item in stored_anomaly_types if str(item).strip()]
        else:
            anomaly_detected, anomaly_types = self._detect_anomalies(
                extracted_data=extracted_data,
                actual_data=actual_data,
                confidence_score=confidence_score,
                threshold=anomaly_threshold
            )

        evaluated_at = (
            document.get('updated_at')
            or document.get('created_at')
            or datetime.now(timezone.utc)
        )

        return ScreenshotVerificationResponse(
            worker_id=document.get('worker_id', ''),
            session_id=document.get('session_id', ''),
            image_url=document.get('image_url', ''),
            confidence_score=confidence_score,
            anomaly_detected=anomaly_detected,
            anomaly_types=anomaly_types,
            anomaly_confidence_threshold=round(anomaly_threshold, 2),
            data_from_picture=extracted_data,
            actual_data=actual_data,
            cached=cached,
            evaluated_at=evaluated_at
        )

    def _detect_anomalies(
        self,
        extracted_data: ReceiptExtraction,
        actual_data: ActualEarningData,
        confidence_score: float,
        threshold: float | None = None
    ) -> tuple[bool, list[str]]:
        effective_threshold = self._anomaly_confidence_threshold if threshold is None else threshold

        if confidence_score >= effective_threshold:
            return False, []

        anomaly_types: list[str] = []

        if not self._platform_matches(extracted_data.platform_name, actual_data.platform_name):
            anomaly_types.append('PLATFORM_NAME_MISMATCH')

        if self._is_numeric_mismatch(extracted_data.gross_amount, actual_data.gross_amount):
            anomaly_types.append('GROSS_AMOUNT_MISMATCH')

        if self._is_numeric_mismatch(
            extracted_data.platform_deduction,
            actual_data.platform_deduction
        ):
            anomaly_types.append('PLATFORM_DEDUCTION_MISMATCH')

        if self._is_numeric_mismatch(extracted_data.net_amount, actual_data.net_amount):
            anomaly_types.append('NET_AMOUNT_MISMATCH')

        anomaly_types.append('LOW_CONFIDENCE_VERIFICATION')
        return True, list(dict.fromkeys(anomaly_types))

    def _platform_matches(self, extracted_platform: str, actual_platform: str) -> bool:
        return (extracted_platform or '').strip().lower() == (actual_platform or '').strip().lower()

    def _is_numeric_mismatch(self, observed: float, expected: float) -> bool:
        denominator = max(abs(float(expected)), 1.0)
        delta_ratio = abs(float(observed) - float(expected)) / denominator
        return delta_ratio > 0.10
