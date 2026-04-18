from abc import ABC, abstractmethod
from typing import Any


class AdapterError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


class EarningsServiceAdapter(ABC):
    @abstractmethod
    def fetch_evidence_by_worker_session(self, worker_id: str, session_id: str) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def fetch_earning_by_worker_session(self, worker_id: str, session_id: str) -> dict[str, Any]:
        raise NotImplementedError
