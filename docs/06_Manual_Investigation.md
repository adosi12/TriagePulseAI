# Sentinel AI — Manual Investigation & Proactive Search

## 1. Overview
The **Manual Investigation** module empowers engineers to use Sentinel AI's reasoning engine outside of a formal incident. It acts as an elite research assistant. If an engineer notices a weird log line, a slow endpoint, or a strange metric spike, they can drop it into Sentinel AI to get instant context.

## 2. Investigation Search Bar
The primary entry point is an omni-search bar that accepts:
* **Raw Stack Traces:** Paste a 50-line Java stack trace.
* **Transaction IDs:** Enter a specific trace ID (e.g., `tx-99482`) to have the AI map the entire flow.
* **Natural Language Queries:** "Why is the cart-service CPU spiking right now?"
* **Log Fragments:** "ConsumerGroupRebalanceError"

## 3. The Investigation Session
Every search creates a persistent `Investigation Session`. 
* **Statefulness:** The session remembers the context. You can chat with the AI in a conversational thread ("Can you check the database logs around that same time?").
* **Collaboration:** Sessions can be shared via URL with other engineers.
* **Storage:** Sessions are saved to the `investigation_sessions` table.

## 4. Evidence Ranking & Display
When an engineer runs a manual investigation, the AI returns ranked evidence cards:
1. **Historical Matches (RAG):** "I found 3 incidents from last year with this exact error."
2. **Recent Deployments:** "Service X was deployed 14 minutes ago by User Y."
3. **Log Anomalies:** "I found 14 ERROR logs in the last 5 minutes matching this pattern."
4. **Metric Anomalies:** "Memory usage on pod-3 has grown 40% in the last hour."

## 5. Unknown Error Handling
If the engineer investigates an error that has *never* happened before (no historical RAG matches):
1. The AI tags the session as an `Unknown Observation`.
2. It attempts to read the source code (using the Code Investigation Agent) to explain what the error means based on the code execution path.
3. Once the engineer figures it out, they can click **"Save as New Incident Memory"**. This immediately embeds the problem and solution into the `pgvector` database, ensuring that if it happens again, it is no longer an "Unknown" error.

## 6. API Specification (Manual Investigation)

* `POST /api/investigate`
  * **Payload:** `{"query": "stack trace...", "time_window": "60m"}`
  * **Response:** Returns session ID and initial AI hypothesis.
* `GET /api/investigations/{session_id}`
  * Retrieves the full chat history, linked telemetry, and AI observations for the session.
* `POST /api/investigations/{session_id}/promote`
  * Promotes a manual investigation into a formal Incident (creates a Jira ticket and alerts the team).
