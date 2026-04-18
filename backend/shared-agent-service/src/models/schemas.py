import re
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


OBJECT_ID_REGEX = re.compile(r'^[a-fA-F\d]{24}$')
UUID_REGEX = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', re.IGNORECASE)


class ScreenshotVerificationRequest(BaseModel):
    worker_id: str
    session_id: str

    @field_validator('worker_id')
    @classmethod
    def validate_worker_id(cls, value: str) -> str:
        if not OBJECT_ID_REGEX.match(value):
            raise ValueError('worker_id must be a valid Mongo ObjectId string')
        return value

    @field_validator('session_id')
    @classmethod
    def validate_session_id(cls, value: str) -> str:
        if not UUID_REGEX.match(value):
            raise ValueError('session_id must be a UUID string')
        return value


class ReceiptExtractionDraft(BaseModel):
    platform_name: str = Field(min_length=1)
    gross_amount: float = Field(ge=0)
    platform_deduction: float | None = Field(default=0, ge=0)
    deduction_label: str | None = None

    @field_validator('platform_name')
    @classmethod
    def normalize_platform(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError('platform_name cannot be empty')
        return normalized


class ReceiptExtraction(BaseModel):
    platform_name: str = Field(min_length=1)
    gross_amount: float = Field(ge=0)
    platform_deduction: float = Field(default=0, ge=0)
    net_amount: float = Field(ge=0)
    deduction_label: str | None = None


class ActualEarningData(BaseModel):
    platform_name: str = Field(min_length=1)
    gross_amount: float = Field(ge=0)
    platform_deduction: float = Field(ge=0)
    net_amount: float = Field(ge=0)


class AgentVerificationOutput(BaseModel):
    image_url: str = Field(min_length=1)
    extracted_data: ReceiptExtraction
    actual_data: ActualEarningData
    confidence_score: float | None = Field(default=None, ge=0, le=100)


class ScreenshotVerificationResponse(BaseModel):
    worker_id: str
    session_id: str
    image_url: str
    confidence_score: float = Field(ge=0, le=100)
    anomaly_detected: bool = False
    anomaly_types: list[str] = Field(default_factory=list)
    anomaly_confidence_threshold: float = Field(default=80.0, ge=0, le=100)
    data_from_picture: ReceiptExtraction
    actual_data: ActualEarningData
    cached: bool
    evaluated_at: datetime
