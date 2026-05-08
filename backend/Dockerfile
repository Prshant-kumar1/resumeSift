# Use a slim Python base image to reduce size
FROM python:3.10-slim

# Prevent Python from writing pyc files and buffering stdout
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Store the HuggingFace model cache inside the image so the BERT model is
# pre-baked at build time.  Without this the ~90 MB download happens on every
# cold start, which causes Render health-checks to time out and the service to
# restart in a loop.
ENV HF_HOME=/app/.cache/huggingface

WORKDIR /app

# Copy the requirements file into the image
COPY requirements.txt .

# Force CPU-only PyTorch first to keep the image under ~1 GB.
# The default PyPI wheel bundles CUDA libraries (~3-4 GB) which are not needed
# on Render's (or any other CPU-based) infrastructure.
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install the rest of the application dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the sentence-transformers model so it is baked into the image.
# This means the first request is served immediately instead of waiting for a
# ~90 MB network download, preventing Render health-check timeouts.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

# Copy the rest of the application code
COPY . .

# Render injects PORT at runtime; default to 10000 if not set.
EXPOSE 10000

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}
