"""
Notification Client
===================
Posts a Slack summary when SLACK_WEBHOOK_URL is set.
Otherwise MOCKED — logs to console and returns a fake response.

# MOCK STATUS: MOCKED unless SLACK_WEBHOOK_URL is set in config.
#              To enable: fill SLACK_WEBHOOK_URL in .env
"""

import json

import requests

from config.settings import SLACK_WEBHOOK_URL, SLACK_ENABLED


class NotificationClient:
    """
    Sends Slack notifications for resolved incidents.

    # MOCKED when SLACK_WEBHOOK_URL is not set.
    """

    def __init__(self):
        self.webhook_url = SLACK_WEBHOOK_URL
        self.is_mocked = not SLACK_ENABLED

        if self.is_mocked:
            print("[notification] ⚠ MOCKED — SLACK_WEBHOOK_URL not set. Logging to console.")

    def notify(
        self,
        alert: dict,
        ticket: dict,
        root_cause_summary: str,
        confidence_score: float,
        time_saved_minutes: float,
    ) -> dict:
        """
        Send a Slack message summarising the auto-resolution.

        Returns dict: {sent: bool, mocked: bool, channel: str}
        """
        message = self._build_message(
            alert, ticket, root_cause_summary, confidence_score, time_saved_minutes
        )

        if self.is_mocked:
            return self._mock_notify(message)
        return self._real_notify(message)

    # ── message builder ───────────────────────────────────────────────────────

    def _build_message(
        self,
        alert: dict,
        ticket: dict,
        root_cause_summary: str,
        confidence_score: float,
        time_saved_minutes: float,
    ) -> dict:
        affected = alert.get("affected_service", "unknown")
        ticket_id = ticket.get("ticket_id", "N/A")
        ticket_url = ticket.get("url", "#")

        return {
            "text": f"🚨 *Sentinel Auto-Resolution* — `{affected}`",
            "blocks": [
                {
                    "type": "header",
                    "text": {"type": "plain_text", "text": "🚨 Sentinel — Incident Auto-Resolved"},
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*Service:*\n`{affected}`"},
                        {"type": "mrkdwn", "text": f"*Confidence:*\n{confidence_score:.0%}"},
                        {"type": "mrkdwn", "text": f"*Ticket:*\n<{ticket_url}|{ticket_id}>"},
                        {"type": "mrkdwn", "text": f"*Time saved:*\n~{time_saved_minutes:.0f} min"},
                    ],
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Root cause:*\n{root_cause_summary[:300]}",
                    },
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": "_Auto-created by Sentinel. Please review before closing._",
                        }
                    ],
                },
            ],
        }

    # ── real Slack webhook ────────────────────────────────────────────────────

    def _real_notify(self, message: dict) -> dict:
        resp = requests.post(
            self.webhook_url,
            headers={"Content-Type": "application/json"},
            data=json.dumps(message),
            timeout=10,
        )
        resp.raise_for_status()
        return {"sent": True, "mocked": False, "channel": "slack"}

    # ── MOCKED fallback ───────────────────────────────────────────────────────
    # # MOCKED: Logs message to stdout instead of posting to Slack.
    # # Swap to _real_notify when SLACK_WEBHOOK_URL is available.

    def _mock_notify(self, message: dict) -> dict:
        print("[notification] # MOCKED Slack message:")
        print(f"  → {message['text']}")
        for block in message.get("blocks", []):
            if block.get("type") == "section" and "text" in block:
                print(f"  → {block['text']['text'][:120]}")
        return {"sent": True, "mocked": True, "channel": "console"}
