from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone

router = APIRouter()

# ---------------------------------------------------------------------------
# In-memory job description store.
# Resets on server restart — the TypeScript frontend persists jobs in
# localStorage as a fallback, so this is acceptable for a stateless deployment.
# ---------------------------------------------------------------------------
_jobs: List[dict] = []


class JobIn(BaseModel):
    title: str = Field(..., max_length=120, description="Job title")
    department: Optional[str] = Field(None, max_length=60, description="Department name")
    description: Optional[str] = Field(None, max_length=8000, description="Full job description text")


class JobOut(BaseModel):
    id: str
    title: str
    department: Optional[str] = None
    description: Optional[str] = None
    created_at: str
    candidates_screened: int = 0


@router.get(
    "/",
    response_model=List[JobOut],
    summary="List all saved job descriptions",
)
def list_jobs():
    """Return all job descriptions currently stored in memory."""
    return _jobs


@router.post(
    "/",
    response_model=JobOut,
    status_code=201,
    summary="Save a new job description",
)
def create_job(job: JobIn):
    """
    Persist a new job description in the in-memory store.

    The TypeScript frontend calls this best-effort after saving locally;
    the returned object mirrors the local ``LocalJob`` shape.
    """
    new_job: dict = {
        "id": str(uuid.uuid4()),
        "title": job.title,
        "department": job.department,
        "description": job.description,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "candidates_screened": 0,
    }
    _jobs.insert(0, new_job)
    return new_job
