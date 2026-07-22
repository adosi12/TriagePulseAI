"""
Stage 2 — Embedding + RAG Matching Module (pgvector)
==========================================
Embeds the incident corpus with sentence-transformers (all-MiniLM-L6-v2)
and saves to PostgreSQL using pgvector.
"""

import json
from pathlib import Path
from typing import Any
import numpy as np

from config.database import SessionLocal, IncidentEmbedding, init_db

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / "data"
INCIDENTS_FILE = DATA_DIR / "incidents.json"
MODEL_NAME = "all-MiniLM-L6-v2"
_model: Any = None

def _get_model() -> Any:
    global _model
    if _model is None:
        if SentenceTransformer is None:
            raise RuntimeError("sentence-transformers not installed.")
        _model = SentenceTransformer(MODEL_NAME)
    return _model

def _incident_to_text(incident: dict) -> str:
    parts = [
        incident.get("description", ""),
        incident.get("error_signature", ""),
        incident.get("root_cause", ""),
        incident.get("affected_service", ""),
    ]
    return " | ".join(p for p in parts if p)

def build_index(force: bool = False) -> None:
    init_db()
    db = SessionLocal()
    count = db.query(IncidentEmbedding).count()
    if count > 0 and not force:
        print("[embedder] DB already has embeddings. Use --rebuild to force rebuild.")
        db.close()
        return

    if force:
        db.query(IncidentEmbedding).delete()
        db.commit()

    incidents = json.loads(INCIDENTS_FILE.read_text())
    texts = [_incident_to_text(inc) for inc in incidents]

    model = _get_model()
    embeddings = model.encode(texts, show_progress_bar=True, batch_size=32)

    for inc, emb in zip(incidents, embeddings):
        record = IncidentEmbedding(
            incident_id=inc.get("incident_id"),
            affected_service=inc.get("affected_service"),
            description=inc.get("description"),
            error_signature=inc.get("error_signature"),
            root_cause=inc.get("root_cause"),
            resolution=inc.get("resolution"),
            embedding=emb.tolist()
        )
        db.add(record)
    db.commit()
    db.close()
    print(f"[embedder] [+] Index built in PostgreSQL pgvector: {len(incidents)} vectors")

def match_incident(alert_payload: dict, top_k: int = 5) -> list[dict]:
    try:
        model = _get_model()
        query_text = _incident_to_text(alert_payload)
        query_vec = model.encode([query_text])[0]

        db = SessionLocal()
        results = db.query(IncidentEmbedding).order_by(
            IncidentEmbedding.embedding.cosine_distance(query_vec.tolist())
        ).limit(top_k).all()

        matches = []
        for row in results:
            inc_dict = {
                "incident_id": row.incident_id,
                "affected_service": row.affected_service,
                "description": row.description,
                "error_signature": row.error_signature,
                "root_cause": row.root_cause,
                "resolution": row.resolution
            }
            vec1 = np.array(query_vec)
            vec2 = np.array(row.embedding)
            sim = float(np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2)))
            
            matches.append({
                "incident": inc_dict,
                "similarity_score": round(sim, 4)
            })
        db.close()
        return matches
    except Exception as err:
        print(f"[embedder] pgvector search unavailable ({err}), fallback to keyword matching...")
        return _keyword_match_fallback(alert_payload, top_k=top_k)

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

if __name__ == "__main__":
    import sys
    force = "--rebuild" in sys.argv
    build_index(force=force)
