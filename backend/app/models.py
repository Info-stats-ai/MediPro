from datetime import UTC, datetime
from enum import StrEnum
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


def utcnow() -> datetime:
    return datetime.now(UTC)


class SummaryStatus(StrEnum):
    NOT_STARTED = "not_started"
    CLINICAL_PROCESSING = "clinical_processing"
    CLINICAL_READY = "clinical_ready"
    PATIENT_PROCESSING = "patient_processing"
    COMPLETE = "complete"
    FAILED = "failed"


class UrgentFlag(BaseModel):
    label: str = Field(min_length=1, max_length=120)
    rationale: str = Field(min_length=1, max_length=500)
    severity: str = Field(pattern="^(low|medium|high|critical)$")


class ClinicalSummary(BaseModel):
    overview: str = Field(min_length=1, max_length=10_000)
    diagnoses: list[str] = Field(default_factory=list, max_length=100)
    medications: list[str] = Field(default_factory=list, max_length=100)
    plan: list[str] = Field(default_factory=list, max_length=100)
    follow_up: list[str] = Field(default_factory=list, max_length=100)
    urgent_flags: list[UrgentFlag] = Field(default_factory=list, max_length=30)
    disclaimer: str = Field(min_length=1, max_length=1_000)


class PatientSummary(BaseModel):
    overview: str = Field(min_length=1, max_length=10_000)
    what_to_do: list[str] = Field(default_factory=list, max_length=100)
    medications: list[str] = Field(default_factory=list, max_length=100)
    when_to_seek_help: list[str] = Field(default_factory=list, max_length=100)
    questions_for_clinician: list[str] = Field(default_factory=list, max_length=100)
    disclaimer: str = Field(min_length=1, max_length=1_000)


class DocumentCreate(BaseModel):
    title: Title
    text: str = Field(min_length=1)
    patient_reference: str | None = Field(default=None, max_length=200)

    @field_validator("text")
    @classmethod
    def nonblank_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("text cannot be blank")
        return value


class DocumentPatch(BaseModel):
    title: Title | None = None
    patient_reference: str | None = Field(default=None, max_length=200)
    clinical_summary: ClinicalSummary | None = None


class EditHistoryEntry(BaseModel):
    edited_at: datetime
    editor_user_id: str
    previous_clinical_summary: ClinicalSummary | None


class DocumentOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    text: str
    patient_reference: str | None = None
    source_type: str
    source_key: str | None = None
    summary_status: SummaryStatus
    clinical_summary: ClinicalSummary | None = None
    patient_summary: PatientSummary | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime
    edit_history: list[EditHistoryEntry] = Field(default_factory=list)


class DocumentList(BaseModel):
    items: list[DocumentOut]
    page: int
    page_size: int
    total: int
    pages: int


class SummarizeResponse(BaseModel):
    document_id: str
    status: SummaryStatus
    stream_url: str


class AdminStats(BaseModel):
    users: int
    documents: int
    completed: int
    failed: int
    pending: int


class AuthUser(BaseModel):
    id: str
    claims: dict[str, Any] = Field(default_factory=dict)
