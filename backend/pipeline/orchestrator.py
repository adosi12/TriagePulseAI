"""
pipeline/orchestrator.py — TriagePulseAI Pipeline
Stages: RAG Match → Gemini AI Analysis → Mock Jira Ticket → Email Alert
"""
import time
import json
import requests
from typing import Generator

from config.settings import GEMINI_API_KEY, GEMINI_MODEL, LLM_ENABLED, RAG_TOP_K
from pipeline.embedder import match_incident
from pipeline.jira_client import JiraClient
from pipeline.email_client import send_alert_email
from pipeline.notification_client import NotificationClient
from pipeline.cost_calculator import compute_savings
from google import genai
from google.genai import types


# ── Gemini AI synthesis ────────────────────────────────────────────────────────

def _ai_synthesise(alert: dict, matched_incidents: list[dict]) -> dict:
    """Call Gemini to generate root cause + suggested fix."""

    if not LLM_ENABLED or not matched_incidents:
        best = matched_incidents[0] if matched_incidents else {}
        inc  = best.get("incident", {})
        return {
            "root_cause_summary": f"[No AI] Best match: {inc.get('root_cause', 'Unknown')}",
            "suggested_fix":      inc.get("resolution", "No resolution found."),
            "confidence_score":   best.get("similarity_score", 0.0),
            "model":              "fallback",
        }

    context = "\n".join(
        f"- [{m['incident']['incident_id']}] (score {m['similarity_score']:.2f})\n"
        f"  Root cause: {m['incident']['root_cause']}\n"
        f"  Resolution: {m['incident']['resolution']}"
        for m in matched_incidents[:3]
    )

    prompt = f"""You are TriagePulseAI, an AI incident-resolution assistant.

Alert received:
  Service: {alert.get('affected_service', 'unknown')}
  Error: {alert.get('error_signature', 'N/A')}
  Description: {alert.get('description', 'N/A')}

Top matching historical incidents:
{context}

Respond ONLY with valid JSON in this exact format:
{{
  "root_cause_summary": "2-3 sentence explanation of what likely went wrong",
  "suggested_fix": "Bullet-point steps the on-call engineer should try",
  "confidence_score": 0.85
}}"""

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        raw = response.text.strip()
        # Strip code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw.strip())
        parsed["model"] = GEMINI_MODEL
        return parsed

    except Exception as err:
        print(f"[orchestrator] Gemini failed: {err}")
        best = matched_incidents[0] if matched_incidents else {}
        inc  = best.get("incident", {})
        return {
            "root_cause_summary": f"[AI error] Best match: {inc.get('root_cause', 'Unknown')}",
            "suggested_fix":      inc.get("resolution", "Check logs."),
            "confidence_score":   best.get("similarity_score", 0.0),
            "model":              "fallback",
        }


# ── Streaming pipeline ─────────────────────────────────────────────────────────

def run_pipeline_stream(alert_payload: dict) -> Generator[dict, None, None]:
    """Run pipeline stage by stage, yielding progress events for SSE."""
    t_start = time.time()

    # ── Stage 1: RAG Matching ─────────────────────────────────────────────────
    yield {"event": "stage_start", "stage": "rag_matching", "label": "Searching incident history..."}
    t0 = time.time()
    matches = match_incident(alert_payload, top_k=RAG_TOP_K)
    top_score = matches[0]["similarity_score"] if matches else 0.0
    yield {
        "event":       "stage_done",
        "stage":       "rag_matching",
        "label":       "Incident history searched",
        "duration_s":  round(time.time() - t0, 2),
        "top_similarity": top_score,
        "match_count": len(matches),
        "matches":     matches[:3],
    }

    # ── Stage 2: Gemini AI Analysis ───────────────────────────────────────────
    yield {"event": "stage_start", "stage": "ai_synthesis", "label": "Gemini AI analyzing..."}
    t0 = time.time()
    synthesis = _ai_synthesise(alert_payload, matches)
    yield {
        "event":      "stage_done",
        "stage":      "ai_synthesis",
        "label":      "AI analysis complete",
        "duration_s": round(time.time() - t0, 2),
        "synthesis":  synthesis,
    }

    # ── Stage 3: Jira Ticket ──────────────────────────────────────────────────
    yield {"event": "stage_start", "stage": "jira_ticket", "label": "Creating Jira ticket..."}
    t0 = time.time()
    jira   = JiraClient()
    ticket = jira.create_ticket(
        alert=alert_payload,
        matched_incidents=matches,
        root_cause_summary=synthesis["root_cause_summary"],
        suggested_fix=synthesis["suggested_fix"],
        confidence_score=synthesis.get("confidence_score", 0.0),
    )
    yield {
        "event":      "stage_done",
        "stage":      "jira_ticket",
        "label":      "Jira ticket created",
        "duration_s": round(time.time() - t0, 2),
        "ticket":     ticket,
    }

    # ── Stage 4: Cost Savings ─────────────────────────────────────────────────
    total_elapsed = time.time() - t_start
    savings = compute_savings(matches, sentinel_seconds=total_elapsed)
    yield {
        "event":   "stage_done",
        "stage":   "cost_savings",
        "label":   "Time savings calculated",
        "savings": savings,
    }

    # ── Stage 5: Email Alert ──────────────────────────────────────────────────
    yield {"event": "stage_start", "stage": "email_alert", "label": "Sending email alert..."}
    t0 = time.time()
    email_result = send_alert_email(
        alert=alert_payload,
        ticket=ticket,
        root_cause_summary=synthesis["root_cause_summary"],
        suggested_fix=synthesis["suggested_fix"],
        confidence_score=synthesis.get("confidence_score", 0.0),
        time_saved_minutes=savings["time_saved_minutes"],
    )
    yield {
        "event":      "stage_done",
        "stage":      "email_alert",
        "label":      "Email alert sent" if email_result["sent"] else "Email alert (console only)",
        "duration_s": round(time.time() - t0, 2),
        "email":      email_result,
    }

    # ── Stage 6: Slack Notification ───────────────────────────────────────────
    yield {"event": "stage_start", "stage": "slack_notification", "label": "Sending Slack notification..."}
    t0 = time.time()
    notifier = NotificationClient()
    slack_result = notifier.notify(
        alert=alert_payload,
        ticket=ticket,
        root_cause_summary=synthesis["root_cause_summary"],
        confidence_score=synthesis.get("confidence_score", 0.0),
        time_saved_minutes=savings["time_saved_minutes"],
    )
    yield {
        "event":      "stage_done",
        "stage":      "slack_notification",
        "label":      "Slack notification sent" if slack_result["sent"] and not slack_result["mocked"] else "Slack notification (console only)",
        "duration_s": round(time.time() - t0, 2),
        "slack":      slack_result,
    }

    # ── Final result ──────────────────────────────────────────────────────────
    final_res = {
        "event":         "pipeline_complete",
        "total_seconds": round(time.time() - t_start, 2),
        "alert":         alert_payload,
        "matches":       matches[:3],
        "synthesis":     synthesis,
        "ticket":        ticket,
        "savings":       savings,
        "email":         email_result,
        "slack":         slack_result,
    }
    try:
        from config.database import save_incident_execution
        save_incident_execution(final_res)
    except Exception as db_err:
        print(f"[orchestrator] DB Save error: {db_err}")

    yield final_res


def run_pipeline(alert_payload: dict) -> dict:
    """Non-streaming version — runs all stages and returns final result."""
    result = {}
    for event in run_pipeline_stream(alert_payload):
        if event.get("event") == "pipeline_complete":
            result = event
    return result
