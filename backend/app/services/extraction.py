import asyncio
import io

import fitz
import pytesseract
from PIL import Image


class ExtractionError(ValueError):
    pass


def _extract_sync(data: bytes, minimum_text_chars: int = 30) -> str:
    try:
        pdf = fitz.open(stream=data, filetype="pdf")
    except Exception as exc:
        raise ExtractionError("Invalid or unreadable PDF") from exc
    if pdf.page_count == 0:
        raise ExtractionError("PDF contains no pages")

    pages: list[str] = []
    try:
        for page_number, page in enumerate(pdf):
            text = page.get_text("text").strip()
            if len(text) < minimum_text_chars:
                pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                image = Image.open(io.BytesIO(pixmap.tobytes("png")))
                ocr_text = pytesseract.image_to_string(image).strip()
                if len(ocr_text) > len(text):
                    text = ocr_text
            if text:
                pages.append(f"[Page {page_number + 1}]\n{text}")
    finally:
        pdf.close()
    if not pages:
        raise ExtractionError("No text could be extracted from the PDF")
    return "\n\n".join(pages)


async def extract_pdf(data: bytes) -> str:
    return await asyncio.to_thread(_extract_sync, data)
