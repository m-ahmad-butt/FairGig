from typing import Any
from urllib.parse import quote

import requests

from .interfaces import AdapterError, AuthServiceAdapter


class HttpAuthServiceAdapter(AuthServiceAdapter):
    def __init__(self, base_url: str, timeout_seconds: int = 15):
        self._base_url = base_url.rstrip('/')
        self._timeout_seconds = timeout_seconds

    def _request_json(self, path: str) -> dict[str, Any]:
        url = f'{self._base_url}{path}'

        try:
            response = requests.get(url, timeout=self._timeout_seconds)
        except requests.RequestException as exc:
            raise AdapterError(f'Failed to call auth-service: {exc}', 502) from exc

        if response.status_code == 404:
            raise AdapterError('Worker not found in auth-service', 404)

        if response.status_code >= 400:
            details = response.text.strip() or 'Unknown auth-service error'
            raise AdapterError(f'auth-service error ({response.status_code}): {details}', 502)

        try:
            return response.json()
        except ValueError as exc:
            raise AdapterError('auth-service returned a non-JSON response', 502) from exc

    def fetch_worker_profile(self, worker_id: str) -> dict[str, Any] | None:
        encoded_worker_id = quote(worker_id)
        candidate_paths = [
            f'/api/auth/workers/on-platform?worker_id={encoded_worker_id}',
            f'/workers/on-platform?worker_id={encoded_worker_id}'
        ]

        last_error: AdapterError | None = None
        for path in candidate_paths:
            try:
                payload = self._request_json(path)
                worker = payload.get('worker')
                if worker:
                    return worker
            except AdapterError as exc:
                last_error = exc
                continue

        if last_error is not None and last_error.status_code != 404:
            raise last_error

        return None
