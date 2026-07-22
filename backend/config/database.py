"""
database.py - SQLite storage for TriagePulseAI persistent history and created memory.
"""
import sqlite3
import json
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "data" / "triage_pulse.db"

def get_db_connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Table for incident triage history & executions
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS incident_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            incident_number TEXT UNIQUE,
            trans_id TEXT,
            affected_service TEXT,
            severity TEXT,
            alert_type TEXT,
            description TEXT,
            error_signature TEXT,
            confidence REAL,
            matched_family TEXT,
            root_cause TEXT,
            remediation TEXT,
            jira_ticket_id TEXT,
            execution_status TEXT,
            raw_payload TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Table for created tickets memory
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS persisted_tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id TEXT UNIQUE,
            url TEXT,
            status TEXT,
            affected_service TEXT,
            severity TEXT,
            summary TEXT,
            root_cause TEXT,
            confidence TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()

def save_incident_execution(result_data: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    alert = result_data.get("alert", {})
    triage = result_data.get("triage", {})
    jira = result_data.get("jira", {})
    
    incident_number = alert.get("incident_number", f"INC-{int(datetime.utcnow().timestamp())}")
    
    cursor.execute("""
        INSERT OR REPLACE INTO incident_history (
            incident_number, trans_id, affected_service, severity, alert_type,
            description, error_signature, confidence, matched_family, root_cause,
            remediation, jira_ticket_id, execution_status, raw_payload
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        incident_number,
        alert.get("trans_id", ""),
        alert.get("affected_service", ""),
        alert.get("severity", ""),
        alert.get("alert_type", ""),
        alert.get("description", ""),
        alert.get("error_signature", ""),
        triage.get("confidence", 0.0),
        triage.get("matched_family", ""),
        triage.get("root_cause", ""),
        triage.get("remediation", ""),
        jira.get("ticket_id", ""),
        result_data.get("status", "SUCCESS"),
        json.dumps(result_data)
    ))
    conn.commit()
    conn.close()

def get_recent_history(limit: int = 50):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM incident_history ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def save_ticket(ticket_data: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO persisted_tickets (
            ticket_id, url, status, affected_service, severity, summary, root_cause, confidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        ticket_data.get("ticket_id"),
        ticket_data.get("url"),
        ticket_data.get("status"),
        ticket_data.get("affected_service"),
        ticket_data.get("severity"),
        ticket_data.get("summary"),
        ticket_data.get("root_cause"),
        ticket_data.get("confidence")
    ))
    conn.commit()
    conn.close()

def get_all_tickets():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM persisted_tickets ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

# Initialize DB when module loaded
init_db()
