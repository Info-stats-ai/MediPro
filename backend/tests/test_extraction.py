from unittest.mock import patch

import fitz
import pytest

from app.services.extraction import extract_pdf


def make_pdf(page_texts: list[str | None]) -> bytes:
    document = fitz.open()
    for text in page_texts:
        page = document.new_page()
        if text:
            page.insert_text((72, 72), text)
    data = document.tobytes()
    document.close()
    return data


@pytest.mark.asyncio
async def test_extracts_digital_pdf_without_ocr():
    data = make_pdf(["Digital clinical note with enough characters for direct extraction."])
    with patch("app.services.extraction.pytesseract.image_to_string") as ocr:
        text = await extract_pdf(data)
    assert "Digital clinical note" in text
    assert "[Page 1]" in text
    ocr.assert_not_called()


@pytest.mark.asyncio
async def test_uses_ocr_fallback_for_scanned_page():
    data = make_pdf([None])
    with patch(
        "app.services.extraction.pytesseract.image_to_string",
        return_value="OCR recovered scanned medical note.",
    ) as ocr:
        text = await extract_pdf(data)
    assert "OCR recovered scanned" in text
    ocr.assert_called_once()


@pytest.mark.asyncio
async def test_preserves_multipage_boundaries():
    data = make_pdf(
        [
            "First page has sufficient clinical text for digital extraction.",
            "Second page also has sufficient clinical text for extraction.",
        ]
    )
    text = await extract_pdf(data)
    assert "[Page 1]" in text
    assert "[Page 2]" in text
    assert text.index("First page") < text.index("Second page")
