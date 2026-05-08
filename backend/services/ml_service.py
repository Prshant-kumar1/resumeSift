import re
import os
import numpy as np
from collections import Counter
from typing import Tuple, List, Dict, Any, Optional

# ── Configuration ─────────────────────────────────────────────────────────────
MATCH_THRESHOLD = float(os.getenv("MATCH_THRESHOLD", "0.50"))
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


class MLService:
    """
    BERT-powered resume screening service.

    Uses sentence-transformers/all-MiniLM-L6-v2 (22M params, 384-dim embeddings)
    to compute semantic cosine similarity between resumes and job descriptions.
    Replaces the previous TF-IDF + sklearn classifier pipeline.
    """

    def __init__(self):
        self.model = None
        self.model_name = MODEL_NAME
        self.threshold = MATCH_THRESHOLD
        self._load_model()

    def _load_model(self):
        """Load the sentence-transformers BERT model. Downloaded on first run (~90MB)."""
        try:
            from sentence_transformers import SentenceTransformer
            print(f"Loading BERT model: {self.model_name} ...")
            self.model = SentenceTransformer(self.model_name)
            print(f"BERT model loaded successfully ({self.model_name})")
        except ImportError:
            print("sentence-transformers is not installed. Run: pip install sentence-transformers")
            self.model = None
        except Exception as e:
            print(f"Error loading BERT model: {e}")
            self.model = None

    @property
    def is_loaded(self) -> bool:
        return self.model is not None

    # ── Text utilities ─────────────────────────────────────────────────────────

    def clean_text(self, text: str) -> str:
        """Light cleaning — keep semantic tokens intact for BERT."""
        if not text:
            return ""
        text = str(text).lower()
        text = re.sub(r'https?://\S+|www\.\S+', '', text)     # strip URLs
        text = " ".join(token for token in text.split() if "@" not in token)  # strip email-like tokens
        text = re.sub(r'[^a-zA-Z0-9\s+#-]', ' ', text)        # keep alphanum + tech symbols
        text = ' '.join(text.split())
        return text

    def extract_keywords(self, text: str, top_n: int = 10) -> List[Tuple[str, int]]:
        """Frequency-based keyword extraction (supplementary insight)."""
        words = self.clean_text(text).split()
        stop_words = {
            'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or',
            'but', 'in', 'with', 'to', 'for', 'of', 'we', 'you', 'are',
            'be', 'have', 'has', 'will', 'this', 'that', 'from', 'our'
        }
        words = [w for w in words if w not in stop_words and len(w) > 2]
        return Counter(words).most_common(top_n)

    # ── Core prediction (single pair) ─────────────────────────────────────────

    # ── Recommendation helper ──────────────────────────────────────────────────

    @staticmethod
    def _build_recommendation(similarity: float, matched: list, missing: list) -> str:
        """Generate a short human-readable recommendation based on the match score."""
        score_pct = round(similarity * 100)
        if score_pct >= 75:
            opening = "Strong overall alignment with the job requirements."
        elif score_pct >= 50:
            opening = "Moderate alignment with the job requirements."
        else:
            opening = "Limited alignment with the job requirements."

        if matched:
            opening += f" Key skills present: {', '.join(matched[:5])}."
        if missing:
            opening += f" Consider assessing: {', '.join(missing[:5])}."
        return opening

    def predict_match(self, resume_text: str, job_desc_text: str,
                      threshold: Optional[float] = None) -> Dict[str, Any]:
        """
        BERT semantic similarity prediction for a single resume–job pair.

        Returns a response dict shaped for the TypeScript frontend:
        ``result``, ``probability`` (0-100), ``confidence`` (0-100),
        ``matched_skills``, ``missing_skills``, ``recommendation``.
        """
        if not self.is_loaded:
            return {"error": "BERT model not loaded. Please check server logs."}

        resume_clean = self.clean_text(resume_text)
        job_clean = self.clean_text(job_desc_text)

        if not resume_clean or not job_clean:
            return {"error": "Invalid input text."}

        _threshold = threshold if threshold is not None else self.threshold

        try:
            # Encode both texts → normalized embeddings
            embeddings = self.model.encode(
                [resume_clean, job_clean],
                convert_to_numpy=True,
                normalize_embeddings=True
            )

            # With normalized embeddings, dot product == cosine similarity ∈ [-1, 1]
            similarity = float(np.dot(embeddings[0], embeddings[1]))
            similarity = max(0.0, min(1.0, similarity))  # clamp to [0, 1]

            prediction = 1 if similarity >= _threshold else 0

            # Keyword overlap (surface-level supplementary metric)
            resume_kw_list = self.extract_keywords(resume_text, 20)
            job_kw_list = self.extract_keywords(job_desc_text, 20)
            resume_kw = {w for w, _ in resume_kw_list}
            job_kw = {w for w, _ in job_kw_list}
            matched_skills = sorted(resume_kw & job_kw)
            missing_skills = sorted(job_kw - resume_kw)
            keyword_overlap = len(matched_skills)

            score = round(similarity * 100, 1)
            recommendation = self._build_recommendation(similarity, matched_skills, missing_skills)

            return {
                # Frontend-facing fields
                "result": "Match" if prediction == 1 else "No Match",
                "probability": score,
                "confidence": score,
                "score": score,
                "matched_skills": matched_skills,
                "missing_skills": missing_skills,
                "recommendation": recommendation,
                # Supplementary / internal fields
                "match": bool(prediction == 1),
                "keyword_overlap": keyword_overlap,
                "resume_keywords": dict(self.extract_keywords(resume_text, 10)),
                "job_keywords": dict(self.extract_keywords(job_desc_text, 10)),
                "model": self.model_name,
            }
        except Exception as e:
            return {"error": f"Prediction error: {str(e)}"}

    # ── Efficient batch prediction ─────────────────────────────────────────────

    def batch_predict(self, resumes: List[str], job_desc_text: str,
                      threshold: Optional[float] = None) -> List[Dict[str, Any]]:
        """
        Encode all resumes + job description in a single batch call.
        Much faster than calling predict_match() in a loop.

        Returns a list of result dicts (frontend-compatible shape), one per resume.
        """
        if not self.is_loaded:
            return [{"error": "BERT model not loaded."}] * len(resumes)

        job_clean = self.clean_text(job_desc_text)
        resumes_clean = [self.clean_text(r) for r in resumes]

        _threshold = threshold if threshold is not None else self.threshold

        try:
            # Batch encode: all resumes + the single job description
            all_texts = resumes_clean + [job_clean]
            embeddings = self.model.encode(
                all_texts,
                convert_to_numpy=True,
                normalize_embeddings=True,
                batch_size=32,
                show_progress_bar=False
            )

            resume_embeddings = embeddings[:-1]
            job_embedding = embeddings[-1]

            # Pre-compute job keywords once
            job_kw_list = self.extract_keywords(job_desc_text, 20)
            job_kw = {w for w, _ in job_kw_list}
            job_keywords_dict = dict(self.extract_keywords(job_desc_text, 10))

            results = []
            for i, (resume_text, emb) in enumerate(zip(resumes, resume_embeddings)):
                sim = float(np.dot(emb, job_embedding))
                sim = max(0.0, min(1.0, sim))
                pred = 1 if sim >= _threshold else 0

                resume_kw_list = self.extract_keywords(resume_text, 20)
                resume_kw = {w for w, _ in resume_kw_list}
                matched_skills = sorted(resume_kw & job_kw)
                missing_skills = sorted(job_kw - resume_kw)
                kw_overlap = len(matched_skills)

                score = round(sim * 100, 1)
                recommendation = self._build_recommendation(sim, matched_skills, missing_skills)

                results.append({
                    # Frontend-facing fields
                    "result": "Match" if pred == 1 else "No Match",
                    "probability": score,
                    "confidence": score,
                    "score": score,
                    "matched_skills": matched_skills,
                    "missing_skills": missing_skills,
                    "recommendation": recommendation,
                    # Supplementary / internal fields
                    "match": bool(pred == 1),
                    "keyword_overlap": kw_overlap,
                    "resume_keywords": dict(self.extract_keywords(resume_text, 10)),
                    "job_keywords": job_keywords_dict,
                    "model": self.model_name,
                })

            return results

        except Exception as e:
            return [{"error": f"Batch prediction error: {str(e)}"}] * len(resumes)


# ── Singleton ──────────────────────────────────────────────────────────────────
ml_service = MLService()
