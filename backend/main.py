from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.endpoints import screening, jobs
from services.ml_service import ml_service
import os

app = FastAPI(
    title="Resume Screener API",
    description="BERT-powered API for matching resumes with job descriptions",
    version="2.0.0"
)

# ---------------------------------------------------------------------------
# CORS configuration
#
# In development the frontend typically runs on localhost:3000 (CRA/Next.js)
# or localhost:5173 (Vite).  In production set either:
#   FRONTEND_URL  – a single origin, e.g. https://resume-sifter-pro.vercel.app
#   FRONTEND_URLS – comma-separated list of allowed origins
# ---------------------------------------------------------------------------
_dev_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

_raw = os.getenv("FRONTEND_URLS") or os.getenv("FRONTEND_URL", "")
# Note: FRONTEND_URLS takes precedence over FRONTEND_URL when both are set.
if _raw and _raw != "*":
    allowed_origins: list[str] = [o.strip() for o in _raw.split(",") if o.strip()]
else:
    # Fall back to permissive wildcard only when no specific origins are set.
    # The wildcard disables credentialed requests; fine for public read-only APIs
    # but you should set an explicit origin list in production.
    allowed_origins = ["*"]

# Always include dev origins so local development works out of the box.
if allowed_origins != ["*"]:
    for _origin in _dev_origins:
        if _origin not in allowed_origins:
            allowed_origins.append(_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allowed_origins != ["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
)

# Include routers
app.include_router(screening.router, prefix="/api/v1/screening", tags=["Screening"])
app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["Jobs"])


@app.get("/", tags=["Meta"])
def read_root():
    return {
        "message": "Welcome to the AI Resume Screener API",
        "status": "online",
        "version": "2.0.0",
        "model": ml_service.model_name,
        "docs": "/docs",
    }


@app.get("/health", tags=["Meta"])
def health_check():
    return {
        "status": "healthy",
        "model_loaded": ml_service.is_loaded,
    }
