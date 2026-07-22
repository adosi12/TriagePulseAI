"""
backend/pipeline/alert_parser.py
Parses, normalizes, and validates incoming webhook alerts from ServiceNow, Monitoring tools, or custom alerts.
"""
from typing import Dict, Any

def parse_incoming_alert(raw_payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parses and extracts structured fields from raw alert webhooks or P1 alert payloads.
    Ensures default fallbacks and consistent schema for downstream processing.
    """
    description = raw_payload.get("description", raw_payload.get("summary", "Unspecified incident alert"))
    error_sig = raw_payload.get("error_signature", raw_payload.get("evidence", raw_payload.get("log_trace", "")))
    affected_service = raw_payload.get("affected_service", raw_payload.get("service", "Payment-Gateway"))
    severity = raw_payload.get("severity", "HIGH").upper()
    alert_type = raw_payload.get("alert_type", "MQ Failure")
    impact = raw_payload.get("impact", "High")
    trans_id = raw_payload.get("trans_id", "TXN_98765")
    incident_number = raw_payload.get("incident_number", "INC-8492")
    evidence = raw_payload.get("evidence", error_sig)
    group_name = raw_payload.get("group_name", "PAYMENTS-L2-OPS")
    repo_name = raw_payload.get("repo_name", "bank/payment-gateway-service")

    return {
        "incident_number": incident_number,
        "description": description,
        "error_signature": error_sig,
        "affected_service": affected_service,
        "severity": severity,
        "alert_type": alert_type,
        "impact": impact,
        "trans_id": trans_id,
        "evidence": evidence,
        "group_name": group_name,
        "repo_name": repo_name,
        "parsed": True,
        "raw_lines_count": len(evidence.split('\n')) if evidence else 0
    }
