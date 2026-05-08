# Resume Screener API

BERT-powered resume screening backend built with **FastAPI**.  
It exposes a REST API that the **resumeSift frontend** (`../frontend`) consumes.

---

## Table of contents

- [Architecture](#architecture)
- [API reference](#api-reference)
- [Running locally](#running-locally)
- [Environment variables](#environment-variables)
- [Docker](#docker)
- [Deployment](#deployment)

---

## Architecture

```
resume-sifter-pro (TypeScript / React / Vite)
        │
        │  HTTP/JSON
        ▼
resume-screening-system-backend (FastAPI / Python)
        │
        │  sentence-transformers
        ▼
  all-MiniLM-L6-v2 (22M params, 384-dim BERT embeddings)
```

---

## API reference

Interactive docs are available at **`/docs`** (Swagger UI) and **`/redoc`** when the server is running.

### Base URL

| Environment | URL |
|-------------|-----|
| Local       | `http://localhost:8000` |
| Production  | Set by your hosting provider (Railway, Render, etc.) |

### Endpoints

#### `GET /health`

Returns the server and model status.

```jsonc
// 200 OK
{ "status": "healthy", "model_loaded": true }
```

---

#### `POST /api/v1/screening/screen`

Screen a **single** resume against a job description.

**Request body** (`application/json`):

```jsonc
{
  "resume_text": "Full text of the candidate's resume…",
  "job_description": "Full text of the job posting…"
}
```

**Response** (`200 OK`):

```jsonc
{
  "result": "Match",               // "Match" or "No Match"
  "probability": 78.2,             // match confidence (0–100)
  "confidence": 78.2,              // same as probability
  "score": 78.2,                   // same as probability
  "matched_skills": ["python", "machine learning"],
  "missing_skills": ["docker", "kubernetes"],
  "recommendation": "Strong overall alignment. Key skills present: python, machine learning. Consider assessing: docker.",
  "match": true,                   // true if probability ≥ server threshold
  "keyword_overlap": 8,
  "resume_keywords": { "python": 5, "machine": 3 },
  "job_keywords":    { "python": 4, "learning": 3 },
  "model": "sentence-transformers/all-MiniLM-L6-v2"
}
```

**Error** (`500`):

```jsonc
{ "detail": "BERT model not loaded. Please check server logs." }
```

---

---

#### `POST /api/v1/screening/batch`

Screen multiple resumes via a **JSON body** — used by the TypeScript frontend.

**Request body** (`application/json`):

```jsonc
{
  "resumes": [
    { "resume_text": "Full resume text…", "candidate_name": "Alice" },
    { "resume_text": "Another resume…",   "candidate_name": "Bob" }
  ],
  "job_description": "Full job posting text…",
  "threshold": 0.5   // optional, overrides server MATCH_THRESHOLD (0–1)
}
```

**Response** (`200 OK`):

```jsonc
{
  "results": [
    {
      "candidate_name": "Alice",
      "result": "Match",
      "probability": 82.0,
      "confidence": 82.0,
      "score": 82.0,
      "matched_skills": ["python", "fastapi"],
      "missing_skills": ["docker"],
      "recommendation": "Strong overall alignment…",
      "match": true,
      "keyword_overlap": 10,
      "resume_keywords": {},
      "job_keywords": {},
      "model": "sentence-transformers/all-MiniLM-L6-v2"
    }
  ],
  "total_processed": 2
}
```

---

#### `POST /api/v1/screening/screen/batch`

Screen multiple resumes from a **CSV file** (legacy multipart endpoint).

**Request** (`multipart/form-data`):

| Field | Type | Description |
|-------|------|-------------|
| `job_description` | `string` | Job description text |
| `csv_file` | `File` | CSV with a required `resume_text` column |

**Response** (`200 OK`) — same shape as `/batch` above, with original CSV columns also included in each row.

---

#### `GET /api/v1/jobs`

List all job descriptions saved in memory.

```jsonc
// 200 OK
[
  {
    "id": "uuid",
    "title": "Senior Python Engineer",
    "department": "Engineering",
    "description": "…",
    "created_at": "2025-01-01T00:00:00+00:00",
    "candidates_screened": 0
  }
]
```

---

#### `POST /api/v1/jobs`

Save a new job description.

**Request body** (`application/json`):

```jsonc
{
  "title": "Senior Python Engineer",
  "department": "Engineering",       // optional
  "description": "Full JD text…"
}
```

Returns the created job object (`201 Created`).

---

#### `GET /api/v1/screening/model-info`

Returns information about the active ML model.

```jsonc
{
  "model_name": "sentence-transformers/all-MiniLM-L6-v2",
  "model_loaded": true,
  "match_threshold": 0.5,
  "embedding_dimensions": 384,
  "model_parameters": "22M",
  "description": "BERT-based semantic similarity using sentence-transformers/all-MiniLM-L6-v2"
}
```

---

## Running locally

### Prerequisites

- Python 3.10+
- `pip`

### Steps

```bash
# 1. Go to the backend directory in this monorepo
cd backend

# 2. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 3. Install CPU-only PyTorch (avoids downloading 3 GB of CUDA libraries)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# 4. Install the remaining dependencies
pip install -r requirements.txt

# 5. Copy the example env file and adjust as needed
cp .env.example .env

# 6. Start the development server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Open `http://localhost:8000/docs` for the Swagger UI.

### Running with the TypeScript frontend

```bash
# Terminal 1 – backend
uvicorn main:app --reload --port 8000

# Terminal 2 – frontend
cd ../frontend
cp .env.example .env.local
# Set VITE_API_BASE_URL=http://localhost:8000 in .env.local
npm install
npm run dev
```

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `10000` (fallback) | Port the server listens on. Render injects this automatically; the container falls back to `10000` if it is not set. |
| `FRONTEND_URL` | _(none)_ | Single allowed CORS origin (your Lovable / frontend URL) |
| `FRONTEND_URLS` | _(none)_ | Comma-separated CORS origins (production) |
| `MATCH_THRESHOLD` | `0.50` | Cosine similarity threshold for match decision |

> **Development note:** `http://localhost:3000` and `http://localhost:5173` are always allowed so you can run the frontend locally without any extra configuration.

See `.env.example` for a documented template.

---

## Docker

```bash
docker build -t resume-screener-api .
docker run -p 10000:10000 \
  -e FRONTEND_URL=http://localhost:5173 \
  resume-screener-api
```

The BERT model (~90 MB) is downloaded and baked into the image at build time, so the container is ready to serve requests immediately on startup.

---

## Deployment

The backend is designed for **Render** (Docker deployment):

1. Push this repository to GitHub.
2. In the Render dashboard create a new **Web Service**, connect the repo, and select **Docker** as the runtime.
3. Render injects `PORT` automatically — leave it unset in your environment settings.
4. Add a `FRONTEND_URL` environment variable set to your Lovable frontend URL (e.g. `https://your-app.lovable.app`). This is required for CORS to work correctly.
5. Deploy. Because the model is pre-baked into the Docker image the service starts up within a few seconds.

> **Free-tier note:** Render's free tier spins the service down after 15 minutes of inactivity. The first request after a sleep will take ~30 seconds while the container restarts. Upgrade to a paid instance type to avoid spin-down.
