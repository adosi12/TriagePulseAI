# Sentinel AI — About the Project

## 1. Project Story
The initial inspiration for Sentinel AI came from a highly stressful Black Friday outage. An upstream database connection pool was exhausted, causing a downstream message queue to back up, which ultimately caused the public-facing API to throw 504 timeouts. 

Three different teams (Database, Messaging, and Frontend) were paged. Everyone looked at their own Datadog dashboards in isolation. It took 85 minutes to manually correlate the traces across three systems to find the root cause. A week later, we realized the *exact same outage* had happened 6 months prior, but the senior engineer who fixed it had since left the company, and the knowledge was lost in an old Slack thread.

**Sentinel AI was built to ensure that never happens again.**

## 2. What Makes Sentinel AI Different?

| Dimension | PagerDuty / Opsgenie | Datadog / New Relic | Sentinel AI |
| :--- | :--- | :--- | :--- |
| **Core Function** | Alert Routing & Paging | Telemetry Visualization | **Autonomous Investigation** |
| **When an alert fires...**| It wakes up a human. | It draws a red spike on a graph. | It reads logs, finds the root cause, and writes a patch. |
| **Historical Memory** | None. | 30-day log retention. | Permanent Vector DB (pgvector) embedding of all past incidents. |
| **Action Taken** | Creates a ticket. | Sends a webhook. | Generates the code fix and drafts the Jira ticket. |

## 3. AI Techniques Used
Sentinel AI is not just a wrapper around an LLM API. It is a highly orchestrated AI system:
1. **Multi-Agent Orchestration (LangGraph):** Tasks are split. One agent reads logs, another reads metrics, another reads the Git diff. A final "Synthesis Agent" acts as the lead engineer to combine the findings.
2. **Retrieval-Augmented Generation (RAG):** LLMs don't know your company's specific architecture. By storing past incidents in PostgreSQL using `pgvector`, we pull the top 3 most similar past outages and feed them to the LLM as context *before* it generates the RCA.
3. **Structured Outputs:** We force the LLM to reply in strict JSON schemas, allowing us to programmatically render the UI confidence bars, checklists, and topology maps without parsing messy markdown.

## 4. Architecture Principles
* **Event-Driven:** Sentinel AI responds to webhooks instantly.
* **Human-in-the-Loop:** We do not automatically apply code changes to production. The AI drafts the Pull Request; a human approves it.
* **Explainable AI:** The AI provides a Confidence Score (0-100%) and cites the exact log lines and metric spikes it used to reach its conclusion.

## 5. Contact & Roadmap
Sentinel AI is currently in active development transitioning from MVP to Enterprise Beta. For details on upcoming features, please review the [Development Roadmap](15_Development_Roadmap.md).
