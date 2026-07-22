# Sentinel AI — UI/UX Design Specification

## 1. Design Philosophy
The UI is designed to feel like an **Autonomous AI SRE Operating System**, not a standard dashboard or a simple chatbot. 
* **Premium Dark Theme:** Engineered for on-call engineers working in low-light environments. 
* **Step-by-Step Clarity:** Instead of overwhelming the user with 50 charts at once, the UI walks through a vertical, 8-step investigation wizard.
* **Glassmorphism & Depth:** Subtle blurs and glowing accents are used to indicate active AI processing.

## 2. Design System Tokens
* **Backgrounds:** `var(--bg-base)` (#0b0f19), `var(--bg-surface)` (#111827).
* **Accents:** 
  * AI Processing (Blue/Purple): `#3b82f6` to `#8b5cf6`.
  * Success (Green): `#10b981`.
  * Warning (Amber): `#f59e0b`.
  * Critical (Red): `#ef4444`.
* **Typography:** `Inter` for standard text, `JetBrains Mono` for logs, traces, and code diffs.

## 3. Core Component Library

### 3.1 The 8-Step Pipeline Stepper
This is the central nervous system of the UI. It represents the AI's thought process.
* **States:** Pending (gray hollow circle), Active (pulsing blue ring with loading shimmer), Done (solid green check).
* **Interaction:** Clicking a step's header expands its specific body panel (Logs, RCA, Patch, etc.), collapsing the others.

### 3.2 Telemetry Tabs (Logs, Metrics, Traces)
Inside Step 3, telemetry is tabbed.
* **Log Viewer:** Displays lines with strict monospace fonts. Keywords like `ERROR`, `FATAL`, and `Exception` are aggressively highlighted with red backgrounds.
* **Metrics Chart:** Simple vertical bars showing error rate spikes mapped against time.
* **Traces:** Horizontal Gantt-style bars showing span durations.

### 3.3 Live Topology Map
A visual grid representing microservices.
* **Nodes:** Square cards displaying the service name, an icon, and a status dot. 
* **Edges:** Connecting lines that pulse red if failure propagation is detected between the nodes.
* **Interaction:** Clicking a node opens a pop-over with exact error details and metrics for that service.

### 3.4 Root Cause & Confidence Bar
* **Confidence Bar:** A horizontal fill bar. If <75%, it is yellow. If >90%, it glows blue/green.
* **RCA Text Box:** Formatted Markdown text explaining the issue clearly, mimicking an elite senior engineer's assessment.

### 3.5 Code Diff Viewer
Mimics GitHub's PR diff view.
* Red background for deleted lines (`-`).
* Green background for added lines (`+`).
* Header shows `+{additions} -{deletions}`.

## 4. Page Layouts (Navigation)
* **AI Investigation (Home):** The main 8-step wizard.
* **Root Cause (Standalone):** A clean, printable/shareable view of just the RCA and patch.
* **Service Map:** A full-screen view of the Live Topology Map.
* **Logs & Metrics:** Dedicated full-screen explorers for manual deep dives.
* **Incident Memory:** A tabular view of the historical PostgreSQL database.
* **AI Impact:** The ROI executive dashboard.
* **Integrations:** A grid of connection cards for Jira, Slack, PagerDuty, etc.
