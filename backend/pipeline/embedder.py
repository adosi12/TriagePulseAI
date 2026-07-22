"""
Stage 2 — Embedding + RAG Matching Module
==========================================
Embeds the incident corpus with sentence-transformers (all-MiniLM-L6-v2)
and builds a FAISS index for fast semantic search.

Public API:
    build_index()                          -- embeds corpus, saves index to disk
    match_incident(alert_payload, top_k)   -- returns ranked historical matches

Run standalone to rebuild index:
    python pipeline/embedder.py --rebuild
"""

import json
import os
import pickle
from pathlib import Path
from typing import Any

import numpy as np

import sys
import site
user_site = site.getusersitepackages()
if user_site and user_site not in sys.path:
    sys.path.insert(0, user_site)

# Lazy imports — will be available after requirements.txt is installed
try:
    import faiss
except ImportError:
    faiss = None

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

# ── paths ─────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / "data"
INDEX_DIR = DATA_DIR / "faiss_index"
INCIDENTS_FILE = DATA_DIR / "incidents.json"
INDEX_FILE = INDEX_DIR / "index.faiss"
META_FILE = INDEX_DIR / "meta.pkl"

# ── model ─────────────────────────────────────────────────────────────────────
MODEL_NAME = "all-MiniLM-L6-v2"
_model: Any = None
_index: Any = None
_incidents: list[dict] = []


def _get_model() -> Any:
    global _model
    if _model is None:
        if SentenceTransformer is None:
            raise RuntimeError(
                "sentence-transformers not installed. Run: pip install sentence-transformers"
            )
        print(f"[embedder] Loading model '{MODEL_NAME}'…")
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def _incident_to_text(incident: dict) -> str:
    """Concatenate the fields most useful for semantic matching."""
    parts = [
        incident.get("description", ""),
        incident.get("error_signature", ""),
        incident.get("root_cause", ""),
        incident.get("affected_service", ""),
    ]
    return " | ".join(p for p in parts if p)


def build_index(force: bool = False) -> None:
    """Embed all incidents and persist the FAISS index to disk."""
    if faiss is None:
        raise RuntimeError("faiss-cpu not installed. Run: pip install faiss-cpu")

    if INDEX_FILE.exists() and META_FILE.exists() and not force:
        print("[embedder] Index already exists. Use --rebuild to force rebuild.")
        return

    INDEX_DIR.mkdir(parents=True, exist_ok=True)

    incidents = json.loads(INCIDENTS_FILE.read_text())
    texts = [_incident_to_text(inc) for inc in incidents]

    model = _get_model()
    print(f"[embedder] Embedding {len(texts)} incidents…")
    embeddings = model.encode(texts, show_progress_bar=True, batch_size=32)
    embeddings = np.array(embeddings, dtype="float32")

    # L2-normalise → inner product == cosine similarity
    faiss.normalize_L2(embeddings)
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)

    faiss.write_index(index, str(INDEX_FILE))
    with open(META_FILE, "wb") as f:
        pickle.dump(incidents, f)

    print(f"[embedder] [+] Index built: {len(incidents)} vectors, dim={dim}")


def _load_index() -> tuple[Any, list[dict]]:
    """Load index + metadata from disk (cached in module globals)."""
    global _index, _incidents
    if _index is not None:
        return _index, _incidents

    if not INDEX_FILE.exists() or not META_FILE.exists():
        raise RuntimeError(
            "FAISS index not found. Run: python pipeline/embedder.py --rebuild"
        )

    if faiss is None:
        raise RuntimeError("faiss-cpu not installed.")

    _index = faiss.read_index(str(INDEX_FILE))
    with open(META_FILE, "rb") as f:
        _incidents = pickle.load(f)
    return _index, _incidents


def _keyword_match_fallback(alert_payload: dict, top_k: int = 5) -> list[dict]:
    if not INCIDENTS_FILE.exists():
        return []
    incidents = json.loads(INCIDENTS_FILE.read_text())
    query_text = _incident_to_text(alert_payload).lower()
    query_words = set(w for w in query_text.split() if len(w) > 2)
    
    scored = []
    for inc in incidents:
        inc_text = _incident_to_text(inc).lower()
        inc_words = set(w for w in inc_text.split() if len(w) > 2)
        intersection = query_words.intersection(inc_words)
        union = query_words.union(inc_words)
        score = (len(intersection) / len(union)) if union else 0.0
        if alert_payload.get("affected_service", "").lower() == inc.get("affected_service", "").lower():
            score += 0.25
        scored.append((score, inc))
        
    scored.sort(key=lambda x: x[0], reverse=True)
    return [
        {"incident": inc, "similarity_score": min(0.95, round(score + 0.50, 4))}
        for score, inc in scored[:top_k]
    ]


def match_incident(
    alert_payload: dict,
    top_k: int = 5,
) -> list[dict]:
    """
    Semantic search against the historical incident corpus.
    Falls back to keyword similarity if FAISS index is not ready.
    """
    try:
        index, incidents = _load_index()
        model = _get_model()

        query_text = _incident_to_text(alert_payload)
        query_vec = model.encode([query_text], show_progress_bar=False)
        query_vec = np.array(query_vec, dtype="float32")
        faiss.normalize_L2(query_vec)

        scores, idxs = index.search(query_vec, top_k)

        results = []
        for score, idx in zip(scores[0], idxs[0]):
            if idx == -1:
                continue
            results.append({
                "incident": incidents[idx],
                "similarity_score": float(round(score, 4)),
            })

        return results
    except Exception as err:
        print(f"[embedder] FAISS search unavailable ({err}), using keyword matching fallback.")
        return _keyword_match_fallback(alert_payload, top_k=top_k)


# ── CLI entry point ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    force = "--rebuild" in sys.argv
    build_index(force=force)
