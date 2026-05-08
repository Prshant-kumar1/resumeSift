from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from services.ml_service import ml_service
from datetime import datetime, timezone
import pandas as pd
import numpy as np
import math
import io
import json

router = APIRouter()

# ---------------------------------------------------------------------------
# In-memory screening history store.
# Each entry mirrors the ScreenResponse fields plus candidate_name, job_title,
# and created_at so the dashboard /screening/history endpoint can serve both
# single and batch results in a uniform shape.
# Resets on server restart (same trade-off as the jobs store).
# ---------------------------------------------------------------------------
_history: List[dict] = []


def _make_history_entry(result: dict, *, candidate_name: Optional[str] = None, job_title: Optional[str] = None) -> dict:
    """Build a history record from a screening result dict."""
    entry: Dict[str, Any] = {
        "result": result.get("result"),
        "probability": result.get("probability"),
        "score": result.get("score"),
        "match": result.get("match"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if candidate_name:
        entry["candidate_name"] = candidate_name
    if job_title:
        entry["job_title"] = job_title
    return entry


# ---------------------------------------------------------------------------
# Request / response schemas
# Explicit Pydantic models make the OpenAPI spec useful for TypeScript clients
# (e.g. generate typed API clients with openapi-typescript).
# ---------------------------------------------------------------------------

class ScreenRequest(BaseModel):
    resume_text: str = Field(..., description="Full text of the candidate's resume")
    job_description: str = Field(..., description="Job description to match against")
    job_title: Optional[str] = Field(None, description="Optional job title (informational)")


class ScreenResponse(BaseModel):
    result: str = Field(..., description='"Match" or "No Match"')
    probability: float = Field(..., description="Match confidence as a percentage (0-100)")
    confidence: float = Field(..., description="Same as probability")
    score: float = Field(..., description="Same as probability")
    matched_skills: List[str] = Field(..., description="Keywords present in both resume and JD")
    missing_skills: List[str] = Field(..., description="JD keywords absent from the resume")
    recommendation: str = Field(..., description="Short human-readable recommendation")
    match: bool = Field(..., description="True if probability ≥ threshold")
    keyword_overlap: int = Field(..., description="Number of shared keywords")
    resume_keywords: Dict[str, int] = Field(..., description="Top keywords from the resume")
    job_keywords: Dict[str, int] = Field(..., description="Top keywords from the job description")
    model: str = Field(..., description="Model name used for inference")


class BatchResponse(BaseModel):
    results: List[Dict[str, Any]] = Field(..., description="One entry per resume processed")
    total_processed: int = Field(..., description="Total number of resumes processed")


# ── JSON batch request (used by the TypeScript frontend) ───────────────────────

class ResumeItem(BaseModel):
    resume_text: str = Field(..., description="Full text of the candidate's resume")
    candidate_name: Optional[str] = Field(None, description="Optional candidate display name")


class BatchJsonRequest(BaseModel):
    resumes: List[ResumeItem] = Field(..., description="List of resumes to screen")
    job_description: str = Field(..., description="Job description to match against")
    threshold: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Match threshold override (0-1). Defaults to server MATCH_THRESHOLD.",
    )


class ModelInfoResponse(BaseModel):
    model_name: str
    model_loaded: bool
    match_threshold: float
    embedding_dimensions: int
    model_parameters: str
    description: str


class ErrorResponse(BaseModel):
    detail: str


def sanitize_value(v):
    """Replace NaN / Infinity with None so JSON serialization succeeds."""
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        f = float(v)
        return None if math.isnan(f) or math.isinf(f) else f
    if isinstance(v, np.bool_):
        return bool(v)
    if isinstance(v, dict):
        return {k: sanitize_value(val) for k, val in v.items()}
    if isinstance(v, list):
        return [sanitize_value(i) for i in v]
    return v


def sanitize_row(row: dict) -> dict:
    """Recursively sanitize every value in a result row."""
    return {k: sanitize_value(v) for k, v in row.items()}


@router.post(
    "/screen",
    response_model=ScreenResponse,
    responses={500: {"model": ErrorResponse}},
    summary="Screen a single resume",
)
async def screen_single_resume(request: ScreenRequest):
    """
    Screen one resume against a job description using BERT semantic similarity.

    Returns a match decision plus confidence scores, matched/missing skills, and a recommendation.
    """
    result = ml_service.predict_match(request.resume_text, request.job_description)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    _history.insert(0, _make_history_entry(result, job_title=request.job_title))
    return result


@router.post(
    "/batch",
    response_model=BatchResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    summary="Screen multiple resumes (JSON body)",
)
async def screen_batch_json(request: BatchJsonRequest):
    """
    Screen a list of resumes against a single job description.

    Accepts a JSON body — designed for the TypeScript frontend.
    Uses BERT batch encoding for efficient processing (~10× faster than one-by-one).

    An optional ``threshold`` (0–1) overrides the server-level ``MATCH_THRESHOLD``.
    """
    if not request.resumes:
        raise HTTPException(status_code=400, detail="resumes list must not be empty.")

    resume_texts = [item.resume_text for item in request.resumes]
    predictions = ml_service.batch_predict(
        resume_texts, request.job_description, threshold=request.threshold
    )

    results = []
    batch_history: List[dict] = []
    for item, prediction in zip(request.resumes, predictions):
        if "error" in prediction:
            row: Dict[str, Any] = {
                "error": prediction["error"],
                "result": "No Match",
                "probability": 0,
                "confidence": 0,
                "score": 0,
                "matched_skills": [],
                "missing_skills": [],
                "recommendation": "",
                "match": False,
            }
        else:
            row = dict(prediction)
        if item.candidate_name:
            row["candidate_name"] = item.candidate_name
        results.append(sanitize_row(row))
        batch_history.append(_make_history_entry(row, candidate_name=item.candidate_name))

    # Prepend in one pass so newest entries appear first (avoids O(n²) insert(0, …))
    _history[:0] = reversed(batch_history)
    return JSONResponse(content={"results": results, "total_processed": len(results)})


@router.post(
    "/screen/batch",
    response_model=BatchResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    summary="Screen multiple resumes from a CSV file",
)
async def screen_batch_resumes(
    job_description: str = Form(..., description="Job description to match all resumes against"),
    csv_file: UploadFile = File(..., description="CSV file with a 'resume_text' column (other columns are passed through)"),
):
    """
    Screen multiple resumes from a CSV file against a single job description.

    Uses BERT batch encoding for efficient processing (~10× faster than one-by-one).

    **CSV requirements:**
    - Must contain a `resume_text` column with the full resume text.
    - Optional columns (`candidate_name`, `email`, etc.) are preserved in the output.
    """
    if not csv_file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported for batch screening.")
    
    try:
        content = await csv_file.read()
        df = pd.read_csv(io.BytesIO(content))
        
        if 'resume_text' not in df.columns:
            raise HTTPException(status_code=400, detail="CSV must contain a 'resume_text' column.")

        # Use batch_predict for efficient BERT encoding (all resumes in one pass)
        resume_texts = [str(row) for row in df['resume_text']]
        predictions = ml_service.batch_predict(resume_texts, job_description)

        results = []
        batch_history: List[dict] = []
        for index, (_, row) in enumerate(df.iterrows()):
            # Combine prediction with original metadata
            result_row = row.to_dict()
            
            prediction = predictions[index]
            if "error" not in prediction:
                result_row.update(prediction)
            else:
                result_row.update({
                    "error": prediction["error"],
                    "match": False,
                    "probability": {"match": 0, "no_match": 1}
                })
                 
            # Sanitize NaN / numpy types before serialization
            results.append(sanitize_row(result_row))
            candidate_name = str(row.get("candidate_name", "")).strip() or None
            batch_history.append(_make_history_entry(result_row, candidate_name=candidate_name))

        # Prepend in one pass so newest entries appear first (avoids O(n²) insert(0, …))
        _history[:0] = reversed(batch_history)
        return JSONResponse(content={"results": results, "total_processed": len(results)})
        
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Error processing CSV. Please check server logs for details.",
        )


@router.get(
    "/history",
    summary="Return screening history",
)
async def get_screening_history():
    """
    Return all screening results recorded since the last server restart,
    ordered newest-first.  Includes both single and batch screening runs.
    """
    return _history


@router.get(
    "/model-info",
    response_model=ModelInfoResponse,
    summary="Return information about the active ML model",
)
async def get_model_info():
    """Returns information about the current ML model."""
    return {
        "model_name": ml_service.model_name,
        "model_loaded": ml_service.is_loaded,
        "match_threshold": ml_service.threshold,
        "embedding_dimensions": 384,
        "model_parameters": "22M",
        "description": "BERT-based semantic similarity using sentence-transformers/all-MiniLM-L6-v2",
    }
