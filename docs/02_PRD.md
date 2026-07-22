# Sentinel AI — Product Requirements Document (PRD)

## 1. Document Header
* **Project Name:** Sentinel AI (formerly TriagePulse AI)
* **Version:** 1.0
* **Status:** In Development
* **Target Audience:** Engineering, Product, Executive Stakeholders

## 2. Product Overview
Sentinel AI is an Autonomous AI SRE Operating System. It ingests system alerts, investigates them by correlating telemetry and historical memory, and auto-generates root cause analyses (RCA), patches, and Jira tickets. 

**Goals:**
* Reduce MTTR by 80%.
* Reduce alert fatigue and false positives.
* Build a permanent, queryable "Incident Memory" for the organization.

**Non-Goals:**
* We are not replacing APM tools (Datadog/New Relic) — we sit on top of them.
* We are not replacing human engineers — we provide a "Human-in-the-Loop" co-pilot experience.

## 3. User Stories
### SRE Engineer
* **US-01:** As an SRE, I want the system to automatically pull logs and metrics when an alert fires, so I don't have to manually query Datadog.
* **US-02:** As an SRE, I want to see a confidence score on the AI's root cause hypothesis, so I know how much to trust it.
* **US-03:** As an SRE, I want to search past incidents semantically, so I can see if we've solved this exact issue before.
* **US-04:** As an SRE, I want the AI to suggest a specific code or config patch, so I can apply the fix immediately.

### Engineering Manager
* **US-05:** As a Manager, I want a dashboard showing MTTR reduction over time, so I can prove the ROI of the tool.
* **US-06:** As a Manager, I want to see which microservices cause the most alerts, so I can prioritize technical debt.

### On-Call Developer
* **US-07:** As an on-call dev, I want a Slack message summarizing the incident in plain English, so I understand the impact before opening my laptop at 3 AM.

## 4. Functional Requirements

### Incident Intake (FR-001 to FR-010)
* **FR-001:** System MUST ingest alerts via Email (SMTP).
* **FR-002:** System MUST provide a webhook endpoint to ingest PagerDuty payloads.
* **FR-003:** System MUST parse incoming payloads to extract: severity, service name, environment, and error signature.

### AI Investigation (FR-011 to FR-020)
* **FR-011:** System MUST query the Incident Memory DB using RAG to find similar past incidents.
* **FR-012:** System MUST fetch logs for the affected service for the T-15m to T+5m window.
* **FR-013:** System MUST generate a Root Cause Analysis (RCA) hypothesis using an LLM.
* **FR-014:** System MUST calculate an AI Confidence Score (0-100%) for the RCA.

### Live Topology (FR-021 to FR-025)
* **FR-021:** System MUST render a visual dependency graph of services.
* **FR-022:** System MUST animate the graph to highlight degraded or failed nodes in real-time.

### Incident Memory (FR-026 to FR-030)
* **FR-026:** System MUST store the RCA, logs, and patch of every completed incident in PostgreSQL.
* **FR-027:** System MUST generate vector embeddings for the incident summary and store them in pgvector.

### Notifications & Tickets (FR-031 to FR-035)
* **FR-031:** System MUST automatically create a Jira ticket populated with the RCA and patch.
* **FR-032:** System MUST send a Slack block-kit message to a designated channel.

## 5. Non-Functional Requirements
* **Performance:** API endpoints must respond in < 200ms (excluding LLM calls).
* **Reliability:** The platform must maintain 99.9% uptime.
* **Security:** Data at rest and in transit must be encrypted. Logs sent to the LLM must be scrubbed of PII.
* **Scalability:** The backend must scale horizontally to handle alert storms.

## 6. Feature List & Prioritization

| Feature Name | Priority | Phase | Status |
| :--- | :--- | :--- | :--- |
| Email Alert Ingestion | P0 | MVP | Done |
| Vector Incident Memory (RAG) | P0 | MVP | Done |
| 8-Step Dashboard UI | P0 | MVP | Done |
| Jira/Slack Integration | P1 | MVP | Done |
| Manual Investigation Search | P1 | V1 | Pending |
| PagerDuty Webhooks | P1 | V1 | Pending |
| Live System Map (Otel) | P2 | V2 | Pending |

## 7. Success Metrics (OKRs)
* **Objective 1:** Drastically reduce MTTR.
  * **KR 1:** Average MTTR drops below 15 minutes by Q3.
* **Objective 2:** Build trust with the engineering team.
  * **KR 2:** >80% of AI-suggested RCAs are rated "Helpful" by human reviewers.

## 8. Constraints & Assumptions
* **Assumption:** The organization has centralized logging (Datadog, Splunk, Elastic) accessible via API.
* **Constraint:** LLM context windows may limit the amount of raw logs that can be analyzed in a single pass. Log pre-filtering agents must be used.
