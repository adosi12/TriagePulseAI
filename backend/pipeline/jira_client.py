"""
pipeline/jira_client.py — Mock Jira Client
Stores tickets locally in data/jira_tickets.json.
No network calls needed.
"""
import json
import random
from datetime import datetime
from pathlib import Path

TICKETS_FILE = Path(__file__).parent.parent / "data" / "jira_tickets.json"


class JiraClient:
    """Creates Jira-style tickets, stored locally (mocked)."""

    def create_ticket(
        self,
        alert: dict,
        matched_incidents: list[dict],
        root_cause_summary: str,
        suggested_fix: str,
        confidence_score: float,
    ) -> dict:
        affected = alert.get("affected_service", "unknown")
        ticket_id = f"TPAI-{random.randint(1000, 9999)}"
        timestamp = datetime.utcnow().isoformat() + "Z"

        matched_lines = [
            f"  [{m['incident']['incident_id']}] score={m['similarity_score']:.3f} | {m['incident']['root_cause'][:80]}"
            for m in matched_incidents[:3]
        ]

        ticket = {
            "ticket_id":       ticket_id,
            "url":             f"https://your-org.atlassian.net/browse/{ticket_id}",
            "status":          "open (mocked)",
            "created_at":      timestamp,
            "affected_service": affected,
            "severity":        alert.get("severity", "HIGH"),
            "summary":         f"[TriagePulseAI] Incident: {affected} — {alert.get('error_signature', '')[:60]}",
            "root_cause":      root_cause_summary,
            "suggested_fix":   suggested_fix,
            "confidence":      f"{confidence_score:.0%}",
            "matched_incidents": matched_lines,
            "mocked":          True,
        }

        # Persist locally
        TICKETS_FILE.parent.mkdir(parents=True, exist_ok=True)
        existing = []
        if TICKETS_FILE.exists():
            existing = json.loads(TICKETS_FILE.read_text())
        existing.append(ticket)
        TICKETS_FILE.write_text(json.dumps(existing, indent=2))

        print(f"[jira] Mocked ticket created: {ticket_id}")
        return ticket
