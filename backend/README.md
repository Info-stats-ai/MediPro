# MediNotes Pro backend

FastAPI service for tenant-isolated medical-note ingestion and AI-assisted clinical/patient summaries.

## Run locally

Requires Python 3.11+, MongoDB, and Tesseract (`brew install tesseract` on macOS).

```bash
cp .env.example .env
python -m venv .venv
source .venv/bin/activate
pip install -e ".[test]"
uvicorn app.main:app --reload
```

Set `DEV_AUTH_BYPASS=true` only for local development. Production and staging configuration reject the bypass. Otherwise, send a Clerk session JWT as `Authorization: Bearer <token>`.

## API behavior

- Every document operation includes the authenticated Clerk `sub` as `owner_id`; cross-tenant IDs return 404.
- Summary generation is accepted with HTTP 202. The SSE endpoint emits clinical progress/readiness before patient progress/readiness.
- Editing `clinical_summary` records the previous value and regenerates the patient summary.
- Uploaded source files use local storage by default or any S3-compatible provider (including R2).
- Logs include request metadata and a one-way user-ID hash, never note bodies.

Run tests with `pytest`.
