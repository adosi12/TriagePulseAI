# Sentinel AI — Incident Memory Database Design

## 1. Overview
The **Incident Memory** is the organizational brain of Sentinel AI. Instead of letting incident knowledge die in Slack threads or vague postmortems, Sentinel AI permanently stores every incident, its telemetry, the AI reasoning, and the final patch in a hybrid database. By using PostgreSQL coupled with the `pgvector` extension, Sentinel AI achieves both robust relational data integrity and semantic similarity search.

## 2. Memory Architecture
* **Primary Relational Datastore:** PostgreSQL 15+.
* **Vector Store:** `pgvector` extension inside PostgreSQL.
* **Hot Cache:** Redis (for live streaming session data).

## 3. Core Database Schema & DDL

Below is a conceptual schema for the most critical tables in the Incident Memory.

### Table: `incidents`
The core record of an event.
```sql
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. INC-8492
    title VARCHAR(255) NOT NULL,
    affected_service VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- CRITICAL, HIGH, MEDIUM, LOW
    status VARCHAR(50) NOT NULL, -- ACTIVE, INVESTIGATING, RESOLVED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);
```

### Table: `observations`
Stores the AI's step-by-step reasoning and final Root Cause Analysis.
```sql
CREATE TABLE observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES incidents(id),
    agent_name VARCHAR(50) NOT NULL, -- e.g., 'log_agent', 'synthesis_agent'
    observation_text TEXT NOT NULL,
    confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table: `embeddings` (pgvector)
This is where the magic happens. We store the incident summary and RCA as a 768-dimensional vector to allow for semantic search.
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES incidents(id) UNIQUE,
    document_text TEXT NOT NULL, -- The text that was embedded
    embedding vector(768) NOT NULL, -- 768 dims for text-embedding-004
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- IVFFlat index for fast approximate nearest neighbor search
CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### Table: `code_patches`
Stores the exact code or configuration diffs that resolved the issue.
```sql
CREATE TABLE code_patches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES incidents(id),
    file_path VARCHAR(255) NOT NULL,
    diff_content TEXT NOT NULL,
    applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 4. RAG Retrieval Design
When a new alert arrives (e.g., "504 Gateway Timeout in Payment Service"):
1. The text is passed to an embedding model (e.g., Google `text-embedding-004`) to generate a vector.
2. The system executes a vector similarity search in PostgreSQL:
   ```sql
   SELECT incident_id, document_text, 1 - (embedding <=> '[query_vector]') AS similarity
   FROM embeddings
   ORDER BY embedding <=> '[query_vector]'
   LIMIT 5;
   ```
3. Incidents with a similarity score > 0.85 are returned to the AI Synthesis Agent to provide historical context.

## 5. Data Retention & Privacy
* **Hot Data (0-30 days):** Raw logs and full metric time-series are kept to allow deep postmortem reviews.
* **Warm Data (31-180 days):** Raw telemetry is dropped. Only the AI observations, the RCA, the vector embeddings, and the patches are retained.
* **Privacy:** All logs are passed through a PII scrubber (Regex/NER) before being written to the database or sent to the LLM.
