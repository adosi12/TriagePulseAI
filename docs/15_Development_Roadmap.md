# Sentinel AI — Development Roadmap

## 1. Roadmap Philosophy
Sentinel AI is developed using a phase-gated, customer-validated approach. We prioritize features that directly reduce MTTR and alert fatigue.

## 2. Phase 1: MVP — The Copilot (Months 1-3)
**Goal:** Deliver a functional Human-in-the-Loop AI assistant capable of triaging synthetic incidents and proving core ROI.
* ✅ **Feature 1:** 8-Step Dashboard UI (Vite/React).
* ✅ **Feature 2:** Incident Intake API (FastAPI) for Email/SNOW.
* ✅ **Feature 3:** Vector Memory (pgvector) RAG search implementation.
* ✅ **Feature 4:** Synthetic Demo Data generation (10 scenarios).
* 🔄 **Feature 5:** Jira & Slack API integrations (Live mode).
* 🔄 **Feature 6:** LLM Synthesis Agent using Gemini 2.0 Flash.
* **Exit Criteria:** Platform can successfully parse a dummy payload, find a historical match, draft an RCA, and render it in the UI in under 15 seconds.

## 3. Phase 2: Enterprise SRE OS (Months 4-6)
**Goal:** Integrate directly into production telemetry and ITSM tools. Transition from synthetic data to live infrastructure data.
* **Feature 1:** OpenTelemetry (OTel) Integration. Direct ingestion of traces to build the Live Topology Map.
* **Feature 2:** Datadog / New Relic API connections to pull live logs and metric time-series.
* **Feature 3:** Manual Investigation Search Bar & Session management.
* **Feature 4:** Code & Config Diff Agent. Connecting the AI to GitHub/GitLab to read recent commits.
* **Feature 5:** PagerDuty & ServiceNow inbound webhooks.
* **Feature 6:** AI Impact Dashboard (ROI tracking).
* **Exit Criteria:** System successfully investigates a real staging-environment outage using live logs and traces.

## 4. Phase 3: Autonomous SRE (Months 7-9)
**Goal:** Increase AI confidence to the point where it can generate code patches and auto-resolve known issues.
* **Feature 1:** Patch Generation Agent. AI writes the actual code fix or Terraform config change.
* **Feature 2:** Human-in-the-Loop Patch Approval UI (1-click PR creation).
* **Feature 3:** Multi-tenant RBAC (Role-Based Access Control) for enterprise deployment.
* **Feature 4:** Self-learning loop (Agent fine-tuning based on engineer feedback scores).
* **Exit Criteria:** Sentinel AI opens a Pull Request on GitHub with a valid bug fix for a detected incident.

## 5. Phase 4: Self-Healing Platform (Months 10-12)
**Goal:** Zero-touch remediation for high-confidence, recurring issues.
* **Feature 1:** Auto-Remediation Engine. If Confidence > 98% (e.g., a known Redis OOM or stuck Kafka consumer), the system executes a predefined runbook (e.g., restarts the pod) without waking the engineer.
* **Feature 2:** Predictive Anomaly Detection. Identifying degrading metrics hours before they breach SLAs.
* **Feature 3:** Cross-organization Knowledge Federation (sharing anonymized vector embeddings across enterprise silos).

## 6. Technical Debt & Risks
* **Risk 1:** LLM Context Window limits when ingesting massive log dumps.
  * *Mitigation:* Implement strict pre-filtering agents (Regex clustering) before sending logs to the LLM.
* **Risk 2:** High latency during pgvector similarity searches at scale.
  * *Mitigation:* Tune `ivfflat` index lists and implement Redis caching for frequent error signatures.
