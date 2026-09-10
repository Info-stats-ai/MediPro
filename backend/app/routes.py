import asyncio
import json
import math
import re
import uuid
from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.auth import get_current_user, require_admin
from app.config import Settings, get_settings
from app.database import get_database
from app.models import (
    AdminStats,
    AuthUser,
    DocumentCreate,
    DocumentList,
    DocumentOut,
    DocumentPatch,
    SummarizeResponse,
    SummaryStatus,
    utcnow,
)
from app.services.extraction import ExtractionError, extract_pdf

router = APIRouter(prefix="/api")


def object_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=404, detail="Document not found")
    return ObjectId(value)


def serialize_document(document: dict[str, Any]) -> DocumentOut:
    data = dict(document)
    data["id"] = str(data.pop("_id"))
    data.pop("owner_id", None)
    for edit in data.get("edit_history", []):
        edit.pop("editor_user_id", None)
        edit["editor_user_id"] = "current_user"
    return DocumentOut.model_validate(data)


async def owned_document(database: AsyncIOMotorDatabase, document_id: str, owner_id: str) -> dict[str, Any]:
    document = await database.documents.find_one({"_id": object_id(document_id), "owner_id": owner_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


def initial_document(owner_id: str, payload: DocumentCreate, source_type: str, source_key: str | None) -> dict[str, Any]:
    now = utcnow()
    return {
        "owner_id": owner_id,
        "title": payload.title,
        "text": payload.text,
        "patient_reference": payload.patient_reference,
        "source_type": source_type,
        "source_key": source_key,
        "summary_status": SummaryStatus.NOT_STARTED,
        "clinical_summary": None,
        "patient_summary": None,
        "error_message": None,
        "created_at": now,
        "updated_at": now,
        "edit_history": [],
    }


@router.post("/documents", response_model=DocumentOut, status_code=201)
async def create_document(
    payload: DocumentCreate,
    request: Request,
    user: AuthUser = Depends(get_current_user),
    database: AsyncIOMotorDatabase = Depends(get_database),
    settings: Settings = Depends(get_settings),
) -> DocumentOut:
    if len(payload.text) > settings.max_note_chars:
        raise HTTPException(status_code=413, detail="Note exceeds configured size limit")
    result = await database.documents.insert_one(initial_document(user.id, payload, "text", None))
    return serialize_document(await database.documents.find_one({"_id": result.inserted_id}))


@router.post("/documents/upload", response_model=DocumentOut, status_code=201)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(..., min_length=1, max_length=200),
    patient_reference: str | None = Form(None, max_length=200),
    user: AuthUser = Depends(get_current_user),
    database: AsyncIOMotorDatabase = Depends(get_database),
    settings: Settings = Depends(get_settings),
) -> DocumentOut:
    if file.content_type != "application/pdf" or not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Only PDF uploads are supported")
    data = await file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="PDF exceeds configured size limit")
    if not data.startswith(b"%PDF"):
        raise HTTPException(status_code=422, detail="File is not a valid PDF")
    try:
        text = await extract_pdf(data)
    except ExtractionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if len(text) > settings.max_note_chars:
        raise HTTPException(status_code=413, detail="Extracted note exceeds configured size limit")

    key = f"{user.id}/{uuid.uuid4()}.pdf"
    await request.app.state.storage.put(key, data, "application/pdf")
    payload = DocumentCreate(title=title, text=text, patient_reference=patient_reference)
    try:
        result = await database.documents.insert_one(initial_document(user.id, payload, "pdf", key))
    except Exception:
        await request.app.state.storage.delete(key)
        raise
    return serialize_document(await database.documents.find_one({"_id": result.inserted_id}))


@router.get("/documents", response_model=DocumentList)
async def list_documents(
    user: AuthUser = Depends(get_current_user),
    database: AsyncIOMotorDatabase = Depends(get_database),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, min_length=1, max_length=100),
) -> DocumentList:
    query: dict[str, Any] = {"owner_id": user.id}
    if search:
        escaped = re.escape(search)
        query["$or"] = [
            {"title": {"$regex": escaped, "$options": "i"}},
            {"text": {"$regex": escaped, "$options": "i"}},
        ]
    total = await database.documents.count_documents(query)
    cursor = database.documents.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size)
    items = [serialize_document(item) async for item in cursor]
    return DocumentList(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        pages=math.ceil(total / page_size) if total else 0,
    )


@router.get("/documents/{document_id}", response_model=DocumentOut)
async def get_document(
    document_id: str,
    user: AuthUser = Depends(get_current_user),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> DocumentOut:
    return serialize_document(await owned_document(database, document_id, user.id))


async def run_summary(app: Any, database: AsyncIOMotorDatabase, document_id: ObjectId, owner_id: str, clinical_override=None) -> None:
    key = str(document_id)
    tenant_filter = {"_id": document_id, "owner_id": owner_id}
    try:
        await database.documents.update_one(
            tenant_filter,
            {"$set": {"summary_status": SummaryStatus.CLINICAL_PROCESSING, "error_message": None, "updated_at": utcnow()}},
        )
        await app.state.events.publish(key, {"event": "clinical_progress", "status": "processing"})
        document = await database.documents.find_one(tenant_filter)
        clinical, patient = await app.state.summarizer.summarize(document["text"], clinical_override)
        if clinical_override is not None:
            clinical = clinical_override
        await database.documents.update_one(
            tenant_filter,
            {"$set": {"clinical_summary": clinical.model_dump(), "summary_status": SummaryStatus.CLINICAL_READY, "updated_at": utcnow()}},
        )
        await app.state.events.publish(
            key, {"event": "clinical_ready", "status": "clinical_ready", "data": clinical.model_dump(mode="json")}
        )
        await database.documents.update_one(
            tenant_filter, {"$set": {"summary_status": SummaryStatus.PATIENT_PROCESSING, "updated_at": utcnow()}}
        )
        await app.state.events.publish(key, {"event": "patient_progress", "status": "processing"})
        await asyncio.sleep(0)
        await database.documents.update_one(
            tenant_filter,
            {"$set": {"patient_summary": patient.model_dump(), "summary_status": SummaryStatus.COMPLETE, "updated_at": utcnow()}},
        )
        await app.state.events.publish(
            key, {"event": "patient_ready", "status": "complete", "data": patient.model_dump(mode="json")}
        )
    except Exception:
        await database.documents.update_one(
            tenant_filter,
            {"$set": {"summary_status": SummaryStatus.FAILED, "error_message": "Summary generation failed", "updated_at": utcnow()}},
        )
        await app.state.events.publish(key, {"event": "error", "status": "failed", "message": "Summary generation failed"})


@router.post("/documents/{document_id}/summarize", response_model=SummarizeResponse, status_code=202)
async def summarize_document(
    document_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    user: AuthUser = Depends(get_current_user),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> SummarizeResponse:
    document = await owned_document(database, document_id, user.id)
    if document["summary_status"] in {
        SummaryStatus.CLINICAL_PROCESSING,
        SummaryStatus.PATIENT_PROCESSING,
    }:
        raise HTTPException(status_code=409, detail="Summary generation already in progress")
    await database.documents.update_one(
        {"_id": document["_id"], "owner_id": user.id},
        {"$set": {"summary_status": SummaryStatus.CLINICAL_PROCESSING, "error_message": None, "updated_at": utcnow()}},
    )
    background_tasks.add_task(run_summary, request.app, database, document["_id"], user.id)
    return SummarizeResponse(
        document_id=document_id,
        status=SummaryStatus.CLINICAL_PROCESSING,
        stream_url=f"/api/documents/{document_id}/stream",
    )


@router.patch("/documents/{document_id}", response_model=DocumentOut)
async def patch_document(
    document_id: str,
    payload: DocumentPatch,
    request: Request,
    background_tasks: BackgroundTasks,
    user: AuthUser = Depends(get_current_user),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> DocumentOut:
    document = await owned_document(database, document_id, user.id)
    changes = payload.model_dump(exclude_unset=True, mode="python")
    clinical = changes.get("clinical_summary")
    if clinical is not None:
        history = {
            "edited_at": utcnow(),
            "editor_user_id": user.id,
            "previous_clinical_summary": document.get("clinical_summary"),
        }
        changes["patient_summary"] = None
        changes["summary_status"] = SummaryStatus.PATIENT_PROCESSING
        update: dict[str, Any] = {"$set": {**changes, "updated_at": utcnow()}, "$push": {"edit_history": history}}
    else:
        update = {"$set": {**changes, "updated_at": utcnow()}}
    await database.documents.update_one({"_id": document["_id"], "owner_id": user.id}, update)
    if clinical is not None:
        from app.models import ClinicalSummary

        background_tasks.add_task(
            run_summary,
            request.app,
            database,
            document["_id"],
            user.id,
            ClinicalSummary.model_validate(clinical),
        )
    return serialize_document(await database.documents.find_one({"_id": document["_id"], "owner_id": user.id}))


@router.delete("/documents/{document_id}", status_code=204)
async def delete_document(
    document_id: str,
    request: Request,
    user: AuthUser = Depends(get_current_user),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> None:
    document = await owned_document(database, document_id, user.id)
    result = await database.documents.delete_one({"_id": document["_id"], "owner_id": user.id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Document not found")
    if document.get("source_key"):
        await request.app.state.storage.delete(document["source_key"])


@router.get("/documents/{document_id}/stream")
async def stream_document(
    document_id: str,
    request: Request,
    user: AuthUser = Depends(get_current_user),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> StreamingResponse:
    document = await owned_document(database, document_id, user.id)
    queue = request.app.state.events.subscribe(document_id)

    async def events():
        try:
            snapshot = {
                "event": "status",
                "status": document["summary_status"],
                "clinical_summary": document.get("clinical_summary"),
                "patient_summary": document.get("patient_summary"),
            }
            yield f"event: status\ndata: {json.dumps(snapshot, default=str)}\n\n"
            if document["summary_status"] in {SummaryStatus.COMPLETE, SummaryStatus.FAILED}:
                return
            while not await request.is_disconnected():
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15)
                    yield f"event: {event['event']}\ndata: {json.dumps(event, default=str)}\n\n"
                    if event["status"] in {"complete", "failed"}:
                        return
                except TimeoutError:
                    current = await database.documents.find_one(
                        {"_id": object_id(document_id), "owner_id": user.id},
                        {"summary_status": 1},
                    )
                    if not current:
                        return
                    yield ": keep-alive\n\n"
        finally:
            request.app.state.events.unsubscribe(document_id, queue)

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/admin/stats", response_model=AdminStats)
async def admin_stats(
    _: AuthUser = Depends(require_admin),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> AdminStats:
    pipeline = [
        {"$group": {"_id": None, "documents": {"$sum": 1}, "users": {"$addToSet": "$owner_id"}, "statuses": {"$push": "$summary_status"}}}
    ]
    rows = await database.documents.aggregate(pipeline).to_list(1)
    if not rows:
        return AdminStats(users=0, documents=0, completed=0, failed=0, pending=0)
    row = rows[0]
    statuses = row["statuses"]
    completed = statuses.count(SummaryStatus.COMPLETE)
    failed = statuses.count(SummaryStatus.FAILED)
    return AdminStats(
        users=len(row["users"]),
        documents=row["documents"],
        completed=completed,
        failed=failed,
        pending=row["documents"] - completed - failed,
    )
