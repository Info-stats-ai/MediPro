import asyncio
from collections.abc import Callable
from typing import Any

from anthropic import Anthropic

from app.config import Settings
from app.models import ClinicalSummary, PatientSummary

DISCLAIMER = (
    "AI-generated draft for clinician review. It may contain errors or omissions and does not "
    "replace professional medical judgment, diagnosis, or emergency care."
)

SUMMARY_TOOL = {
    "name": "create_medinotes_summaries",
    "description": "Return both a clinical summary and a plain-language patient summary.",
    "input_schema": {
        "type": "object",
        "additionalProperties": False,
        "required": ["clinical", "patient"],
        "properties": {
            "clinical": {
                "type": "object",
                "additionalProperties": False,
                "required": ["overview", "diagnoses", "medications", "plan", "follow_up", "urgent_flags", "disclaimer"],
                "properties": {
                    "overview": {"type": "string"},
                    "diagnoses": {"type": "array", "items": {"type": "string"}},
                    "medications": {"type": "array", "items": {"type": "string"}},
                    "plan": {"type": "array", "items": {"type": "string"}},
                    "follow_up": {"type": "array", "items": {"type": "string"}},
                    "urgent_flags": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["label", "rationale", "severity"],
                            "properties": {
                                "label": {"type": "string"},
                                "rationale": {"type": "string"},
                                "severity": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
                            },
                        },
                    },
                    "disclaimer": {"type": "string"},
                },
            },
            "patient": {
                "type": "object",
                "additionalProperties": False,
                "required": ["overview", "what_to_do", "medications", "when_to_seek_help", "questions_for_clinician", "disclaimer"],
                "properties": {
                    "overview": {"type": "string"},
                    "what_to_do": {"type": "array", "items": {"type": "string"}},
                    "medications": {"type": "array", "items": {"type": "string"}},
                    "when_to_seek_help": {"type": "array", "items": {"type": "string"}},
                    "questions_for_clinician": {"type": "array", "items": {"type": "string"}},
                    "disclaimer": {"type": "string"},
                },
            },
        },
    },
}


def chunk_text(text: str, size: int) -> list[str]:
    if size < 100:
        raise ValueError("chunk size must be at least 100")
    chunks: list[str] = []
    remaining = text.strip()
    while remaining:
        if len(remaining) <= size:
            chunks.append(remaining)
            break
        split = remaining.rfind("\n", 0, size)
        if split < size // 2:
            split = remaining.rfind(" ", 0, size)
        if split < size // 2:
            split = size
        chunks.append(remaining[:split].strip())
        remaining = remaining[split:].strip()
    return chunks


class Summarizer:
    def __init__(self, settings: Settings, client: Any | None = None) -> None:
        self.settings = settings
        self.client = client or Anthropic(api_key=settings.anthropic_api_key)

    def _call(self, text: str, clinical_override: ClinicalSummary | None = None) -> dict[str, Any]:
        chunks = chunk_text(text, self.settings.summary_chunk_chars)
        source = "\n\n".join(f"<note_part index='{i + 1}'>\n{part}\n</note_part>" for i, part in enumerate(chunks))
        edit_context = (
            f"\nClinician-edited clinical summary (authoritative; regenerate patient output from it):\n"
            f"{clinical_override.model_dump_json()}"
            if clinical_override
            else ""
        )
        response = self.client.messages.create(
            model=self.settings.anthropic_model,
            max_tokens=6000,
            temperature=0,
            system=(
                "You summarize medical notes without inventing facts. Preserve uncertainty. "
                "Flag explicit potentially urgent findings but never diagnose urgency from missing context. "
                f"Both outputs must include this exact disclaimer: {DISCLAIMER}"
            ),
            messages=[{"role": "user", "content": f"Create both summaries.\n{source}{edit_context}"}],
            tools=[SUMMARY_TOOL],
            tool_choice={"type": "tool", "name": SUMMARY_TOOL["name"]},
        )
        block = next(
            (item for item in response.content if getattr(item, "type", None) == "tool_use"),
            None,
        )
        if not block:
            raise ValueError("Model did not return structured tool output")
        return block.input

    async def summarize(
        self, text: str, clinical_override: ClinicalSummary | None = None
    ) -> tuple[ClinicalSummary, PatientSummary]:
        result = await asyncio.to_thread(self._call, text, clinical_override)
        clinical = ClinicalSummary.model_validate(result["clinical"])
        patient = PatientSummary.model_validate(result["patient"])
        clinical.disclaimer = DISCLAIMER
        patient.disclaimer = DISCLAIMER
        return clinical, patient
