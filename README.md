# resumeSift

An AI-ML powered resume screening system in a single monorepo.

## Repository structure

- `frontend/` — React + TypeScript + Vite UI (from `resume-sifter-pro`)
- `backend/` — FastAPI + Python BERT screening API (from `resume-screening-system-backend`)

## Prerequisites

- Node.js 18+
- npm
- Python 3.10+
- pip

## Quick start (run both services)

### 1) Install frontend dependencies

```bash
npm --prefix frontend install
```

### 2) Install backend dependencies

```bash
python -m venv backend/.venv
source backend/.venv/bin/activate        # Windows: backend\\.venv\\Scripts\\activate
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
```

### 3) Start backend

```bash
source backend/.venv/bin/activate        # Windows: backend\\.venv\\Scripts\\activate
cd backend
uvicorn main:app --reload --port 8000
```

### 4) Start frontend (new terminal)

```bash
npm --prefix frontend run dev
```

Frontend runs on Vite dev server (typically `http://localhost:5173`) and can call the backend at `http://localhost:8000`.

## Root helper scripts

You can run service-specific commands from repo root:

```bash
npm run frontend:install
npm run frontend:dev
npm run frontend:build
npm run frontend:lint
npm run backend:dev
```

## Service-level docs

- Backend API and deployment docs: `backend/README.md`
- Frontend source and configuration: `frontend/`
