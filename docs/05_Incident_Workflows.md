# Sentinel AI — Incident Investigation Workflows

## 1. Workflow Overview
Sentinel AI supports two primary investigation workflows:
1. **Reactive Workflow:** Triggered automatically by a monitoring alert or ITSM ticket. The AI takes the lead.
2. **Proactive Workflow (Manual Investigation):** Triggered by an engineer searching for an anomaly or error signature. The engineer takes the lead, and the AI acts as a research assistant.

## 2. Reactive Workflow (Step-by-Step)
When a critical alert fires in PagerDuty or an email is received, Sentinel AI executes the following sequence:

* **Step 1: Intake (T+0s)**
  * **Action:** Parse incoming JSON or text. Extract `incident_id`, `service`, `severity`, and `error_signature`.
  * **Output:** Standardized Incident Object.
* **Step 2: Historical Memory (T+1s)**
  * **Action:** RAG vector search against `pgvector` for past incidents with >80% similarity.
  * **Output:** Top 3 matching historical incidents and their applied resolutions.
* **Step 3: Telemetry Correlation (T+3s)**
  * **Action:** Fetch logs (filtering out INFO/DEBUG), pull metrics for the last 15 minutes, and retrieve relevant distributed traces.
  * **Output:** Consolidated telemetry payload.
* **Step 4: Live Map Rendering (T+4s)**
  * **Action:** Map the failing service and identify any degraded downstream dependencies to determine the blast radius.
* **Step 5: Root Cause Analysis (T+10s)**
  * **Action:** Synthesis Agent (LLM) reviews telemetry and historical matches to draft a conclusive RCA.
  * **Output:** RCA Text + Confidence Score (0-100%).
* **Step 6: Code/Config Patch (T+15s)**
  * **Action:** If confidence >80%, scan recent Git commits and generate a diff to revert or fix the issue.
* **Step 7: Ticketing & Notifications (T+16s)**
  * **Action:** Create Jira ticket, update ServiceNow, and post a Slack message summarizing the RCA and tagging the on-call engineer.
* **Step 8: Memory Update (Post-Resolution)**
  * **Action:** Once the incident is closed, store the final RCA, patch, and engineer feedback into the `pgvector` database to improve future RAG results.

## 3. Workflow Decision Matrix (Escalation)

| AI Confidence | Action | Human Interaction Required |
| :--- | :--- | :--- |
| **> 95%** | Auto-Remediate (Future Phase) | No. AI applies patch and resolves ticket. |
| **80% - 94%** | Draft RCA & Suggest Patch | Yes. Engineer reviews and clicks "Apply Patch". |
| **< 79%** | Gather Data & Escalate | Yes. AI admits uncertainty, provides raw logs/traces, and pages the engineer immediately. |

## 4. Proactive Manual Investigation Workflow
Engineers can use the "Manual Investigation" view to search for anomalies without an active incident.

1. **Search:** Engineer enters an error string, transaction ID, or vague description (e.g., "Why are payments slow today?").
2. **Session Creation:** A unique `investigation_session` is created.
3. **AI Search:** Sentinel AI parses the query, identifies the likely service, and pulls the last 60 minutes of telemetry.
4. **Hypothesis Generation:** The AI presents 3 possible hypotheses ranked by probability.
5. **Observation Storage:** Even if no incident is declared, the session and the AI's findings are saved as an "Observation" in the database for future reference.

## 5. Daily Health Scan Workflow
Sentinel AI runs a background cron job every 24 hours (or configurable interval) to proactively scan for silent failures:
* **Certificate Expiry:** Checks Vault/CertManager for SSL certs expiring in < 30 days.
* **Memory Leaks:** Analyzes weekly JVM/Redis memory trends.
* **Database Deadlocks:** Scans Postgres logs for long-running transactions.
If an anomaly is detected, it triggers the Reactive Workflow as a "Low/Warning" severity incident.
