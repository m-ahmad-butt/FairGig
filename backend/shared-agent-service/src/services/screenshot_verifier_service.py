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
        verifier_agent: AIScreenshotVerifierAgent
    ):
        self._repository = repository
        self._verifier_agent = verifier_agent

    def verify(self, worker_id: str, session_id: str) -> ScreenshotVerificationResponse:
        cached_document = self._repository.find_by_worker_and_session(worker_id, session_id)
        if cached_document:
            return self._to_response(cached_document, cached=True)

        agent_output = self._verifier_agent.evaluate(worker_id, session_id)

        extracted_data = self._normalize_extracted(agent_output.extracted_data)
        actual_data = self._normalize_actual(agent_output.actual_data)

        confidence_score = calculate_confidence_score(extracted_data, actual_data)

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
            actual_payload=actual_data.model_dump()
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

        evaluated_at = (
            document.get('updated_at')
            or document.get('created_at')
            or datetime.now(timezone.utc)
        )

        return ScreenshotVerificationResponse(
            worker_id=document.get('worker_id', ''),
            session_id=document.get('session_id', ''),
            image_url=document.get('image_url', ''),
            confidence_score=float(document.get('confidence_score', 0)),
            data_from_picture=extracted_data,
            actual_data=actual_data,
            cached=cached,
            evaluated_at=evaluated_at
        )
