"""
api/main.py — TriagePulseAI FastAPI Backend
Endpoints:
  POST /api/alert         — trigger alert pipeline (returns JSON)
  POST /api/alert/stream  — trigger alert pipeline via Server-Sent Events
  GET  /api/incidents     — list incident corpus
  GET  /api/tickets       — list all mocked Jira tickets
  GET  /api/status        — health check
"""
import json
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from config.settings import print_status
from pipeline.orchestrator import run_pipeline, run_pipeline_stream

app = FastAPI(
    title="TriagePulseAI",
    description="AI-powered incident triage with Gemini, mock Jira, and email alerts.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    print_status()


# ── Models ─────────────────────────────────────────────────────────────────────

class AlertPayload(BaseModel):
    description:      str = Field(..., description="What happened")
    error_signature:  str = Field(..., description="Error message or stack trace")
    affected_service: str = Field(..., description="Which service is affected")
    severity:         str = Field("HIGH", description="LOW | MEDIUM | HIGH | CRITICAL")
    alert_type:       str = Field("MQ Failure", description="Alert categorization")
    impact:           str = Field("High", description="Impact level")
    trans_id:         str = Field("TXN_98765", description="Correlated Transaction ID")
    incident_number: str = Field("INC-8492", description="Incident ticket number")
    evidence:         str = Field("", description="Raw log or stacktrace evidence snippet")
    group_name:       str = Field("PAYMENTS-L2-OPS", description="ServiceNow Group Name")
    repo_name:        str = Field("bank/payment-gateway-service", description="GitHub/Bitbucket Repository")

    model_config = {"json_schema_extra": {"example": {
        "description":      "Cascading 504 Gateway Timeout: Jackson-databind version mismatch between UAT (v2.15.2) and Prod (v2.10.1).",
        "error_signature":  "NoSuchMethodError: com.fasterxml.jackson.databind.ObjectMapper.readTree",
        "affected_service": "Payment-Gateway",
        "severity":         "HIGH",
        "alert_type":       "MQ Failure",
        "impact":           "High",
        "trans_id":         "TXN_98765",
        "incident_number": "INC-8492",
        "evidence":         "[2026-07-20 19:41:59] ERROR ... NoSuchMethodError: com.fasterxml.jackson.databind.ObjectMapper.readTree",
        "group_name":       "PAYMENTS-L2-OPS",
        "repo_name":        "bank/payment-gateway-service"
    }}}


SERVICENOW_TICKETS = [
    {
        "incident_number": "INC0094821",
        "group_name": "PAYMENTS-L2-OPS",
        "repo_name": "bank/payment-gateway-service",
        "created_by": "Client / ServiceNow Portal (user: customer_app_service)",
        "created_at": "2026-07-21 13:45:10 UTC",
        "alert_type": "MQ Failure",
        "affected_service": "Payment-Gateway",
        "impact": "High",
        "trans_id": "TXN_98765",
        "severity": "HIGH",
        "status": "New (Raised by Client)",
        "description": "Client reported 504 Gateway Timeout during checkout payment processing. Jackson-databind version mismatch between UAT (v2.15.2) and Prod (v2.10.1). Service failed deserializing transactionMetadata.",
        "error_signature": "java.lang.NoSuchMethodError: com.fasterxml.jackson.databind.ObjectMapper.readTree",
        "evidence": "[2026-07-21 13:44:59] ERROR ... NoSuchMethodError: com.fasterxml.jackson.databind.ObjectMapper.readTree(Ljava/lang/String;)Lcom/fasterxml/jackson/databind/JsonNode;",
    },
    {
        "incident_number": "INC0095112",
        "group_name": "FRAUD-STREAM-TEAM",
        "repo_name": "bank/fraud-event-processor",
        "created_by": "ServiceNow Monitoring Bot (user: kafka_alert_sys)",
        "created_at": "2026-07-21 14:02:00 UTC",
        "alert_type": "Broker Outage",
        "affected_service": "fraud-event-stream",
        "impact": "Critical",
        "trans_id": "TXN_41109",
        "severity": "CRITICAL",
        "status": "Assigned to FRAUD-STREAM-TEAM",
        "description": "Kafka consumer group for fraud-event-stream has stopped committing offsets. Lag growing at ~50k messages/minute.",
        "error_signature": "ConsumerGroupRebalanceError: maximum poll interval exceeded (300000ms)",
        "evidence": "[2026-07-21 14:01:12] FATAL org.apache.kafka.clients.consumer.internals.ConsumerCoordinator - Consumer poll timeout exceeded limit",
    },
    {
        "incident_number": "INC0093405",
        "group_name": "SEC-NET-OPS",
        "repo_name": "bank/auth-vault-certmanager",
        "created_by": "Client Support Escalation (user: support_lead_john)",
        "created_at": "2026-07-21 12:10:30 UTC",
        "alert_type": "TLS / Cert Expiry",
        "affected_service": "payments-gateway",
        "impact": "Critical",
        "trans_id": "TXN_12048",
        "severity": "CRITICAL",
        "status": "In Progress (Client Ticket)",
        "description": "payments-gateway is refusing all incoming SSL client handshakes. Cert renewal job failed silently in Vault.",
        "error_signature": "javax.net.ssl.SSLHandshakeException: Certificate expired at 2026-07-21T12:00:00Z",
        "evidence": "[2026-07-21 12:05:04] ERROR org.apache.coyote.http11.Http11NioProtocol - Failed to initialize end point associated with ProtocolHandler javax.net.ssl.SSLHandshakeException",
    },
    {
        "incident_number": "INC0096220",
        "group_name": "CORE-BANKING-DEV",
        "repo_name": "bank/core-auth-service",
        "created_by": "ServiceNow Incident Mgmt (user: client_portal_admin)",
        "created_at": "2026-07-21 11:30:15 UTC",
        "alert_type": "ServiceNow Ingest",
        "affected_service": "core-banking-auth",
        "impact": "High",
        "trans_id": "TXN_88301",
        "severity": "HIGH",
        "status": "New (Client Ticket)",
        "description": "ServiceNow ticket assigned to CORE-BANKING-DEV: Core banking authentication service failing during peak hours.",
        "error_signature": "java.lang.OutOfMemoryError: Metaspace pool exhausted",
        "evidence": "[2026-07-21 11:25:22] FATAL java.lang.OutOfMemoryError: Metaspace pool exhausted during reflection proxy generation",
    },
]


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/api/status")
def status():
    return {"status": "ok", "service": "TriagePulseAI", "version": "1.0.0"}


@app.get("/api/servicenow/tickets")
def list_servicenow_tickets(group_name: str | None = None, repo_name: str | None = None, incident_number: str | None = None):
    """Fetch incidents raised in ServiceNow by client/user based on group_name, repo_name, or incident_number."""
    tickets = SERVICENOW_TICKETS
    if incident_number:
        tickets = [t for t in tickets if t["incident_number"].lower() == incident_number.lower()]
    else:
        if group_name:
            tickets = [t for t in tickets if group_name.lower() in t["group_name"].lower()]
        if repo_name:
            tickets = [t for t in tickets if repo_name.lower() in t["repo_name"].lower()]
    return {"total": len(tickets), "tickets": tickets}


@app.get("/api/scenarios")
def list_scenarios():
    """List 12+ real-world production incident scenarios."""
    path = Path(__file__).parent.parent / "data" / "scenarios.json"
    if path.exists():
        try:
            scenarios = json.loads(path.read_text())
            return {"scenarios": scenarios}
        except Exception:
            pass
    return {"scenarios": SERVICENOW_TICKETS}


@app.get("/api/history")
def list_history(limit: int = 50):
    """List persistent execution history from SQLite DB."""
    try:
        from config.database import get_recent_history
        history = get_recent_history(limit)
        return {"total": len(history), "history": history}
    except Exception as err:
        return {"total": 0, "history": [], "error": str(err)}


@app.get("/api/tickets")
def list_tickets():
    """List all mocked Jira tickets created so far from SQLite database."""
    try:
        from config.database import get_all_tickets
        tickets = get_all_tickets()
        if tickets:
            return {"total": len(tickets), "tickets": tickets}
    except Exception:
        pass

    path = Path(__file__).parent.parent / "data" / "jira_tickets.json"
    if not path.exists():
        return {"total": 0, "tickets": []}
    tickets = json.loads(path.read_text())
    return {"total": len(tickets), "tickets": tickets}


@app.post("/api/alert")
def process_alert(alert: AlertPayload):
    """Run the full pipeline and return JSON result."""
    try:
        return run_pipeline(alert.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/alert/stream")
def process_alert_stream(alert: AlertPayload):
    """Run the pipeline and stream each stage as Server-Sent Events."""
    def generate():
        try:
            for event in run_pipeline_stream(alert.model_dump()):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'event': 'error', 'detail': str(exc)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/incidents")
def list_incidents(limit: int = 20, family: str | None = None):
    """List historical incident corpus."""
    path = Path(__file__).parent.parent / "data" / "incidents.json"
    if not path.exists():
        raise HTTPException(status_code=503, detail="Run: python data/generate_incidents.py")
    incidents = json.loads(path.read_text())
    if family:
        incidents = [i for i in incidents if i.get("family") == family]
    return {"total": len(incidents), "incidents": incidents[:limit]}


class JiraCreatePayload(BaseModel):
    jira_id: str = Field("TPAI-492")
    summary: str = Field(...)
    service: str = Field(...)
    severity: str = Field("HIGH")
    description: str = Field("")

@app.post("/api/jira/create")
def create_jira_ticket(payload: JiraCreatePayload):
    """Create and persist a Jira ticket."""
    new_ticket = {
        "ticket_id": payload.jira_id,
        "url": f"https://your-org.atlassian.net/browse/{payload.jira_id}",
        "status": "open (created)",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "affected_service": payload.service,
        "severity": payload.severity,
        "summary": payload.summary,
        "root_cause": payload.description[:120],
        "confidence": "94%",
        "mocked": True,
    }
    try:
        from config.database import save_ticket
        save_ticket(new_ticket)
    except Exception as db_err:
        print(f"[api] Save ticket DB error: {db_err}")

    path = Path(__file__).parent.parent / "data" / "jira_tickets.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    tickets = []
    if path.exists():
        try:
            tickets = json.loads(path.read_text())
        except Exception:
            tickets = []
    tickets.append(new_ticket)
    path.write_text(json.dumps(tickets, indent=2))
    return {"status": "success", "ticket": new_ticket}


class SlackAlertPayload(BaseModel):
    channel: str = Field("#incident-response")
    incident_number: str = Field("INC-8492")
    message: str = Field(...)

@app.post("/api/slack/send")
def send_slack_alert(payload: SlackAlertPayload):
    """Send a mocked Slack alert."""
    return {
        "status": "sent",
        "channel": payload.channel,
        "incident_number": payload.incident_number,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

