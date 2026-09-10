# MediNotes Pro

AI-assisted clinical documentation that converts pasted consultation notes or medical PDFs into two linked outputs:

- a structured, editable clinician summary
- an empathetic patient explanation written for an eighth-grade reading level

The patient handout also includes a **Teach-Back Check**: short questions patients can use to confirm they understood medications, follow-up, and urgent warning signs.

> **Clinical safety:** All generated content must be reviewed by a licensed clinician before clinical use. Patient explanations are generated from clinician notes and are not a substitute for direct medical advice.

## Architecture

```mermaid
flowchart LR
    U[Clinician browser] -->|Clerk session| V[Next.js on Vercel]
    V -->|Route Handlers + SSE| A[Next.js API]
    A -->|Verify session| C[Clerk]
    A -->|Tenant-scoped queries| M[(MongoDB Atlas)]
    A -->|PDF originals| S[S3 / Cloudflare R2]
    A -->|Dual-output tool call| L[Claude Sonnet 4.6]
    A -->|Digital PDF text| P[pdf-parse]
    A -->|Optional scanned PDF| O[External OCR provider]
```

Every database operation includes the authenticated Clerk `user_id`; API object IDs alone can never cross tenant boundaries. Files use hashed tenant prefixes and signed server-side access. No raw note text, extracted PDF text, output, filename, or token is written to application logs.

## Repository

```text
frontend/   Next.js 14 UI and API, MongoDB, Claude, Clerk, PDF ingestion
backend/    Legacy FastAPI implementation retained for reference
infra/      Infrastructure templates and demo seed data
```

## Local setup

Requirements: Node 20+, Docker, Clerk, MongoDB, and Anthropic accounts.

1. Copy environment templates:

   ```bash
   cp frontend/.env.example frontend/.env.local
   ```

2. Add Clerk, MongoDB, and Anthropic credentials to `frontend/.env.local`.
3. Start the full stack:

   ```bash
   docker compose up --build
   ```

The web app and API are both served from `http://localhost:3000`.

### Backend-first curl check

```bash
curl -sS -X POST http://localhost:3000/api/documents \
  -H 'Authorization: Bearer CLERK_SESSION_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"title":"Follow-up","text":"54F BP 152/92. Increase lisinopril to 20 mg. BMP in 2 weeks."}'

curl -N -X POST -H 'Authorization: Bearer CLERK_SESSION_TOKEN' http://localhost:3000/api/documents/DOCUMENT_ID/summarize
curl -N -H 'Authorization: Bearer CLERK_SESSION_TOKEN' http://localhost:3000/api/documents/DOCUMENT_ID/stream
```

With Clerk enabled, add `Authorization: Bearer <session-token>`.

## Environment variables

### Backend

| Variable | Purpose |
|---|---|
| `ENVIRONMENT` | `development`, `test`, `staging`, or `production` |
| `MONGODB_URI` / `MONGODB_DATABASE` | MongoDB Atlas connection and database |
| `ANTHROPIC_API_KEY` | Claude API key |
| `ANTHROPIC_MODEL` | Defaults to `claude-sonnet-4-6` |
| `CLERK_ISSUER` / `CLERK_AUDIENCE` | JWT verification settings |
| `CORS_ORIGINS` | Comma-separated trusted frontend origins |
| `STORAGE_BACKEND` | `local` or `s3` |
| `S3_BUCKET`, `S3_ENDPOINT_URL`, `S3_REGION` | AWS S3 or R2 destination |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Object-store credentials |
| `ADMIN_USER_IDS` | Comma-separated Clerk IDs allowed to view aggregate stats |

### Frontend

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk server key |

See each `.env.example` for the complete list.

## AI pipeline and guardrails

Claude receives one combined tool schema containing independent `clinical` and `patient_facing` objects. The API validates both objects before persistence and reports progress over SSE. Outputs retain provenance, generation status, token/cost telemetry, and clinical edit history. Editing a clinical summary marks its patient explanation stale and allows regeneration.

Prompt and API guardrails prohibit invented facts, require uncertainty to remain explicit, separate urgent warnings from routine follow-up, and never silently convert model output into a signed clinical record. This repository is a secure engineering baseline, not by itself a HIPAA certification; production use requires appropriate BAAs, access policies, retention rules, audit review, backups, and incident procedures.

## Tests

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e '.[test]'
pytest

cd ../frontend
npm ci
npm run lint
npm run typecheck
npm run build
```

Demo examples are in `infra/seed_samples.json`.

## Deployment

### Full stack — Vercel

Import this GitHub repository, set the root directory to `frontend`, add all variables from `frontend/.env.example`, and deploy. The UI and authenticated API Route Handlers share one origin; `NEXT_PUBLIC_API_URL` is only an optional local development override.

GitHub Actions runs backend tests, frontend lint/type/build, and a Docker build. After successful CI on `main`, deployment uses these repository secrets:

- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
Vercel scales the UI and Node.js Route Handlers. Native Tesseract is intentionally excluded from Vercel Functions; scanned PDFs use the optional `OCR_WEBHOOK_URL`.

## Data isolation

MongoDB stores shared collections with an immutable `user_id` tenant key and compound indexes such as `{user_id, created_at}`. This provides scalable isolation while retaining efficient search and pagination. Creating one physical file per user is not used: it is not a MongoDB isolation primitive and would make backups, indexes, connections, and autoscaling less reliable.
