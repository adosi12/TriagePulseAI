"""
config/database.py - PostgreSQL storage with pgvector for TriagePulseAI persistent history and memory.
"""
import json
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from pgvector.sqlalchemy import Vector
from config.settings import DATABASE_URL

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class IncidentHistory(Base):
    __tablename__ = "incident_history"
    id = Column(Integer, primary_key=True, index=True)
    incident_number = Column(String, unique=True, index=True)
    trans_id = Column(String)
    affected_service = Column(String)
    severity = Column(String)
    alert_type = Column(String)
    description = Column(Text)
    error_signature = Column(String)
    confidence = Column(Float)
    matched_family = Column(String)
    root_cause = Column(Text)
    remediation = Column(Text)
    jira_ticket_id = Column(String)
    execution_status = Column(String)
    raw_payload = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class PersistedTicket(Base):
    __tablename__ = "persisted_tickets"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(String, unique=True, index=True)
    url = Column(String)
    status = Column(String)
    affected_service = Column(String)
    severity = Column(String)
    summary = Column(Text)
    root_cause = Column(Text)
    confidence = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class IncidentEmbedding(Base):
    __tablename__ = "incident_embeddings"
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String, unique=True, index=True)
    affected_service = Column(String)
    description = Column(Text)
    error_signature = Column(String)
    root_cause = Column(Text)
    resolution = Column(Text)
    # The embeddings from all-MiniLM-L6-v2 have 384 dimensions
    embedding = Column(Vector(384))
    created_at = Column(DateTime, default=datetime.utcnow)

def init_db():
    try:
        # Create pgvector extension if it doesn't exist
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
    except Exception as e:
        print(f"[database] Could not ensure vector extension (ensure pgvector is installed): {e}")

    Base.metadata.create_all(bind=engine)

def save_incident_execution(result_data: dict):
    db = SessionLocal()
    try:
        alert = result_data.get("alert", {})
        triage = result_data.get("triage", {})
        jira = result_data.get("jira", {})
        
        incident_number = alert.get("incident_number", f"INC-{int(datetime.utcnow().timestamp())}")
        
        # Check if exists
        record = db.query(IncidentHistory).filter(IncidentHistory.incident_number == incident_number).first()
        if not record:
            record = IncidentHistory(incident_number=incident_number)
            db.add(record)
        
        record.trans_id = alert.get("trans_id", "")
        record.affected_service = alert.get("affected_service", "")
        record.severity = alert.get("severity", "")
        record.alert_type = alert.get("alert_type", "")
        record.description = alert.get("description", "")
        record.error_signature = alert.get("error_signature", "")
        record.confidence = triage.get("confidence", 0.0)
        record.matched_family = triage.get("matched_family", "")
        record.root_cause = triage.get("root_cause", "")
        record.remediation = triage.get("remediation", "")
        record.jira_ticket_id = jira.get("ticket_id", "")
        record.execution_status = result_data.get("status", "SUCCESS")
        record.raw_payload = json.dumps(result_data)
        
        db.commit()
    finally:
        db.close()

def get_recent_history(limit: int = 50):
    db = SessionLocal()
    try:
        rows = db.query(IncidentHistory).order_by(IncidentHistory.id.desc()).limit(limit).all()
        return [row.__dict__ for row in rows]
    finally:
        db.close()

def save_ticket(ticket_data: dict):
    db = SessionLocal()
    try:
        ticket_id = ticket_data.get("ticket_id")
        record = db.query(PersistedTicket).filter(PersistedTicket.ticket_id == ticket_id).first()
        if not record:
            record = PersistedTicket(ticket_id=ticket_id)
            db.add(record)
            
        record.url = ticket_data.get("url")
        record.status = ticket_data.get("status")
        record.affected_service = ticket_data.get("affected_service")
        record.severity = ticket_data.get("severity")
        record.summary = ticket_data.get("summary")
        record.root_cause = ticket_data.get("root_cause")
        record.confidence = ticket_data.get("confidence")
        
        db.commit()
    finally:
        db.close()

def get_all_tickets():
    db = SessionLocal()
    try:
        rows = db.query(PersistedTicket).order_by(PersistedTicket.id.desc()).all()
        return [row.__dict__ for row in rows]
    finally:
        db.close()

# Needed for vector creation
from sqlalchemy import text

