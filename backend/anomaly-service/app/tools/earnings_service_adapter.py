from typing import Any

import requests

from .interfaces import AdapterError, EarningsServiceAdapter


class HttpEarningsServiceAdapter(EarningsServiceAdapter):
    def __init__(self, base_url: str, timeout_seconds: int = 15):
        self._base_url = base_url.rstrip('/')
        self._timeout_seconds = timeout_seconds

    def _request_json(self, path: str) -> dict[str, Any]:
        url = f'{self._base_url}{path}'

        try:
            response = requests.get(url, timeout=self._timeout_seconds)
        except requests.RequestException as exc:
            raise AdapterError(f'Failed to call earnings-service: {exc}', 502) from exc

        if response.status_code == 404:
            raise AdapterError('Requested worker/session data was not found in earnings-service', 404)

        if response.status_code >= 400:
            details = response.text.strip() or 'Unknown earnings-service error'
            raise AdapterError(
                f'earnings-service error ({response.status_code}): {details}',
                502
            )

        try:
            return response.json()
        except ValueError as exc:
            raise AdapterError('earnings-service returned a non-JSON response', 502) from exc

    def fetch_worker_sessions(self, worker_id: str) -> dict[str, Any]:
        return self._request_json(f'/work-sessions/worker/{worker_id}')

    def fetch_earning_by_worker_session(self, worker_id: str, session_id: str) -> dict[str, Any]:
        return self._request_json(f'/earnings/worker/{worker_id}/session/{session_id}')

    def fetch_evidence_by_worker_session(self, worker_id: str, session_id: str) -> dict[str, Any]:
        return self._request_json(f'/evidence/worker/{worker_id}/session/{session_id}')
