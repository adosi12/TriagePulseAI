# Kickoff prompt — paste this into Code / your coding assistant to start the project

---

I'm building a hackathon project for a bank called **Sentinel** — an AI-assisted incident auto-resolution tool for interdependent banking systems (payments, MQ, certs, libraries). When one system fails, dependents break too, and engineers waste time re-diagnosing root causes that were already solved in a past incident. Sentinel shortens that gap by matching new alerts against historical incidents (RAG), falling back to log search and code investigation, then auto-creating a Jira ticket and notifying the team.

**Time budget:** this is a hackathon, not production software. Favor working end-to-end over complete-but-broken. Mock anything that requires real credentials/access I don't have yet (ServiceNow, real Jira, real Slack) behind a clean interface so it's a one-line swap later — don't block progress waiting on integration access.

## Tech stack (decided, don't relitigate)
- Backend: Python (FastAPI)
- Embeddings + retrieval: sentence-transformers (local, no API key needed) with FAISS or Chroma as the vector store — swappable later for Vertex AI embeddings
- LLM for synthesis (root cause writeup, ticket drafting): Claude API (or Vertex AI Gemini — pick whichever I have a key for; ask me if unclear)
- Ticketing: Jira REST API if I provide a token, otherwise a mocked `JiraClient` class that returns a realistic ticket object
- Notification: Slack incoming webhook if I provide a URL, otherwise a mocked `NotificationClient`
- Frontend: a simple React dashboard that shows the pipeline stages lighting up live as an alert is processed, plus a cost/time-saved panel
- Data: synthetic dataset, ServiceNow-shaped (see below)

## Build order — follow this sequence, don't jump ahead
1. **Dummy incident dataset.** Generate 50–100 synthetic incident records as JSON, ServiceNow-shaped: `incident_id, description, error_signature, affected_service, root_cause, resolution, resolved_by, date`. Cover three scenario families evenly: (a) TLS/cert issues, (b) MQ/broker outages, (c) library/dependency version mismatches (UAT-passed-prod-failed style). Make the descriptions varied in phrasing, not templated copies, so semantic search is a real test.
2. **Embedding + RAG matching module.** Embed the incident corpus, expose a function `match_incident(alert_payload) -> list[{incident, similarity_score}]`. Test it standalone with a few synthetic alerts before wiring anything else — this is the core of the project, get it right first.
3. **Alert trigger + pipeline orchestration.** A simple endpoint/function that accepts a synthetic alert payload and runs it through the pipeline stages in sequence, with each stage's output logged/returned so the frontend can show progress.
4. **Jira ticket creation.** Templated ticket payload: title, affected services, root cause, matched historical incidents (with similarity scores), suggested fix, confidence score. Real API call if I give you a token, mocked otherwise.
5. **Cost/time-saved panel logic.** Compute a simple comparison: average historical manual-triage time (put a plausible number in the dummy dataset per incident) vs. Sentinel's actual processing time for this run. Expose this as data the frontend can render.
6. **Team notification.** Slack webhook post (or mock) summarizing the ticket.
7. **Log analysis fallback.** Only if steps 1–6 are solid and time remains: a small synthetic log corpus + keyword/error-signature matching, triggered when RAG confidence is below a threshold.
8. **Code investigation fallback.** Lowest priority: a shallow scan (grep/diff) over a sample repo for recent dependency version bumps or UAT-vs-prod config diffs. It's fine if this only works convincingly on one pre-built example rather than being fully general.

## What "done" looks like for a first working demo
Stages 1–5 running end-to-end: a synthetic alert goes in, a matched historical incident comes out with a similarity score, a Jira ticket (real or mocked) is created with that evidence attached, and the dashboard shows a "manual triage: ~40 min vs Sentinel: X sec" comparison. Everything past that is a bonus, not a blocker.

## How I want you to work
- Ask me up front which LLM/embedding API keys I actually have available, rather than assuming.
- Build stage 1–2 first and show me the RAG matching working on a couple of test alerts before writing any frontend code.
- Keep the repo structure clean and modular (`data/`, `pipeline/`, `api/`, `frontend/`) so it's easy to demo and easy for me to explain to judges.
- Flag clearly in comments/README anywhere something is mocked vs. real, so I don't accidentally claim a real integration in the demo.
