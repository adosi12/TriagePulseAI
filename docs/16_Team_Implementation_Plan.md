# 🚀 Sentinel AI — Team Implementation & Development Plan

## 📌 Executive Summary
The Sentinel AI (TriagePulse) frontend UI, event-driven workflow, and architectural docs are now established. The current application uses an advanced mock-data layer to demonstrate the "AI SRE Operating System" vision.

This document serves as the **Implementation Blueprint** for the engineering team to replace the mock data layer with live integrations (LLMs, Telemetry, Databases, and APIs) and move the platform toward a production-ready MVP.

---

## 🏗️ Phase 1: Core AI & LLM Integration
**Goal**: Replace hardcoded AI analysis with live calls to the Google Gemini 2.0 API.

### 📝 Tasks:
1. **API Keys & Environment**:
   - Ensure `GEMINI_API_KEY` is loaded via `dotenv` in `backend/config/settings.py`.
2. **LLM Orchestrator**:
   - Build out `backend/pipeline/orchestrator.py` to accept dynamic prompts.
   - Design the base "System Prompt" instructing Gemini on how to behave as an SRE investigator.
3. **Structured Outputs**:
   - Implement `pydantic` schemas for Gemini to return structured JSON (Hypothesis, Confidence Score, Mitigation Steps, Patch Diff).
4. **Frontend Streaming**:
   - Hook up the React frontend to the `POST /api/alert/stream` endpoint using Server-Sent Events (SSE) to stream the LLM's thought process live.

---

## 📊 Phase 2: Live Telemetry & Observability Ingestion
**Goal**: Move away from static `scenarios` and fetch real logs, metrics, and traces.

### 📝 Tasks:
1. **Log Aggregation Hook**:
   - Build a connector (e.g., in `backend/pipeline/telemetry.py`) to fetch logs based on timestamp boundaries and service names from your log provider (Datadog, Splunk, Elastic, or CloudWatch).
2. **Metrics Fetcher**:
   - Integrate with Prometheus/Grafana or your APM provider to pull CPU, Memory, Error Rate, and Latency time-series data dynamically during an incident window.
3. **Live Topology Builder**:
   - Replace the hardcoded `scenario.topology` with an auto-generated service dependency graph, built by querying OpenTelemetry (OTEL) trace correlations.
4. **Context Assembly**:
   - Write a pre-processor that truncates and sanitizes this telemetry data before injecting it into the Gemini LLM context window to prevent token overflow.

---

## 🧠 Phase 3: Incident Memory (PostgreSQL + pgvector)
**Goal**: Build the organizational brain that allows Sentinel to remember past incidents.

### 📝 Tasks:
1. **Database Setup**:
   - Provision a PostgreSQL database and enable the `pgvector` extension.
   - Run the SQL DDL scripts to create `incidents`, `observations`, and `embeddings` tables.
2. **Embedding Pipeline**:
   - Implement `backend/pipeline/embedder.py` using a text embedding model (e.g., `text-embedding-004`).
   - Write the logic to embed resolved incident reports and store them in the database.
3. **RAG Retrieval**:
   - Build the similarity search query: When a new alert arrives, embed the alert text and search `pgvector` for the top 3 most similar past incidents (Cosine Similarity).
4. **Feedback Loop**:
   - Create an API endpoint for engineers to rate the AI's investigation (Thumbs up/down). Use this to adjust embedding weights over time.

---

## 🎫 Phase 4: Ticketing & Notifications
**Goal**: Automate outbound communication and tracking.

### 📝 Tasks:
1. **Jira/ServiceNow Integration**:
   - Complete `backend/pipeline/jira_client.py`. Authenticate using a service account token.
   - Map Sentinel's JSON output (Title, Severity, RCA, Service) to the respective Jira API fields and `POST` to create the ticket.
2. **Slack Block Kit**:
   - Upgrade `notification_client.py` to use Slack's Block Kit API for beautiful, actionable alerts. Include buttons like "Acknowledge" and "View RCA".
3. **ServiceNow Inbound Webhook**:
   - Expose `POST /api/webhooks/snow` to listen for new incident creations in ServiceNow, triggering the Sentinel AI pipeline autonomously.

---

## 🔐 Phase 5: Production Readiness & Security
**Goal**: Harden the application for deployment to the corporate network.

### 📝 Tasks:
1. **Authentication (SSO/JWT)**:
   - Add OAuth2/OIDC integration to the FastAPI backend and React frontend so only authenticated engineers can view incidents or trigger pipelines.
2. **Dockerization**:
   - Create `Dockerfile` for the frontend and backend.
   - Write a unified `docker-compose.yml` that spins up FastAPI, React, PostgreSQL (with pgvector), and Redis.
3. **Rate Limiting & Secrets**:
   - Implement `slowapi` rate limiting on the backend.
   - Move all API keys out of `.env` and into a secure vault (e.g., HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager).

---

## 🎯 Next Steps for the Team
1. **Review the architecture**: Ensure everyone understands the flow from `React` -> `FastAPI` -> `Gemini/Postgres`.
2. **Assign domains**: Use the [Teammate Work Distribution Guide](../README.md) to assign Frontend, Backend, Data, and DevOps tasks.
3. **Start Coding**: 
   - Backend engineers: Start on **Phase 1 (LLM Orchestration)**.
   - Frontend engineers: Hook up the SSE stream to the UI.
   - Data/DevOps: Stand up the Postgres database.

*Let's build the future of AI-driven SRE!*
