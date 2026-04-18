import json
from typing import Callable

from langchain_core.tools import tool

from src.models.schemas import ReceiptExtraction
from src.tools.interfaces import EarningsServiceAdapter


def _parse_worker_and_session(raw_input: str) -> tuple[str, str]:
    cleaned = (raw_input or '').strip()

    try:
        payload = json.loads(cleaned)
        worker_id = str(payload.get('worker_id', '')).strip()
        session_id = str(payload.get('session_id', '')).strip()
        if worker_id and session_id:
            return worker_id, session_id
    except json.JSONDecodeError:
        pass

    parsed: dict[str, str] = {}
    for token in cleaned.replace(';', ',').split(','):
        part = token.strip()
        if '=' not in part:
            continue
        key, value = part.split('=', 1)
        parsed[key.strip()] = value.strip()

    worker_id = parsed.get('worker_id', '')
    session_id = parsed.get('session_id', '')
    if worker_id and session_id:
        return worker_id, session_id

    raise ValueError('Expected worker_id and session_id in action input')


def _parse_image_url(raw_input: str) -> str:
    cleaned = (raw_input or '').strip()

    try:
        payload = json.loads(cleaned)
        image_url = str(payload.get('image_url', '')).strip()
        if image_url:
            return image_url
    except json.JSONDecodeError:
        pass

    if cleaned.startswith('"') and cleaned.endswith('"'):
        cleaned = cleaned[1:-1]

    if cleaned:
        return cleaned

    raise ValueError('Expected image_url in action input')


def build_verifier_tools(
    adapter: EarningsServiceAdapter,
    analyze_receipt_image_fn: Callable[[str], ReceiptExtraction]
):
    @tool('fetch_evidence_image_url')
    def fetch_evidence_image_url(action_input: str) -> str:
        """Fetch evidence details from earnings-service and return image_url for worker/session."""
        worker_id, session_id = _parse_worker_and_session(action_input)
        payload = adapter.fetch_evidence_by_worker_session(worker_id, session_id)

        evidence_payload = payload.get('evidence') or {}
        image_url = str(evidence_payload.get('image_url', '')).strip()
        if not image_url:
            raise ValueError('evidence.image_url not found in earnings-service response')

        response = {
            'worker_id': worker_id,
            'session_id': session_id,
            'image_url': image_url,
            'evidence_id': evidence_payload.get('id')
        }
        return json.dumps(response)

    @tool('fetch_actual_earning_data')
    def fetch_actual_earning_data(action_input: str) -> str:
        """Fetch actual earning/session values for worker/session from earnings-service."""
        worker_id, session_id = _parse_worker_and_session(action_input)
        payload = adapter.fetch_earning_by_worker_session(worker_id, session_id)

        earning_payload = payload.get('earning') or {}
        session_payload = payload.get('session') or earning_payload.get('session') or {}

        actual_data = {
            'platform_name': str(session_payload.get('platform') or 'unknown').strip() or 'unknown',
            'gross_amount': float(earning_payload.get('gross_earned') or 0),
            'platform_deduction': float(earning_payload.get('platform_deductions') or 0),
            'net_amount': float(earning_payload.get('net_received') or 0)
        }

        return json.dumps(actual_data)

    @tool('analyze_receipt_image')
    def analyze_receipt_image(action_input: str) -> str:
        """Analyze receipt image and extract platform_name, gross_amount, platform_deduction, net_amount."""
        image_url = _parse_image_url(action_input)
        extracted = analyze_receipt_image_fn(image_url)
        return extracted.model_dump_json()

    return [fetch_evidence_image_url, fetch_actual_earning_data, analyze_receipt_image]
