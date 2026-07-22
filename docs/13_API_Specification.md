# Sentinel AI — Complete API Specification

## 1. API Overview
* **Base URL:** `http://localhost:8000/api`
* **Content-Type:** `application/json`
* **Authentication:** API requests must include a Bearer Token in the Authorization header (except for webhook ingestion endpoints).
* **Rate Limiting:** Global limit of 100 requests per minute per IP.

---

## 2. Incident Endpoints

### `GET /api/incidents`
Retrieve a list of historical and active incidents.
* **Query Params:** `status`, `severity`, `service`, `limit`, `offset`
* **Response:**
```json
{
  "total": 142,
  "incidents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "incident_number": "INC-8492",
      "title": "Payment Gateway 504 Timeouts",
      "severity": "CRITICAL",
      "status": "RESOLVED",
      "created_at": "2026-07-20T19:41:58Z"
    }
  ]
}
```

### `GET /api/incidents/{id}`
Retrieve full details of a specific incident, including the AI's root cause analysis and telemetry window.

---

## 3. Investigation Pipeline Endpoints

### `POST /api/alert`
Synchronously trigger the Sentinel AI investigation pipeline. 
* **Payload:**
```json
{
  "source": "PagerDuty",
  "incident_number": "PD-991",
  "service": "core-auth-service",
  "severity": "HIGH",
  "error_signature": "java.lang.OutOfMemoryError: Metaspace"
}
```
* **Response:** Returns the final RCA, suggested patch, and created Jira ticket ID. Note: This request may take 10-15 seconds to complete.

### `POST /api/alert/stream`
Trigger the pipeline and stream the agent reasoning step-by-step using Server-Sent Events (SSE). This is used by the frontend Dashboard to animate the 8-step pipeline.

### `POST /api/investigate` (Manual Investigation)
Trigger a proactive investigation session without an active incident.
* **Payload:**
```json
{
  "query": "Why did we see a spike in ConsumerGroupRebalanceError in the fraud-stream-prod cluster around 14:00?",
  "time_window": "60m"
}
```
* **Response:** `{"session_id": "uuid", "status": "processing"}`

---

## 4. Telemetry Endpoints

### `GET /api/logs`
* **Query Params:** `service`, `level` (ERROR, WARN, INFO), `from_ts`, `to_ts`
* **Response:** Array of log objects with timestamps.

### `GET /api/metrics/{service}`
Retrieve time-series metric snapshots (Error Rate, Latency, CPU).

---

## 5. Topology Endpoints

### `GET /api/topology`
Returns the full service dependency graph required to render the Live System Map.
* **Response:**
```json
{
  "nodes": [
    {"id": "payment-gateway", "label": "Payment GW", "type": "service", "status": "failed"}
  ],
  "edges": [
    {"source": "api-gateway", "target": "payment-gateway", "status": "alert"}
  ]
}
```

---

## 6. Incident Memory Endpoints

### `GET /api/memory/search`
Perform a semantic vector search against past incidents.
* **Query Params:** `q` (The error string to embed and search)
* **Response:**
```json
{
  "matches": [
    {
      "incident_id": "INC-2025-1832",
      "similarity_score": 0.94,
      "title": "Jackson databind regression",
      "resolution": "Bumped version to 2.15.2"
    }
  ]
}
```

---

## 7. Webhook Ingestion
Sentinel AI provides dedicated, unauthenticated endpoints to receive payloads directly from monitoring tools. The payload is normalized internally before triggering the pipeline.
* `POST /api/webhooks/pagerduty`
* `POST /api/webhooks/servicenow`
* `POST /api/webhooks/datadog`
