import re
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


OBJECT_ID_REGEX = re.compile(r'^[a-fA-F\d]{24}$')
UUID_REGEX = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    re.IGNORECASE
)


class AnomalyTriggerRequest(BaseModel):
    worker_id: str
    session_id: str
    evidence_id: str | None = None
    verified: bool = True

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

    @field_validator('evidence_id')
    @classmethod
    def validate_evidence_id(cls, value: str | None) -> str | None:
        if value is None:
            return value

        if not UUID_REGEX.match(value):
            raise ValueError('evidence_id must be a UUID string when provided')
        return value


class DirectAnomalyDetectionRequest(BaseModel):
    worker_name: str | None = None
    current_shift: 'ShiftSnapshot'
    historical_shifts: list['ShiftSnapshot'] = Field(default_factory=list)

    @field_validator('worker_name')
    @classmethod
    def normalize_worker_name(cls, value: str | None) -> str | None:
        if value is None:
            return None

        normalized = value.strip()
        return normalized or None


class ShiftSnapshot(BaseModel):
    session_id: str
    session_date: datetime
    platform: str
    hours_worked: float = Field(ge=0)
    gross_earned: float = Field(ge=0)
    platform_deductions: float = Field(ge=0)
    net_received: float = Field(ge=0)


class CommissionSpikeDetails(BaseModel):
    triggered: bool
    current_ratio: float = Field(ge=0)
    historical_avg_ratio: float = Field(ge=0)
    historical_std_ratio: float = Field(ge=0)
    threshold_ratio: float = Field(ge=0)
    z_score: float | None = None


class WageCollapseDetails(BaseModel):
    triggered: bool
    current_hourly_rate: float = Field(ge=0)
    rolling_avg_hourly_rate: float = Field(ge=0)
    threshold_hourly_rate: float = Field(ge=0)
    drop_percentage: float = Field(ge=0)


class GhostDeductionDetails(BaseModel):
    triggered: bool
    current_hours_worked: float = Field(ge=0)
    current_deduction_amount: float = Field(ge=0)
    deduction_per_hour: float = Field(ge=0)
    baseline_deduction_per_hour: float = Field(ge=0)
    proportional_threshold: float = Field(ge=0)


class WorkerProfile(BaseModel):
    id: str
    name: str
    platform: str | None = None
    category: str | None = None
    city: str | None = None
    zone: str | None = None


class AnomalyDetectionResponse(BaseModel):
    id: str
    worker_id: str
    session_id: str
    evidence_id: str | None = None
    anomaly_detected: bool
    triggered_calculations: list[str]
    primary_trigger: str | None = None
    explanation: str
    commission_spike: CommissionSpikeDetails
    wage_collapse: WageCollapseDetails
    ghost_deduction: GhostDeductionDetails
    worker: WorkerProfile | None = None
    current_shift: ShiftSnapshot
    historical_shifts_analyzed: int = Field(ge=0)
    created_at: datetime
    updated_at: datetime


class WorkerAnomalyListResponse(BaseModel):
    worker_id: str
    count: int = Field(ge=0)
    anomalies: list[AnomalyDetectionResponse]


class DirectAnomalyDetectionResponse(BaseModel):
    anomaly_detected: bool
    triggered_calculations: list[str]
    primary_trigger: str | None = None
    explanation: str
    commission_spike: CommissionSpikeDetails
    wage_collapse: WageCollapseDetails
    ghost_deduction: GhostDeductionDetails
    current_shift: ShiftSnapshot
    historical_shifts_analyzed: int = Field(ge=0)


class EmpatheticExplanation(BaseModel):
    explanation: str = Field(min_length=8, max_length=420)

    @field_validator('explanation')
    @classmethod
    def trim_explanation(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError('explanation cannot be empty')
        return normalized
