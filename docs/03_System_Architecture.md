# Sentinel AI — System Architecture

## 1. Architecture Overview

Sentinel AI utilizes an event-driven, agent-based architecture designed for high availability and low latency. The system is decoupled into a frontend presentation layer, an API gateway, an AI orchestration layer, and a robust persistence layer.

```text
+-------------------+      +-------------------+      +-------------------+
|  External Alerts  |      |   Observability   |      |   Integrations    |
| (Email, Webhooks) |      | (Logs, Metrics)   |      | (Jira, Slack)     |
+---------+---------+      +---------+---------+      +---------+---------+
          |                          |                          ^
          v                          v                          |
+-------------------------------------------------------------------------+
|                              FastAPI Gateway                            |
+-------------------------------------------------------------------------+
          |                          |                          |
          v                          v                          v
+-------------------+      +-------------------+      +-------------------+
| Incident Intake   |      | Multi-Agent       |      | Notification &    |
| Event Router      |----->| Orchestrator      |----->| Ticketing Engine  |
| (Kafka/Redis)     |      | (LangGraph/LLM)   |      |                   |
+-------------------+      +-------------------+      +-------------------+
                                     |
                                     v
                           +-------------------+
                           | Incident Memory   |
                           | (PG + pgvector)   |
                           +-------------------+
```

## 2. Architecture Principles
* **Event-Driven:** Every stage of the investigation publishes an event, allowing the frontend to stream updates via Server-Sent Events (SSE).
* **Agent-Based:** Specialized AI agents handle specific tasks (e.g., Log Analysis Agent, Patch Generation Agent).
* **RAG-First:** Historical knowledge is embedded into a vector space. Every new incident pulls context from past resolutions.
* **Human-in-the-Loop:** Auto-remediation is gated by human approval until confidence thresholds are met.

## 3. Technology Stack

| Layer | Technology | Purpose | Why Chosen |
| :--- | :--- | :--- | :--- |
| **Frontend** | React, Vite | Dashboard UI | Fast HMR, component ecosystem |
| **Backend** | Python, FastAPI | API Gateway | Async native, fast, Python ML ecosystem |
| **Orchestration**| LangGraph | Agent Workflows | Cyclic agent routing, state management |
| **LLM** | Gemini 2.0 Flash | AI Reasoning | Large context window, fast reasoning |
| **Database** | PostgreSQL | Relational Data | ACID compliance, robust |
| **Vector DB** | pgvector | Semantic Search | Co-locates relational & vector data |
| **Streaming** | Redis (Pub/Sub)| Live UI Updates | Low latency messaging |

## 4. AI Orchestration Layer (LangGraph)

The core brain of Sentinel AI is built on a LangGraph state machine. When an incident is ingested, the state machine triggers a directed acyclic graph (DAG) of agents:

1. **Intake Node:** Normalizes the alert payload.
2. **Retrieval Node:** Queries pgvector for the top 5 similar past incidents.
3. **Telemetry Node:** Fetches logs and metrics in parallel.
4. **Synthesis Node:** The LLM correlates the telemetry with historical matches to produce the RCA.
5. **Action Node:** Creates Jira tickets and fires Slack webhooks.

## 5. RAG Pipeline Architecture

We use **Retrieval-Augmented Generation (RAG)** to give the LLM historical context.
1. **Embedding:** Incident summaries and resolutions are embedded using `text-embedding-004`.
2. **Storage:** Stored in PostgreSQL using the `pgvector` extension with an `IVFFlat` index for fast Approximate Nearest Neighbor (ANN) search.
3. **Retrieval:** When a new alert fires, its signature is embedded. We perform a cosine similarity search to find the nearest vectors.
4. **Context Window:** The historical text is injected into the prompt of the Synthesis Node.

## 6. Scalability & Deployment

* **Stateless API:** The FastAPI backend is completely stateless, allowing horizontal scaling behind a load balancer.
* **Asynchronous Workers:** Heavy LLM calls are processed asynchronously via Celery or FastAPI background tasks to prevent blocking the event loop.
* **Deployment:** Containerized via Docker. Designed to run on Kubernetes (EKS/GKE) using Helm charts.
