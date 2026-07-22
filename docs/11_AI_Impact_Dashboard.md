# Sentinel AI — AI Impact & ROI Dashboard

## 1. Overview
The **AI Impact Dashboard** is a critical view designed for Engineering Managers and Executives. Its primary purpose is to justify the investment in the platform by quantifying exactly how much time, money, and pain Sentinel AI has saved the organization.

## 2. KPI Definitions

| KPI | Formula / Definition | Value to Business |
| :--- | :--- | :--- |
| **MTTR Reduction** | `(Baseline Manual MTTR) - (AI MTTR)` | Direct correlation to system uptime and revenue protection. |
| **Total Cost Saved ($)** | `(Total Minutes Saved) * (Cost of Downtime per Min)` | Hard financial ROI. |
| **Engineering Hours Saved** | `(Incidents) * (Avg Manual Hours - Avg AI Hours)` | Represents reclaimed engineering capacity for feature work. |
| **Incidents Auto-Resolved** | Count of incidents where AI confidence > 90% and patch was applied | Demonstrates the progression toward fully Autonomous SRE. |
| **AI Accuracy Rate** | `% of RCAs marked "Helpful/Accurate" by humans` | Tracks the trustworthiness of the LLM and RAG pipeline. |
| **Alert Fatigue Reduction** | `% of alerts classified as noise/false positive by AI` | Direct correlation to engineer morale and retention. |

## 3. Dashboard Layout Design

1. **Hero KPI Strip:** Large, bold numbers at the very top showing: `Total Cost Saved (YTD)`, `Engineering Hours Saved`, and `MTTR Reduction %`.
2. **MTTR Trend Chart:** A line chart overlaying two lines: The rolling 30-day average MTTR of manual incidents vs. AI-assisted incidents.
3. **ROI Calculator Panel:** An interactive section where a manager can input their specific variables (e.g., Team Size: 50, Avg Salary: $150k, Downtime Cost: $5k/min) to project annual savings.
4. **Service Leaderboard:** A table showing which microservices have the most incidents, and which have benefited the most from AI auto-triage.

## 4. Time-Series Metrics & Data Sources

The dashboard pulls aggregated data from the PostgreSQL database, primarily by joining the `incidents` table with the `observations` and `code_patches` tables.

Example Query for MTTR calculation:
```sql
SELECT 
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60) as avg_mttr_minutes
FROM incidents
WHERE status = 'RESOLVED' 
  AND ai_assisted = TRUE
  AND created_at >= NOW() - INTERVAL '30 days';
```

## 5. Executive Summary Generation
The dashboard includes a button to **"Export Executive Report"**. This triggers the Gemini LLM to read the dashboard's JSON metrics and write a 3-paragraph natural language summary suitable for a C-suite presentation (e.g., "In Q3, Sentinel AI processed 142 critical alerts, preventing an estimated $420,000 in downtime...").
