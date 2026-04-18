from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from pymongo import MongoClient, ReturnDocument


class AnomalyRepository:
    def __init__(self, database_url: str, collection_name: str):
        self._client = MongoClient(database_url, serverSelectionTimeoutMS=1500)
        database = self._client.get_default_database()
        if database is None:
            database = self._client['anomaly_service']

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
            self._collection.create_index(
                [('worker_id', 1), ('updated_at', -1)],
                name='worker_recent_lookup'
            )
            self._indexes_initialized = True
        except Exception:
            # Retry index initialization later if DB is not ready at startup.
            self._indexes_initialized = False

    def ping(self) -> None:
        self._client.admin.command('ping')

    def upsert_result(self, worker_id: str, session_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        self._ensure_indexes()

        now = datetime.now(timezone.utc)
        update_document = {
            **payload,
            'worker_id': worker_id,
            'session_id': session_id,
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

    def find_by_id(self, anomaly_id: str) -> dict[str, Any] | None:
        try:
            object_id = ObjectId(anomaly_id)
        except Exception:
            return None

        document = self._collection.find_one({'_id': object_id})
        return self._normalize(document)

    def list_by_worker(self, worker_id: str, limit: int = 20) -> list[dict[str, Any]]:
        cursor = self._collection.find({'worker_id': worker_id}).sort('updated_at', -1).limit(limit)
        return [self._normalize(item) or {} for item in cursor]

    def _normalize(self, document: dict[str, Any] | None) -> dict[str, Any] | None:
        if document is None:
            return None

        normalized = dict(document)
        if '_id' in normalized:
            normalized['_id'] = str(normalized['_id'])

        return normalized
