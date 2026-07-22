# Sentinel AI - Autonomous Production Incident Investigator

## Vision

Sentinel AI is an AI-powered SRE platform that continuously monitors
production systems, investigates incidents using telemetry and
historical knowledge, proposes fixes, creates engineering tickets, and
builds an organizational memory to reduce MTTR.

## End-to-End Workflow

1.  Incident received from Outlook/Gmail, ServiceNow, PagerDuty, or
    monitoring.
2.  Search historical incidents (last 6 months) and knowledge base.
3.  Correlate logs, metrics, traces, deployments, config diffs, and
    daily jobs.
4.  Visualize affected services on a live dependency map.
5.  Produce AI root-cause analysis with confidence score.
6.  If unresolved, scan key project files for context and generate a
    code patch.
7.  Create engineering ticket (Jira/Azure DevOps/GitHub
    Issues/ServiceNow/etc.).
8.  Store findings in Incident Memory for future investigations.

------------------------------------------------------------------------

# UI Improvements

## Live Production Map

-   Interactive dependency graph
-   Healthy (green), degraded (orange), failed (red)
-   Highlight breaking node and downstream impact
-   Show request rate, latency, queue depth, and error rate

## AI Investigation Timeline

-   Incident received
-   Historical search
-   Log analysis
-   Metrics analysis
-   Trace analysis
-   Config comparison
-   Deployment comparison
-   Code investigation
-   Patch generation
-   Ticket creation

## AI Evidence Panel

-   Logs
-   Traces
-   Metrics
-   Config changes
-   Deployment diff
-   Confidence score
-   Final AI synthesis

## Repository Investigation

When telemetry is insufficient: - Scan key configuration files - Scan
service initialization - Search error keywords - Suggest code patch -
Generate findings report if no fix is found

------------------------------------------------------------------------

# Incident Memory Database

Store: - Past incidents (minimum 6 months) - Root causes - Resolutions -
Patch history - Deployment history - Postmortems - Unknown errors -
Developer notes - Similarity index - AI observations

If users search an error without an official incident: - Save logs -
Save stack traces - Save affected service - Save environment - Save AI
observations - Reuse findings for future incidents

Suggested schema: - incidents - incident_events - observations -
telemetry_logs - metrics - traces - config_diffs - deployments -
code_patches - tickets - notifications

------------------------------------------------------------------------

# Scenario 1 -- User Reported Incident

### A. Incident Intake

-   Fetch incident from Outlook/Gmail
-   Parse email
-   Create incident
-   Assign severity

### B. Investigation

1.  Search incident history
2.  Compare with similar incidents
3.  Analyze production logs after latest deployment
4.  Review metrics
5.  Review distributed tracing
6.  Compare UAT vs Production configs
7.  Investigate codebase if needed

### C. Resolution

-   AI root cause
-   Suggested rollback/fix
-   Patch if applicable
-   Create engineering ticket
-   Attach findings
-   Update Incident Memory

------------------------------------------------------------------------

# Scenario 2 -- Daily Health Scan

### A. Scheduled Health Checks

-   APIs
-   Databases
-   Kafka
-   RabbitMQ
-   Redis
-   Cron jobs
-   Certificates
-   Secrets
-   Infrastructure
-   New Relic / Prometheus / Grafana

### B. Investigation

-   Analyze logs
-   Analyze metrics
-   Analyze traces
-   Predict impact
-   Suggest resolution

### C. Notification

Subject: NEW ERROR DETECTED -- Investigation Findings

Include: - Summary - Affected services - Root cause (if known) -
Severity - Suggested actions - Ticket link

------------------------------------------------------------------------

# Supported Ticket Providers

-   Jira
-   Azure DevOps
-   GitHub Issues
-   ServiceNow
-   Linear
-   ClickUp
-   Monday.com
-   Asana

Recommendation: - Enterprise ITSM: ServiceNow + Jira -
Engineering-first: Azure DevOps or GitHub Issues

------------------------------------------------------------------------

# Demo Scenarios

1.  Payment Authorization Failure
2.  Kafka Consumer Lag
3.  Redis Memory Exhaustion
4.  Database Connection Leak
5.  API Gateway Timeout
6.  RabbitMQ Consumer Failure
7.  Expired Secret
8.  Cron Job Failure
9.  High CPU After Deployment
10. Third-party API Rate Limit

Each scenario should include: - Email/Alert - Logs - Metrics - Traces -
Live Map - Config Diff - Deployment Diff - AI Investigation - Root
Cause - Suggested Patch - Ticket - Postmortem

------------------------------------------------------------------------

# Recommended Project Structure

``` text
sentinel-ai/
├── scenarios/
├── incident_memory/
├── telemetry/
├── live_map/
├── patch_engine/
├── notifications/
├── tickets/
└── docs/
    └── real_scenarios.md
```
