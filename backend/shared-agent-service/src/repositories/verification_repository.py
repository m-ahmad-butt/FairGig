from datetime import datetime, timezone
from typing import Any

from pymongo import MongoClient, ReturnDocument


class ScreenshotVerificationRepository:
    def __init__(self, database_url: str, collection_name: str):
        self._client = MongoClient(database_url, serverSelectionTimeoutMS=1500)
        database = self._client.get_default_database()
        if database is None:
            database = self._client['shared_agent_service']

        self._collection = database[collection_name]
        self._indexes_initialized = False

    def _ensure_indexes(self) -> None:
        if self._indexes_initialized:
            return

        try:
            self._collection.create_index(
                [('worker_id', 1), ('session_id', 1)],
                unique=True,
                name='worker_session_unique'
            )
            self._indexes_initialized = True
        except Exception:
            # Database might be temporarily unavailable at startup. Retry on next write.
            self._indexes_initialized = False

    def ping(self) -> None:
        self._client.admin.command('ping')

    def find_by_worker_and_session(self, worker_id: str, session_id: str) -> dict[str, Any] | None:
        document = self._collection.find_one({'worker_id': worker_id, 'session_id': session_id})
        return self._normalize(document)

    def upsert_result(
        self,
        worker_id: str,
        session_id: str,
        image_url: str,
        platform_name: str,
        gross_amount: float,
        platform_deduction: float,
        net_amount: float,
        confidence_score: float,
        extracted_payload: dict[str, Any],
        actual_payload: dict[str, Any]
    ) -> dict[str, Any]:
        self._ensure_indexes()

        now = datetime.now(timezone.utc)
        update_document = {
            'worker_id': worker_id,
            'session_id': session_id,
            'image_url': image_url,
            'platform_name': platform_name,
            'gross_amount': gross_amount,
            'platform_deduction': platform_deduction,
            'net_amount': net_amount,
            'confidence_score': confidence_score,
            'extracted_payload': extracted_payload,
            'actual_payload': actual_payload,
            'updated_at': now
        }

        document = self._collection.find_one_and_update(
            {'worker_id': worker_id, 'session_id': session_id},
            {
                '$set': update_document,
                '$setOnInsert': {'created_at': now}
            },
            upsert=True,
            return_document=ReturnDocument.AFTER
        )

        return self._normalize(document) or {}

    def _normalize(self, document: dict[str, Any] | None) -> dict[str, Any] | None:
        if document is None:
            return None

        normalized = dict(document)
        if '_id' in normalized:
            normalized['_id'] = str(normalized['_id'])

        return normalized
