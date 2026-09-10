from types import SimpleNamespace

import pytest
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient

from app.config import Settings
from app.main import create_app
from app.models import ClinicalSummary, PatientSummary


def sample_clinical(overview: str = "Stable outpatient visit.") -> ClinicalSummary:
    return ClinicalSummary(
        overview=overview,
        diagnoses=["Hypertension"],
        medications=["Continue lisinopril as documented"],
        plan=["Monitor blood pressure"],
        follow_up=["Follow up with clinician"],
        urgent_flags=[],
        disclaimer="draft",
    )


def sample_patient() -> PatientSummary:
    return PatientSummary(
        overview="Your blood pressure care was reviewed.",
        what_to_do=["Check your blood pressure"],
        medications=["Take medicines only as directed"],
        when_to_seek_help=["Seek urgent care for severe new symptoms"],
        questions_for_clinician=["What blood pressure goal is right for me?"],
        disclaimer="draft",
    )


class FakeSummarizer:
    def __init__(self) -> None:
        self.calls = []

    async def summarize(self, text, clinical_override=None):
        self.calls.append((text, clinical_override))
        return sample_clinical(), sample_patient()


class MemoryStorage:
    def __init__(self) -> None:
        self.items = {}

    async def put(self, key, data, content_type):
        self.items[key] = data
        return key

    async def delete(self, key):
        self.items.pop(key, None)


@pytest.fixture
async def api():
    mongo = AsyncMongoMockClient()
    database = mongo.medinotes_test
    fake_summarizer = FakeSummarizer()
    storage = MemoryStorage()
    settings = Settings(
        environment="test",
        dev_auth_bypass=True,
        dev_user_id="user_a",
        rate_limit="10000/minute",
        anthropic_api_key="test",
    )
    app = create_app(settings, database=database, summarizer=fake_summarizer, storage=storage)
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            yield SimpleNamespace(
                client=client,
                app=app,
                database=database,
                summarizer=fake_summarizer,
                storage=storage,
                settings=settings,
            )
