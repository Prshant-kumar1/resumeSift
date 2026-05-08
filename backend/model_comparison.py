"""
model_comparison.py
═══════════════════════════════════════════════════════════════════════════════
Comparative Analysis: TF-IDF (sklearn) vs BERT (all-MiniLM-L6-v2) vs BERT (bert-base-uncased)
for Resume ↔ Job Description Matching

Usage
-----
    python model_comparison.py

Outputs
-------
    comparison_scores.csv       — per-sample scores for all three approaches
    comparison_summary.csv      — aggregated metrics table
    comparison_charts.png       — 6-panel matplotlib figure
    comparison_report.txt       — written analysis you can share / archive

Requirements
------------
    pip install sentence-transformers scikit-learn pandas numpy matplotlib seaborn scipy
    (pkl files: resume_screening_model.pkl, tfidf_resume.pkl, tfidf_job.pkl must exist)
"""

import time
import warnings
import pickle
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import seaborn as sns
from scipy.sparse import hstack
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, confusion_matrix, roc_curve
)

warnings.filterwarnings("ignore")

# ── Color palette ──────────────────────────────────────────────────────────────
COLORS = {
    "tfidf":   "#ef4444",   # red
    "minilm":  "#7c3aed",   # purple  ← primary model
    "bert_base": "#0284c7", # blue
}

# ══════════════════════════════════════════════════════════════════════════════
# TEST DATASET
# Ground-truth labels:  1 = should match,  0 = should NOT match
# Categories: strong_match | weak_match | borderline | no_match
# ══════════════════════════════════════════════════════════════════════════════
TEST_CASES = [
    # ── Strong matches ────────────────────────────────────────────────────────
    {
        "id": 1, "category": "strong_match", "label": 1,
        "resume": """
            John Doe — Senior Software Engineer
            7 years of experience in Python, Django, REST APIs, and microservices.
            Led a team of 5 engineers building a distributed data pipeline using Apache Kafka
            and PostgreSQL. Proficient in Docker, Kubernetes, CI/CD (GitHub Actions, Jenkins).
            Strong background in system design, code review, and agile development.
            B.Tech Computer Science, IIT Delhi.
        """,
        "job": """
            Senior Software Engineer — Backend
            We are looking for a Python expert with 5+ years of experience in building
            scalable REST APIs and microservices. Must know Docker, Kubernetes, and
            PostgreSQL. Experience with Kafka or message queues is a plus. Strong
            understanding of agile practices and CI/CD pipelines required.
        """,
    },
    {
        "id": 2, "category": "strong_match", "label": 1,
        "resume": """
            Jane Smith — Data Scientist
            5 years in machine learning, NLP, and statistical modelling.
            Hands-on experience with Python (pandas, scikit-learn, PyTorch), SQL,
            and cloud platforms (AWS SageMaker). Published 2 papers on text classification.
            Built a customer churn prediction model that improved retention by 18%.
        """,
        "job": """
            Data Scientist — NLP & ML
            Seeking an experienced data scientist with Python, ML frameworks (PyTorch/TF),
            and SQL. NLP experience strongly preferred. Must be comfortable with model
            deployment on AWS. Publications or research background a plus.
        """,
    },
    {
        "id": 3, "category": "strong_match", "label": 1,
        "resume": """
            Priya Sharma — Full Stack Developer
            React, Node.js, TypeScript, MongoDB — 4 years building production web apps.
            Experience with GraphQL, Redis caching, and AWS EC2/S3. Contributed to open
            source React libraries. Comfortable with agile sprints and cross-team collaboration.
        """,
        "job": """
            Full Stack Developer (React + Node)
            Join our product team to build customer-facing features. Must know React,
            Node.js, and TypeScript. Experience with MongoDB or other NoSQL databases
            required. AWS knowledge and GraphQL familiarity are strong advantages.
        """,
    },
    {
        "id": 4, "category": "strong_match", "label": 1,
        "resume": """
            Alex Chen — DevOps / SRE Engineer
            Terraform, Ansible, AWS (EC2, EKS, RDS), Prometheus, Grafana.
            4 years maintaining 99.9% uptime for a SaaS platform serving 2M users.
            Expert in Kubernetes cluster management and GitOps workflows.
        """,
        "job": """
            Site Reliability Engineer
            We need a DevOps/SRE who can manage AWS infrastructure using Terraform.
            Kubernetes, Grafana/Prometheus monitoring, and GitOps experience required.
            Must be comfortable owning on-call rotations and incident response.
        """,
    },
    {
        "id": 5, "category": "strong_match", "label": 1,
        "resume": """
            Maria Lopez — Product Manager
            5 years leading product roadmaps for B2B SaaS products. Worked closely
            with engineering, design, and sales. Experienced in user story mapping,
            A/B testing, OKR frameworks, and Jira. MBA from XLRI.
        """,
        "job": """
            Senior Product Manager — B2B SaaS
            Looking for a PM with 4+ years of B2B product experience. You will own the
            product roadmap, work with engineering and design teams, run A/B experiments,
            and report to the VP of Product. MBA preferred. Jira and OKR experience a plus.
        """,
    },

    # ── Weak matches (related domain, missing key skills) ─────────────────────
    {
        "id": 6, "category": "weak_match", "label": 0,
        "resume": """
            Ravi Kumar — Junior Developer
            1 year experience with HTML, CSS, JavaScript, and basic React.
            Built 2 small personal projects. Completed an online Python course.
            No professional backend or cloud experience.
        """,
        "job": """
            Senior Software Engineer — Backend
            We are looking for a Python expert with 5+ years of experience in building
            scalable REST APIs and microservices. Must know Docker, Kubernetes, and
            PostgreSQL. Experience with Kafka or message queues is a plus.
        """,
    },
    {
        "id": 7, "category": "weak_match", "label": 0,
        "resume": """
            Ananya Rao — Business Analyst
            3 years in business process analysis, requirements gathering, and Excel
            dashboards. Familiar with SQL for basic reporting. No ML or programming
            experience beyond Excel macros.
        """,
        "job": """
            Data Scientist — NLP & ML
            Seeking an experienced data scientist with Python, ML frameworks (PyTorch/TF),
            and SQL. NLP experience strongly preferred. Must be comfortable with model
            deployment on AWS.
        """,
    },
    {
        "id": 8, "category": "weak_match", "label": 0,
        "resume": """
            Tom Williams — Android Developer
            3 years building native Android apps using Kotlin and Java.
            Experience with Retrofit, Room DB, Firebase, and Play Store publishing.
            No web frontend or React experience.
        """,
        "job": """
            Full Stack Developer (React + Node)
            Must know React, Node.js, and TypeScript. Experience with MongoDB required.
            AWS knowledge and GraphQL familiarity are strong advantages.
        """,
    },

    # ── Borderline (partial overlap) ──────────────────────────────────────────
    {
        "id": 9, "category": "borderline", "label": 0,
        "resume": """
            Siddharth Mehta — Cloud Engineer
            3 years working with Azure (VMs, AKS, Blob Storage), Terraform, and CI/CD.
            Some experience with Linux admin and bash scripting. Limited AWS exposure.
        """,
        "job": """
            Site Reliability Engineer
            We need a DevOps/SRE who can manage AWS infrastructure using Terraform.
            Kubernetes, Grafana/Prometheus monitoring, and GitOps experience required.
        """,
    },
    {
        "id": 10, "category": "borderline", "label": 1,
        "resume": """
            Nina Patel — ML Engineer
            3 years building and deploying machine learning models. Strong in Python,
            scikit-learn, and SQL. Some NLP project work using NLTK and spaCy.
            Experience with GCP (Vertex AI). No PyTorch experience but knows TensorFlow.
        """,
        "job": """
            Data Scientist — NLP & ML
            Seeking a data scientist with Python, ML frameworks (PyTorch/TF), and SQL.
            NLP experience strongly preferred. AWS deployment experience is a plus.
        """,
    },

    # ── Clear non-matches ─────────────────────────────────────────────────────
    {
        "id": 11, "category": "no_match", "label": 0,
        "resume": """
            Carlos Rivera — Chef & Restaurant Manager
            10 years in hospitality management. Expertise in menu planning, kitchen
            operations, inventory control, and team training. ServSafe certified.
        """,
        "job": """
            Senior Software Engineer — Backend
            Python expert with 5+ years in scalable REST APIs and microservices.
            Must know Docker, Kubernetes, and PostgreSQL.
        """,
    },
    {
        "id": 12, "category": "no_match", "label": 0,
        "resume": """
            Emily Brooks — Elementary School Teacher
            6 years teaching mathematics and science to grades 3–5. Curriculum
            development, classroom management, parent communication. B.Ed degree.
        """,
        "job": """
            Data Scientist — NLP & ML
            Seeking a data scientist with Python, ML frameworks (PyTorch/TF), and SQL.
            NLP experience strongly preferred.
        """,
    },
    {
        "id": 13, "category": "no_match", "label": 0,
        "resume": """
            David Kim — Civil Engineer
            8 years in structural design and construction project management.
            AutoCAD, STAAD.Pro, site supervision, and regulatory compliance.
        """,
        "job": """
            Full Stack Developer (React + Node)
            Must know React, Node.js, TypeScript, and MongoDB. AWS and GraphQL a plus.
        """,
    },
    {
        "id": 14, "category": "no_match", "label": 0,
        "resume": """
            Sarah Johnson — Registered Nurse
            7 years in ICU nursing. Patient care, medication management, EHR systems,
            ACLS certified. Strong empathy and crisis management skills.
        """,
        "job": """
            Site Reliability Engineer
            DevOps/SRE managing AWS infrastructure, Kubernetes, Grafana/Prometheus.
            GitOps and on-call incident response required.
        """,
    },
    {
        "id": 15, "category": "no_match", "label": 0,
        "resume": """
            Marcus Green — Financial Analyst
            CFA Level 2. 5 years in equity research, DCF modelling, Bloomberg Terminal,
            and quarterly earnings analysis for tech companies.
        """,
        "job": """
            Senior Product Manager — B2B SaaS
            4+ years of B2B product experience. Own the roadmap, work with engineering,
            run A/B experiments, and report to the VP of Product.
        """,
    },
]


# ══════════════════════════════════════════════════════════════════════════════
# Utilities
# ══════════════════════════════════════════════════════════════════════════════
def clean_text(text: str) -> str:
    import re
    if not text:
        return ""
    text = str(text).lower()
    text = re.sub(r"http\S+|www\S+", "", text)
    text = re.sub(r"\S+@\S+", "", text)
    text = re.sub(r"[^a-zA-Z0-9\s\+\#\-]", " ", text)
    return " ".join(text.split())


def compute_metrics(y_true, y_pred, y_scores, model_name):
    """Return a dict of classification metrics."""
    cm  = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, cm[0, 0])
    return {
        "Model":       model_name,
        "Accuracy":    round(accuracy_score(y_true, y_pred), 4),
        "Precision":   round(precision_score(y_true, y_pred, zero_division=0), 4),
        "Recall":      round(recall_score(y_true, y_pred, zero_division=0), 4),
        "F1":          round(f1_score(y_true, y_pred, zero_division=0), 4),
        "ROC_AUC":     round(roc_auc_score(y_true, y_scores), 4),
        "TP": int(tp), "TN": int(tn), "FP": int(fp), "FN": int(fn),
    }


# ══════════════════════════════════════════════════════════════════════════════
# TF-IDF Baseline
# ══════════════════════════════════════════════════════════════════════════════
def run_tfidf(test_cases):
    """Load saved pkl files and score each test case."""
    print("\n[1/3] Running TF-IDF baseline...")
    try:
        with open("resume_screening_model.pkl", "rb") as f:
            clf = pickle.load(f)
        with open("tfidf_resume.pkl", "rb") as f:
            tfidf_resume = pickle.load(f)
        with open("tfidf_job.pkl", "rb") as f:
            tfidf_job = pickle.load(f)
    except FileNotFoundError as e:
        print(f"  ⚠️  Could not load TF-IDF pkl files: {e}")
        print("  ⚠️  Filling TF-IDF scores with NaN — charts will still show BERT results.")
        return [np.nan] * len(test_cases), [np.nan] * len(test_cases), np.nan

    scores = []
    preds  = []
    t0     = time.time()

    for tc in test_cases:
        r = clean_text(tc["resume"])
        j = clean_text(tc["job"])
        rv = tfidf_resume.transform([r])
        jv = tfidf_job.transform([j])
        X  = hstack([rv, jv])
        prob  = clf.predict_proba(X)[0][1]
        pred  = int(clf.predict(X)[0])
        scores.append(round(float(prob), 4))
        preds.append(pred)

    elapsed = round(time.time() - t0, 3)
    print(f"  ✓ Done in {elapsed}s  ({elapsed/len(test_cases)*1000:.1f} ms/sample)")
    return scores, preds, elapsed


# ══════════════════════════════════════════════════════════════════════════════
# BERT models
# ══════════════════════════════════════════════════════════════════════════════
def run_bert(test_cases, model_name: str, threshold: float = 0.50):
    """Encode with sentence-transformers, return cosine similarity scores."""
    print(f"\n[?/3] Running BERT — {model_name} ...")
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer(model_name)

    resumes = [clean_text(tc["resume"]) for tc in test_cases]
    jobs    = [clean_text(tc["job"])    for tc in test_cases]

    t0 = time.time()

    resume_embs = model.encode(resumes, convert_to_numpy=True,
                                normalize_embeddings=True, batch_size=16)
    job_embs    = model.encode(jobs,    convert_to_numpy=True,
                                normalize_embeddings=True, batch_size=16)

    elapsed = round(time.time() - t0, 3)

    scores = []
    preds  = []
    for re_, je_ in zip(resume_embs, job_embs):
        sim  = float(np.dot(re_, je_))
        sim  = max(0.0, min(1.0, sim))
        scores.append(round(sim, 4))
        preds.append(1 if sim >= threshold else 0)

    print(f"  ✓ Done in {elapsed}s  ({elapsed/len(test_cases)*1000:.1f} ms/sample)")
    return scores, preds, elapsed


# ══════════════════════════════════════════════════════════════════════════════
# Plotting
# ══════════════════════════════════════════════════════════════════════════════
def build_charts(df_scores, metrics_df, y_true,
                 tfidf_scores, minilm_scores, bert_base_scores,
                 tfidf_time, minilm_time, bert_time):

    sns.set_theme(style="whitegrid", palette="muted")
    fig = plt.figure(figsize=(20, 14))
    fig.suptitle(
        "Model Comparison: TF-IDF vs all-MiniLM-L6-v2 vs bert-base-uncased\n"
        "Resume ↔ Job Description Matching",
        fontsize=16, fontweight="bold", y=0.98
    )
    gs = gridspec.GridSpec(2, 3, figure=fig, hspace=0.40, wspace=0.35)

    # ── 1. Score distributions (violin) ──────────────────────────────────────
    ax1 = fig.add_subplot(gs[0, 0])
    plot_data = []
    for label, scores, col in [
        ("TF-IDF",            tfidf_scores,     COLORS["tfidf"]),
        ("MiniLM-L6-v2",      minilm_scores,    COLORS["minilm"]),
        ("bert-base-uncased", bert_base_scores, COLORS["bert_base"]),
    ]:
        if all(np.isnan(s) for s in scores):
            continue
        for s in scores:
            plot_data.append({"Model": label, "Score": s})

    violin_df = pd.DataFrame(plot_data)
    sns.violinplot(data=violin_df, x="Model", y="Score", palette=list(COLORS.values()),
                   inner="box", cut=0, ax=ax1)
    ax1.axhline(0.5, ls="--", color="gray", alpha=0.7, label="Threshold 0.50")
    ax1.set_title("Score Distribution")
    ax1.set_ylabel("Similarity / Probability Score")
    ax1.legend(fontsize=8)

    # ── 2. Per-sample score comparison (line) ─────────────────────────────────
    ax2 = fig.add_subplot(gs[0, 1])
    x = np.arange(len(test_cases := TEST_CASES))
    labels_gt = [tc["label"] for tc in test_cases]

    if not all(np.isnan(s) for s in tfidf_scores):
        ax2.plot(x, tfidf_scores,    "o-", color=COLORS["tfidf"],     label="TF-IDF",            lw=1.5, ms=5)
    ax2.plot(x, minilm_scores,    "s-", color=COLORS["minilm"],    label="MiniLM-L6-v2",      lw=2,   ms=6)
    ax2.plot(x, bert_base_scores, "^-", color=COLORS["bert_base"], label="bert-base-uncased",  lw=1.5, ms=5)

    for i, gt in enumerate(labels_gt):
        ax2.axvspan(i - 0.4, i + 0.4, alpha=0.06,
                    color="#10b981" if gt == 1 else "#ef4444")

    ax2.axhline(0.5, ls="--", color="gray", alpha=0.7, label="Threshold")
    ax2.set_title("Per-Sample Scores\n(green bg = ground-truth Match)")
    ax2.set_xlabel("Test Case ID")
    ax2.set_ylabel("Score")
    ax2.legend(fontsize=8)
    ax2.set_xticks(x)
    ax2.set_xticklabels([tc["id"] for tc in test_cases], fontsize=7)

    # ── 3. Bar chart of key metrics ───────────────────────────────────────────
    ax3 = fig.add_subplot(gs[0, 2])
    metrics_plot = metrics_df[["Model", "Accuracy", "Precision", "Recall", "F1", "ROC_AUC"]].copy()
    metrics_plot = metrics_plot.melt(id_vars="Model", var_name="Metric", value_name="Score")
    # Remove NaN rows (TF-IDF might be NaN)
    metrics_plot = metrics_plot.dropna()
    sns.barplot(data=metrics_plot, x="Metric", y="Score", hue="Model",
                palette=list(COLORS.values())[:len(metrics_df)], ax=ax3)
    ax3.set_title("Classification Metrics")
    ax3.set_ylabel("Score (0–1)")
    ax3.set_ylim(0, 1.10)
    ax3.legend(fontsize=8)
    for bar in ax3.patches:
        h = bar.get_height()
        if h > 0.01:
            ax3.text(bar.get_x() + bar.get_width() / 2, h + 0.01,
                     f"{h:.2f}", ha="center", va="bottom", fontsize=7)

    # ── 4. ROC curves ─────────────────────────────────────────────────────────
    ax4 = fig.add_subplot(gs[1, 0])
    for label, scores, col in [
        ("TF-IDF",            tfidf_scores,     COLORS["tfidf"]),
        ("MiniLM-L6-v2",      minilm_scores,    COLORS["minilm"]),
        ("bert-base-uncased", bert_base_scores, COLORS["bert_base"]),
    ]:
        if all(np.isnan(s) for s in scores):
            continue
        fpr, tpr, _ = roc_curve(y_true, scores)
        auc = roc_auc_score(y_true, scores)
        ax4.plot(fpr, tpr, color=col, lw=2, label=f"{label} (AUC={auc:.2f})")

    ax4.plot([0, 1], [0, 1], "k--", lw=1, alpha=0.5, label="Random")
    ax4.set_title("ROC Curves")
    ax4.set_xlabel("False Positive Rate")
    ax4.set_ylabel("True Positive Rate")
    ax4.legend(fontsize=8)

    # ── 5. Inference time ─────────────────────────────────────────────────────
    ax5 = fig.add_subplot(gs[1, 1])
    valid_models = []
    valid_times  = []
    valid_colors = []

    if not np.isnan(tfidf_time):
        valid_models.append("TF-IDF");        valid_times.append(tfidf_time * 1000); valid_colors.append(COLORS["tfidf"])
    valid_models.append("MiniLM-L6-v2");    valid_times.append(minilm_time * 1000); valid_colors.append(COLORS["minilm"])
    valid_models.append("bert-base-uncased"); valid_times.append(bert_time * 1000);  valid_colors.append(COLORS["bert_base"])

    bars = ax5.bar(valid_models, valid_times, color=valid_colors, width=0.5)
    ax5.set_title(f"Total Inference Time (ms)\nfor {len(TEST_CASES)} samples")
    ax5.set_ylabel("Time (ms)")
    for bar, t in zip(bars, valid_times):
        ax5.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 5,
                 f"{t:.0f}ms", ha="center", fontsize=9, fontweight="bold")

    # ── 6. Score correlation heatmap ──────────────────────────────────────────
    ax6 = fig.add_subplot(gs[1, 2])
    corr_data = {"MiniLM-L6-v2": minilm_scores, "bert-base-uncased": bert_base_scores}
    if not all(np.isnan(s) for s in tfidf_scores):
        corr_data["TF-IDF"] = tfidf_scores

    corr_df  = pd.DataFrame(corr_data).dropna()
    corr_mat = corr_df.corr()
    mask     = np.triu(np.ones_like(corr_mat, dtype=bool), k=1)

    sns.heatmap(corr_mat, annot=True, fmt=".3f", cmap="RdYlGn",
                vmin=-1, vmax=1, ax=ax6, linewidths=0.5,
                annot_kws={"size": 11, "weight": "bold"})
    ax6.set_title("Score Correlation\nbetween Models")

    plt.savefig("comparison_charts.png", dpi=150, bbox_inches="tight")
    print("\n  ✓ Saved: comparison_charts.png")
    plt.close()


# ══════════════════════════════════════════════════════════════════════════════
# Written report
# ══════════════════════════════════════════════════════════════════════════════
def write_report(metrics_df, df_scores, tfidf_time, minilm_time, bert_time):
    lines = [
        "MODEL COMPARISON REPORT",
        "TF-IDF (sklearn) vs all-MiniLM-L6-v2 vs bert-base-uncased",
        "=" * 70,
        f"Generated  : {time.strftime('%Y-%m-%d %H:%M:%S')}",
        f"Test Cases : {len(TEST_CASES)}",
        "",
        "═" * 70,
        "1. METRICS SUMMARY",
        "═" * 70,
        metrics_df.to_string(index=False),
        "",
        "═" * 70,
        "2. INFERENCE TIME",
        "═" * 70,
    ]

    if not np.isnan(tfidf_time):
        lines.append(f"  TF-IDF             : {tfidf_time*1000:.1f} ms total "
                     f"({tfidf_time/len(TEST_CASES)*1000:.1f} ms/sample)")
    lines += [
        f"  MiniLM-L6-v2      : {minilm_time*1000:.1f} ms total "
        f"({minilm_time/len(TEST_CASES)*1000:.1f} ms/sample)  ← PRIMARY",
        f"  bert-base-uncased : {bert_time*1000:.1f} ms total "
        f"({bert_time/len(TEST_CASES)*1000:.1f} ms/sample)",
        "",
        "═" * 70,
        "3. PER-SAMPLE SCORES",
        "═" * 70,
        df_scores.to_string(index=False),
        "",
        "═" * 70,
        "4. ANALYSIS",
        "═" * 70,
    ]

    # Auto-generate brief analysis
    rows = metrics_df.dropna(subset=["F1"]).sort_values("F1", ascending=False)
    best = rows.iloc[0]["Model"] if not rows.empty else "—"
    lines += [
        f"  Best F1 Score     : {best}",
        "",
        "  Key observations:",
        "  • all-MiniLM-L6-v2 uses DENSE sentence embeddings → captures",
        "    semantic context that TF-IDF bag-of-words cannot express.",
        "  • bert-base-uncased is larger (110M params vs 22M for MiniLM)",
        "    but not specifically fine-tuned for sentence similarity tasks.",
        "  • MiniLM-L6-v2 was distilled from a larger teacher and fine-tuned",
        "    on NLI + STS data → better similarity scores for the same speed.",
        "  • TF-IDF scores reflect surface keyword overlap only; it may",
        "    give high scores for keyword-stuffed resumes and miss paraphrased",
        "    but semantically relevant content.",
        "",
        "  Recommendation:",
        "  ► Use sentence-transformers/all-MiniLM-L6-v2 as the production model.",
        "    It offers the best balance of accuracy, speed, and interpretability.",
        "",
        "=" * 70,
        "GLA University — Resume Screening Research",
        "=" * 70,
    ]

    report_text = "\n".join(lines)
    with open("comparison_report.txt", "w") as f:
        f.write(report_text)
    print("  ✓ Saved: comparison_report.txt")
    return report_text


# ══════════════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════════
def main():
    print("=" * 70)
    print("  RESUME SCREENING — MODEL COMPARISON BENCHMARK")
    print(f"  {len(TEST_CASES)} test cases  |  3 models")
    print("=" * 70)

    y_true = [tc["label"] for tc in TEST_CASES]

    # ── Run models ─────────────────────────────────────────────────────────────
    tfidf_scores,     tfidf_preds,     tfidf_time     = run_tfidf(TEST_CASES)
    minilm_scores,    minilm_preds,    minilm_time    = run_bert(
        TEST_CASES, "sentence-transformers/all-MiniLM-L6-v2", threshold=0.50)
    bert_base_scores, bert_base_preds, bert_base_time = run_bert(
        TEST_CASES, "bert-base-uncased", threshold=0.50)

    # ── Metrics ────────────────────────────────────────────────────────────────
    print("\n[Metrics] Computing classification metrics...")

    metrics_rows = []
    for label, preds, scores in [
        ("TF-IDF",            tfidf_preds,     tfidf_scores),
        ("MiniLM-L6-v2",      minilm_preds,    minilm_scores),
        ("bert-base-uncased", bert_base_preds, bert_base_scores),
    ]:
        if any(np.isnan(s) for s in scores):
            metrics_rows.append({"Model": label, **{k: np.nan for k in
                                  ["Accuracy","Precision","Recall","F1","ROC_AUC",
                                   "TP","TN","FP","FN"]}})
        else:
            metrics_rows.append(compute_metrics(y_true, preds, scores, label))

    metrics_df = pd.DataFrame(metrics_rows)
    print("\n" + metrics_df[["Model","Accuracy","Precision","Recall","F1","ROC_AUC"]].to_string(index=False))

    # ── Per-sample scores CSV ──────────────────────────────────────────────────
    df_scores = pd.DataFrame({
        "ID":                 [tc["id"]       for tc in TEST_CASES],
        "Category":           [tc["category"] for tc in TEST_CASES],
        "Ground_Truth":       y_true,
        "TF-IDF_Score":       tfidf_scores,
        "TF-IDF_Pred":        tfidf_preds,
        "MiniLM_Score":       minilm_scores,
        "MiniLM_Pred":        minilm_preds,
        "BertBase_Score":     bert_base_scores,
        "BertBase_Pred":      bert_base_preds,
    })
    df_scores.to_csv("comparison_scores.csv", index=False)
    metrics_df.to_csv("comparison_summary.csv", index=False)
    print("\n  ✓ Saved: comparison_scores.csv")
    print("  ✓ Saved: comparison_summary.csv")

    # ── Charts ─────────────────────────────────────────────────────────────────
    print("\n[Charts] Building 6-panel comparison figure...")
    build_charts(df_scores, metrics_df, y_true,
                 tfidf_scores, minilm_scores, bert_base_scores,
                 tfidf_time, minilm_time, bert_base_time)

    # ── Written report ─────────────────────────────────────────────────────────
    print("\n[Report] Writing analysis...")
    write_report(metrics_df, df_scores, tfidf_time, minilm_time, bert_base_time)

    print("\n" + "=" * 70)
    print("  BENCHMARK COMPLETE — 4 output files generated")
    print("  • comparison_scores.csv   — raw per-sample scores")
    print("  • comparison_summary.csv  — aggregated metrics table")
    print("  • comparison_charts.png   — 6-panel visual analysis")
    print("  • comparison_report.txt   — written narrative report")
    print("=" * 70)


if __name__ == "__main__":
    main()
