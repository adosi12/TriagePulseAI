"""
pipeline/jira_client.py — Jira Client
Creates real Jira tickets via API when JIRA_ENABLED is true.
Falls back to storing tickets locally in data/jira_tickets.json when mocked.
"""
import json
import random
import requests
from datetime import datetime
from pathlib import Path

from config.settings import (
    JIRA_URL,
    JIRA_USER,
    JIRA_API_TOKEN,
    JIRA_PROJECT_KEY,
    JIRA_ENABLED,
)

TICKETS_FILE = Path(__file__).parent.parent / "data" / "jira_tickets.json"


class JiraClient:
    """Creates Jira tickets (real or mocked)."""

    def __init__(self):
        self.is_mocked = not JIRA_ENABLED
        if self.is_mocked:
            print("[jira] ⚠ MOCKED — Jira credentials not set. Tickets will be saved locally.")

    def create_ticket(
        self,
        alert: dict,
        matched_incidents: list[dict],
        root_cause_summary: str,
        suggested_fix: str,
        confidence_score: float,
    ) -> dict:
        affected = alert.get("affected_service", "unknown")
        summary = f"[TriagePulseAI] Incident: {affected} — {alert.get('error_signature', '')[:60]}"
        
        matched_lines = [
            f"[{m['incident']['incident_id']}] score={m['similarity_score']:.3f} | {m['incident']['root_cause'][:80]}"
            for m in matched_incidents[:3]
        ]
        
        description = f"""
*Affected Service:* {affected}
*Severity:* {alert.get("severity", "HIGH")}
*AI Confidence:* {confidence_score:.0%}

*Root Cause Analysis:*
{root_cause_summary}

*Suggested Fix:*
{suggested_fix}

*Matched Historical Incidents:*
{chr(10).join(matched_lines)}
"""

        if self.is_mocked:
            return self._mock_create_ticket(alert, summary, description, root_cause_summary, suggested_fix, confidence_score, matched_lines)
        
        return self._real_create_ticket(alert, summary, description, root_cause_summary, suggested_fix, confidence_score, matched_lines)

    def _real_create_ticket(self, alert, summary, description, root_cause_summary, suggested_fix, confidence_score, matched_lines):
        url = f"{JIRA_URL.rstrip('/')}/rest/api/2/issue"
        
        payload = {
            "fields": {
                "project": {"key": JIRA_PROJECT_KEY},
                "summary": summary,
                "description": description,
                "issuetype": {"name": "Bug"}
            }
        }
        
        try:
            response = requests.post(
                url,
                json=payload,
                auth=(JIRA_USER, JIRA_API_TOKEN),
                headers={"Accept": "application/json"}
            )
            response.raise_for_status()
            data = response.json()
            ticket_id = data.get("key")
            
            ticket = {
                "ticket_id":       ticket_id,
                "url":             f"{JIRA_URL.rstrip('/')}/browse/{ticket_id}",
                "status":          "open",
                "created_at":      datetime.utcnow().isoformat() + "Z",
                "affected_service": alert.get("affected_service", "unknown"),
                "severity":        alert.get("severity", "HIGH"),
                "summary":         summary,
                "root_cause":      root_cause_summary,
                "suggested_fix":   suggested_fix,
                "confidence":      f"{confidence_score:.0%}",
                "matched_incidents": matched_lines,
                "mocked":          False,
            }
            print(f"[jira] Real ticket created: {ticket_id}")
            return ticket
        except Exception as e:
            print(f"[jira] Failed to create Jira ticket: {e}")
            print("[jira] Falling back to local mock...")
            return self._mock_create_ticket(alert, summary, description, root_cause_summary, suggested_fix, confidence_score, matched_lines)

    def _mock_create_ticket(self, alert, summary, description, root_cause_summary, suggested_fix, confidence_score, matched_lines):
        ticket_id = f"{JIRA_PROJECT_KEY}-{random.randint(1000, 9999)}"
        timestamp = datetime.utcnow().isoformat() + "Z"

        ticket = {
            "ticket_id":       ticket_id,
            "url":             f"https://mocked.atlassian.net/browse/{ticket_id}",
            "status":          "open (mocked)",
            "created_at":      timestamp,
            "affected_service": alert.get("affected_service", "unknown"),
            "severity":        alert.get("severity", "HIGH"),
            "summary":         summary,
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
