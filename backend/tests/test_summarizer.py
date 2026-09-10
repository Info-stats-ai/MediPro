from types import SimpleNamespace

import pytest

from app.config import Settings
from app.services.summarizer import DISCLAIMER, Summarizer, chunk_text


def tool_payload():
    return {
        "clinical": {
            "overview": "Clinical overview",
            "diagnoses": [],
            "medications": [],
            "plan": [],
            "follow_up": [],
            "urgent_flags": [
                {"label": "Chest pain", "rationale": "Explicitly documented", "severity": "high"}
            ],
            "disclaimer": "model disclaimer",
        },
        "patient": {
            "overview": "Plain-language overview",
            "what_to_do": [],
            "medications": [],
            "when_to_seek_help": [],
            "questions_for_clinician": [],
            "disclaimer": "model disclaimer",
        },
    }


class FakeMessages:
    def __init__(self):
        self.kwargs = None

    def create(self, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(content=[SimpleNamespace(type="tool_use", input=tool_payload())])


def test_chunking_prefers_boundaries_and_preserves_text():
    source = ("alpha beta gamma\n" * 30).strip()
    chunks = chunk_text(source, 120)
    assert len(chunks) > 1
    assert all(len(chunk) <= 120 for chunk in chunks)
    assert "".join("".join(chunks).split()) == "".join(source.split())


@pytest.mark.asyncio
async def test_structured_summarizer_returns_both_outputs():
    messages = FakeMessages()
    client = SimpleNamespace(messages=messages)
    settings = Settings(environment="test", anthropic_api_key="test", summary_chunk_chars=100)
    clinical, patient = await Summarizer(settings, client=client).summarize("A documented note " * 20)

    assert clinical.overview == "Clinical overview"
    assert patient.overview == "Plain-language overview"
    assert clinical.disclaimer == DISCLAIMER
    assert patient.disclaimer == DISCLAIMER
    assert len(messages.kwargs["tools"]) == 1
    schema = messages.kwargs["tools"][0]["input_schema"]
    assert schema["required"] == ["clinical", "patient"]
    assert messages.kwargs["model"] == "claude-sonnet-4-6"
