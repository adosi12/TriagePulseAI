# Sentinel AI — Complete Database Design

## 1. Database Architecture Overview
Sentinel AI uses a Polyglot Persistence strategy:
* **PostgreSQL (Primary):** Stores incidents, users, sessions, metadata, and vectors (`pgvector`).
* **Redis:** Caches hot data, manages websocket pub/sub, and handles API rate limiting.

## 2. Entity Relationship Diagram (ERD)

```text
+----------------+       +-------------------+       +-------------------+
|     users      |       |    incidents      |       |  code_patches     |
|----------------|       |-------------------|       |-------------------|
| id (PK)        |<----->| id (PK)           |------>| id (PK)           |
| name           |       | incident_number   |       | incident_id (FK)  |
| role           |       | severity          |       | file_path         |
+----------------+       | status            |       | diff_content      |
                         +-------------------+       +-------------------+
                                   |                           
                                   v                           
+----------------+       +-------------------+       +-------------------+
|  telemetry     |       |    embeddings     |       |  observations     |
|----------------|       |-------------------|       |-------------------|
| id (PK)        |<------| incident_id (FK)  |<------| id (PK)           |
| incident_id    |       | embedding(768)    |       | incident_id (FK)  |
| log_dump       |       | document_text     |       | observation_text  |
+----------------+       +-------------------+       +-------------------+
```

## 3. Core Tables DDL

### Users & Teams
```sql
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slack_channel VARCHAR(50)
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'ENGINEER'
);
```

### Telemetry Snapshots
When an incident occurs, we snapshot the relevant logs so they aren't lost to log rotation.
```sql
CREATE TABLE telemetry_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    service_name VARCHAR(100) NOT NULL,
    log_level VARCHAR(10) NOT NULL,
    log_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    message TEXT NOT NULL
);
```

### Deployments & Config Diffs
```sql
CREATE TABLE deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    environment VARCHAR(20) NOT NULL,
    commit_sha VARCHAR(40) NOT NULL,
    deployed_by UUID REFERENCES users(id),
    deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE config_diffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES incidents(id),
    deployment_id UUID REFERENCES deployments(id),
    file_path VARCHAR(255) NOT NULL,
    diff_content TEXT NOT NULL
);
```

### Investigation Sessions (Manual Proactive)
```sql
CREATE TABLE investigation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    query TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    promoted_to_incident_id UUID REFERENCES incidents(id) NULL
);
```

## 4. Query Optimization & Indexes
* **Vector Index:** The `embeddings` table uses an `IVFFlat` index on the `embedding` column to speed up cosine similarity searches (`<=>`).
* **Time-Series Indexes:** Indexes are placed on `(service_name, log_timestamp)` in the `telemetry_logs` table to ensure fast querying of log windows.
* **Foreign Keys:** All foreign keys are indexed to speed up joins when loading the full UI dashboard.

## 5. Data Governance & PII
* **Soft Deletes:** Incidents are never deleted. `DELETE` operations only toggle a `deleted_at` timestamp column.
* **PII Scrubbing:** The backend pipeline runs a regex PII scrubber on all `message` fields in `telemetry_logs` before inserting them into the database to ensure no passwords, emails, or API keys are stored in plaintext or sent to the LLM.
