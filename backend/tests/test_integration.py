import pytest

from tests.conftest import sample_clinical


@pytest.mark.asyncio
async def test_full_crud_summarize_and_regenerate_flow(api):
    created = await api.client.post(
        "/api/documents",
        json={
            "title": "Cardiology follow-up",
            "text": "Patient seen for blood pressure follow-up. Continue documented therapy.",
            "patient_reference": "MRN-redacted-1",
        },
    )
    assert created.status_code == 201, created.text
    document_id = created.json()["id"]
    assert created.json()["summary_status"] == "not_started"

    listed = await api.client.get("/api/documents", params={"search": "Cardiology"})
    assert listed.status_code == 200
    assert listed.json()["total"] == 1
    assert listed.json()["items"][0]["id"] == document_id

    fetched = await api.client.get(f"/api/documents/{document_id}")
    assert fetched.status_code == 200
    assert fetched.json()["title"] == "Cardiology follow-up"

    accepted = await api.client.post(f"/api/documents/{document_id}/summarize")
    assert accepted.status_code == 202, accepted.text
    assert accepted.json()["status"] == "clinical_processing"

    summarized = await api.client.get(f"/api/documents/{document_id}")
    assert summarized.json()["summary_status"] == "complete"
    assert summarized.json()["clinical_summary"]["overview"] == "Stable outpatient visit."
    assert summarized.json()["patient_summary"]["overview"].startswith("Your blood pressure")

    edited = sample_clinical("Clinician-corrected assessment.")
    patched = await api.client.patch(
        f"/api/documents/{document_id}",
        json={"title": "Updated visit", "clinical_summary": edited.model_dump(mode="json")},
    )
    assert patched.status_code == 200, patched.text

    regenerated = await api.client.get(f"/api/documents/{document_id}")
    assert regenerated.json()["title"] == "Updated visit"
    assert regenerated.json()["clinical_summary"]["overview"] == "Clinician-corrected assessment."
    assert regenerated.json()["summary_status"] == "complete"
    assert len(regenerated.json()["edit_history"]) == 1
    assert api.summarizer.calls[-1][1].overview == "Clinician-corrected assessment."

    api.settings.dev_user_id = "user_b"
    forbidden_as_not_found = await api.client.get(f"/api/documents/{document_id}")
    assert forbidden_as_not_found.status_code == 404
    api.settings.dev_user_id = "user_a"

    deleted = await api.client.delete(f"/api/documents/{document_id}")
    assert deleted.status_code == 204
    assert (await api.client.get(f"/api/documents/{document_id}")).status_code == 404


@pytest.mark.asyncio
async def test_admin_stats_requires_admin(api):
    created = await api.client.post(
        "/api/documents", json={"title": "Note", "text": "A medically relevant note."}
    )
    assert created.status_code == 201
    denied = await api.client.get("/api/admin/stats")
    assert denied.status_code == 403

    api.settings.admin_user_ids = "user_a"
    stats = await api.client.get("/api/admin/stats")
    assert stats.status_code == 200
    assert stats.json()["documents"] == 1
    assert stats.json()["users"] == 1
