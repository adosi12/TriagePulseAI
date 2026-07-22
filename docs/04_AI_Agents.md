# Sentinel AI — AI Agent Design & Specifications

## 1. Agent Architecture Overview

Sentinel AI employs a Multi-Agent System (MAS) orchestrated via LangGraph. Instead of a single monolithic prompt, tasks are divided among specialized agents. This reduces hallucination, allows for parallel processing, and fits complex investigations into the LLM context window.

## 2. Core Agents Specification

### 📥 1. Incident Intake Agent
* **Purpose:** The frontline parser. It converts chaotic, unstructured email and webhook payloads into a clean JSON object.
* **Input:** Raw text (email body, JSON webhook).
* **Output:** `IncidentSchema` (Severity, Service Name, Time, Error Signature).
* **SLA:** < 500ms.

### 🧠 2. Historical Memory Agent (RAG)
* **Purpose:** The historian. Searches the pgvector database for similar past incidents.
* **Input:** Error Signature and Service Name.
* **Process:** Generates an embedding, performs cosine similarity search, filters results >80% similarity.
* **Output:** Top 3 historical incident summaries and their applied resolutions.

### 📜 3. Log Analysis Agent
* **Purpose:** The investigator. Reads raw logs from the incident window.
* **Process:** Filters out INFO/DEBUG noise. Groups similar stack traces to find the "first domino" error.
* **Tools Used:** Elasticsearch API / Datadog API.
* **Failure Mode:** If logs exceed context window, falls back to summarizing the last 50 ERROR lines.

### 📊 4. Metrics Agent
* **Purpose:** The vital signs monitor. Looks at time-series data.
* **Input:** Telemetry window (T-15m to T+5m).
* **Process:** Identifies spikes in Error Rate, Latency p99, and CPU saturation.
* **Output:** A natural language summary of infrastructure health (e.g., "CPU spiked to 99% right before the 504 gateway timeouts began").

### 🗺️ 5. Trace & Topology Agent
* **Purpose:** The cartographer. Analyzes OpenTelemetry distributed traces.
* **Process:** Follows a specific Transaction ID through the microservice graph to pinpoint exactly which downstream service failed and caused the cascade.

### 🔬 6. Code & Config Diff Agent
* **Purpose:** The auditor. "What changed?"
* **Process:** Pulls the Git commit diff or infrastructure-as-code (Terraform) diff for the most recent deployment preceding the incident.
* **Output:** Identifies if a recent change (e.g., a dependency bump or environment variable change) is the likely culprit.

### 💡 7. Synthesis Agent (RCA)
* **Purpose:** The Lead SRE. This is the master agent.
* **Input:** Outputs from all previous agents (Logs, Metrics, Traces, Diffs, Memory).
* **Process:** Synthesizes the data into a cohesive Root Cause Analysis.
* **Output:** 
  1. Plain English Root Cause.
  2. Recommended Mitigation.
  3. AI Confidence Score (0-100%).

### 🎫 8. Ticketing & Notification Agent
* **Purpose:** The communicator. 
* **Process:** Drafts and creates the Jira ticket using the REST API. Formats the RCA into a Slack Block-Kit message and fires the webhook.

## 3. Confidence Scoring Algorithm

The final Confidence Score is a weighted average of:
1. **RAG Match Score (40%):** How similar is this to a known, solved past incident?
2. **Log Clarity (30%):** Did the Log Agent find a definitive FATAL/Exception stack trace?
3. **Diff Correlation (30%):** Was there a recent deployment that directly touches the failing component?

*If confidence is < 75%, the system tags the incident as "Requires Human Investigation."*
