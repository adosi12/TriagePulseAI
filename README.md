# 🚨 TriagePulse AI (Sentinel)

> **AI-Powered Incident Auto-Resolution & Root Cause Triage Platform for Interdependent Systems**

TriagePulse AI (Sentinel) is an intelligent incident auto-resolution tool designed for complex, interdependent software environments (payments, MQ brokers, TLS certificates, microservice libraries). When a downstream system fails, upstream dependencies often trigger cascading alerts. TriagePulse AI matches incoming alert payloads against historical incident records using Retrieval-Augmented Generation (RAG), synthesizes root cause analyses with generative AI (Google Gemini), auto-generates Jira tickets, and dispatches instant team notifications with cost/time-saved calculations.

---

## 📌 Table of Contents

- [Overview & Architecture](#-overview--architecture)
- [Repository Structure](#-repository-structure)
- [Quick Start & Setup](#-quick-start--setup)
  - [1. Backend Setup](#1-backend-setup-fastapi--python)
  - [2. Frontend Setup](#2-frontend-setup-react--vite)
  - [3. Environment Configuration](#3-environment-configuration)
- [Teammate Work Distribution Guide](#-teammate-work-distribution-guide)
  - [🎨 1. Frontend & UX Engineers](#-1-frontend--ux-engineers)
  - [⚡ 2. Backend & API Engineers](#-2-backend--api-engineers)
  - [🧠 3. AI / ML & Data Engineers](#-3-ai--ml--data-engineers)
  - [🛠️ 4. DevOps, QA & Security Engineers](#%EF%B8%8F-4-devops-qa--security-engineers)
- [API Endpoint Reference](#-api-endpoint-reference)
- [Mock vs Live Integration Matrix](#-mock-vs-live-integration-matrix)
- [Contributing & Development Guidelines](#-contributing--development-guidelines)

---

## 🏗️ Overview & Architecture

```
                       ┌──────────────────────────────┐
                       │  Incoming Infrastructure     │
                       │     Alert Payload            │
                       └──────────────┬───────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │   FastAPI Backend         │
                        │  (backend/api/main.py)    │
                        └─────────────┬─────────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           │                          │                          │
           ▼                          ▼                          ▼
┌────────────────────┐    ┌─────────────────────┐    ┌──────────────────────┐
│ 1. Vector RAG      │    │ 2. AI Synthesis     │    │ 3. Automated Actions │
│    Match           │    │    (Gemini 2.0)     │    │                      │
│ SentenceTransformer│───►│ Root Cause Analysis │───►│ - Jira Ticket Create │
│    + FAISS Index   │    │ Fix Recommendations │    │ - Email/Slack Alert  │
└────────────────────┘    └─────────────────────┘    │ - ROI & Savings Calc │
                                                     └──────────────────────┘
                                                                 │
                                                                 ▼
                                                     ┌──────────────────────┐
                                                     │  React Dashboard     │
                                                     │  (SSE Live Stream)   │
                                                     └──────────────────────┘
```

---

## 📁 Repository Structure

The project follows a clean decoupled structure:

```
triagePulseAI/
├── backend/                  # Python FastAPI Backend & AI Pipeline
│   ├── api/                  # FastAPI Application & REST Endpoints
│   │   ├── __init__.py
│   │   └── main.py           # API routes (/api/alert, /api/alert/stream, /api/incidents, etc.)
│   ├── config/               # Application Settings & Configuration
│   │   ├── __init__.py
│   │   └── settings.py       # Environment variable loaders & startup status logger
│   ├── data/                 # Dataset & Generator Scripts
│   │   ├── generate_incidents.py # Synthetic incident generator (ServiceNow-shaped)
│   │   └── incidents.json    # 50+ pre-generated incident corpus
│   ├── pipeline/             # Core Pipeline Modules
│   │   ├── __init__.py
│   │   ├── cost_calculator.py# ROI & Manual vs AI time saved logic
│   │   ├── email_client.py   # SMTP alert notification client
│   │   ├── embedder.py       # SentenceTransformers & FAISS RAG indexer
│   │   ├── jira_client.py    # Mock/Live Jira REST ticket generator
│   │   ├── notification_client.py # Multi-channel notification dispatcher
│   │   ├── orchestrator.py   # Pipeline runner (Sync & SSE Stream)
│   │   └── test_rag.py       # Standalone RAG test suite
│   ├── .env.example          # Backend environment variables template
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React + Vite Frontend Application
│   ├── public/               # Static web assets
│   ├── src/                  # React Application Source
│   │   ├── assets/
│   │   ├── App.css           # Dashboard CSS
│   │   ├── App.jsx           # Main Dashboard component (Live stream, incident list, tickets)
│   │   ├── index.css         # Global styles & glassmorphism theme
│   │   └── main.jsx          # React DOM entry point
│   ├── index.html            # Single page application template
│   ├── package.json          # Node dependencies & scripts
│   ├── vite.config.js        # Vite dev server configuration
│   └── README.md             # Frontend-specific documentation
├── .env                      # Local secret environment configuration (git-ignored)
├── .env.example              # Master environment configuration guide
├── requirements.txt          # Root Python dependencies reference
├── sentinel-kickoff-prompt.md# Project specs & hackathon prompt reference
└── README.md                 # Project Master README & Task Distribution Guide
```

---

## 🚀 Quick Start & Setup

### Prerequisites
- **Python**: 3.10+
- **Node.js**: 18.x or 20.x+
- **Git**

---

### 1. Backend Setup (FastAPI & Python)

```bash
# Navigate to the backend directory
cd backend

# Create a Python virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy .env.example to .env
cp .env.example .env

# Run the FastAPI server
uvicorn api.main:app --reload --port 8000
```

> The API will be available at: **`http://localhost:8000`**  
> Interactive OpenAPI documentation (Swagger UI): **`http://localhost:8000/docs`**

---

### 2. Frontend Setup (React + Vite)

```bash
# Open a new terminal and navigate to the frontend directory
cd frontend

# Install Node modules
npm install

# Start the Vite development server
npm run dev
```

> The web dashboard will be available at: **`http://localhost:5173`**

---

### 3. Environment Configuration

Copy `.env.example` to `.env` in the root or `backend/` directory:

```env
# Gemini API Key (for live AI synthesis)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash

# Email Notifications (Optional - falls back to console mock if not set)
ALERT_EMAIL_TO=oncall-team@company.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

---

## 🔎 Proactive Manual Investigation (Examples)

You can use the **Manual Search** feature in the UI to proactively investigate anomalies, even before an official incident is declared. Navigate to the **"🔎 Manual Search"** tab in the sidebar and try pasting these real-world examples:

### 1. Natural Language Query (Investigating a spike)
> "Why did we see a sudden spike in `ConsumerGroupRebalanceError` in the `fraud-stream-prod` Kafka cluster around 14:00 today?"

### 2. Investigating Latency (Vague symptoms)
> "Customers are reporting checkout failures, and I'm seeing intermittent p99 latency spikes > 2000ms on the `payment-gateway` service. No PagerDuty alerts have fired yet. What changed in the last hour?"

### 3. A Raw Stack Trace (Pasting logs directly)
> ```text
> org.springframework.transaction.CannotCreateTransactionException: Could not open JDBC Connection for transaction; nested exception is java.sql.SQLTransientConnectionException: HikariPool-1 - Connection is not available, request timed out after 30000ms.
> 	at org.springframework.jdbc.datasource.DataSourceTransactionManager.doBegin(DataSourceTransactionManager.java:309)
> 	at com.bank.payments.service.TransactionService.process(TransactionService.java:42)
> ```

### 4. Searching for a specific Transaction/Trace ID
> "Investigate trace ID `7b4f9e1a-8c2d-4e9f-b3a1-2d6c8f0e5a9b`. The user got a 502 Bad Gateway but I don't see any obvious errors in the frontend logs."

### 5. Config / Deployment check
> "Did anyone deploy to the `auth-service` this morning? I am seeing a flood of 401 Unauthorized errors from the mobile app clients."

---

## 👥 Teammate Work Distribution Guide

To accelerate development, team members can claim specific components and features below based on their expertise. 

---

### 🎨 1. Frontend & UX Engineers

**Primary Directory**: [`frontend/src/`](file:///d:/2026Projects/triagePulseAI/frontend/src)  
**Key Files**:
- [`frontend/src/App.jsx`](file:///d:/2026Projects/triagePulseAI/frontend/src/App.jsx) — Core dashboard state & API streams
- [`frontend/src/index.css`](file:///d:/2026Projects/triagePulseAI/frontend/src/index.css) — Design system & Glassmorphism styles
- [`frontend/src/App.css`](file:///d:/2026Projects/triagePulseAI/frontend/src/App.css) — Component-specific layout styles

#### 📋 Actionable Tasks & Improvements:
1. **Enhanced Live Pipeline Stage Stream**:
   - Improve the visual SSE stream in `App.jsx` with animated progress steppers, active timers per stage, and color-coded status badges (`Matched`, `Analyzing`, `Ticket Created`, `Alert Sent`).
2. **Interactive Incident Corpus Explorer**:
   - Add search input, multi-select service tags (e.g. `MQ Broker`, `TLS Cert`, `Payment Gateway`), and a modal dialog to inspect full JSON details for any incident returned by `GET /api/incidents`.
3. **Analytics & ROI Cost Savings Charts**:
   - Integrate a charting library (e.g. Recharts or Chart.js) to render dynamic bar/line charts comparing historical manual resolution times (mins) vs TriagePulse AI processing time (secs).
4. **Dark Mode & Accessibility (a11y)**:
   - Add a seamless Dark/Light mode toggle, ensure high-contrast color ratios for alert badges, and add keyboard shortcuts (`Ctrl+K` to search incidents).

---

### ⚡ 2. Backend & API Engineers

**Primary Directory**: [`backend/api/`](file:///d:/2026Projects/triagePulseAI/backend/api) & [`backend/pipeline/`](file:///d:/2026Projects/triagePulseAI/backend/pipeline)  
**Key Files**:
- [`backend/api/main.py`](file:///d:/2026Projects/triagePulseAI/backend/api/main.py) — FastAPI routes
- [`backend/pipeline/jira_client.py`](file:///d:/2026Projects/triagePulseAI/backend/pipeline/jira_client.py) — Jira integration client
- [`backend/pipeline/notification_client.py`](file:///d:/2026Projects/triagePulseAI/backend/pipeline/notification_client.py) — Multi-channel notification dispatcher
- [`backend/pipeline/orchestrator.py`](file:///d:/2026Projects/triagePulseAI/backend/pipeline/orchestrator.py) — Pipeline controller

#### 📋 Actionable Tasks & Improvements:
1. **Production Jira API Integration**:
   - Extend [`jira_client.py`](file:///d:/2026Projects/triagePulseAI/backend/pipeline/jira_client.py) to send HTTP REST requests (`POST /rest/api/3/issue`) to Atlassian Jira when credentials are provided in `.env`, maintaining fallback to the current mock mode.
2. **Slack & Microsoft Teams Webhook Integration**:
   - Upgrade [`notification_client.py`](file:///d:/2026Projects/triagePulseAI/backend/pipeline/notification_client.py) to format Slack Block Kit messages with direct action buttons (`View Ticket`, `Acknowledge`) and send via incoming webhooks.
3. **ServiceNow / PagerDuty Webhook Ingest Endpoint**:
   - Create a new endpoint `POST /api/webhooks/incoming` in [`backend/api/main.py`](file:///d:/2026Projects/triagePulseAI/backend/api/main.py) to parse standard ServiceNow or PagerDuty incident payloads and automatically trigger the pipeline.
4. **Async Task Processing (Celery / Background Tasks)**:
   - Introduce asynchronous background task execution for heavy RAG indexing or notification steps to keep API response times ultra-fast.
5. **Authentication & Rate Limiting**:
   - Add API Key header validation (`X-API-Key`) or JWT OAuth2 bearer authentication middleware and rate limiting using `slowapi`.

---

### 🧠 3. AI / ML & Data Engineers

**Primary Directory**: [`backend/pipeline/`](file:///d:/2026Projects/triagePulseAI/backend/pipeline) & [`backend/data/`](file:///d:/2026Projects/triagePulseAI/backend/data)  
**Key Files**:
- [`backend/pipeline/embedder.py`](file:///d:/2026Projects/triagePulseAI/backend/pipeline/embedder.py) — Vector embeddings & FAISS search
- [`backend/pipeline/orchestrator.py`](file:///d:/2026Projects/triagePulseAI/backend/pipeline/orchestrator.py) — LLM synthesis logic
- [`backend/data/generate_incidents.py`](file:///d:/2026Projects/triagePulseAI/backend/data/generate_incidents.py) — Synthetic incident generator

#### 📋 Actionable Tasks & Improvements:
1. **Persistent Vector Store (ChromaDB / Pgvector / Qdrant)**:
   - Upgrade [`embedder.py`](file:///d:/2026Projects/triagePulseAI/backend/pipeline/embedder.py) from in-memory FAISS to a persistent vector store (e.g. ChromaDB or Pgvector) to allow dynamic insertion of new resolved incidents without re-indexing from scratch.
2. **Multi-LLM Provider Support & Fallback Chain**:
   - Enhance `_ai_synthesise` in [`orchestrator.py`](file:///d:/2026Projects/triagePulseAI/backend/pipeline/orchestrator.py) to support fallback logic across LLM providers (e.g. Gemini 2.0 Flash -> Claude 3.5 -> OpenAI GPT-4o).
3. **RAG Benchmarking & Evaluation Suite**:
   - Create `backend/pipeline/eval_rag.py` to calculate match accuracy, Recall@K, and Mean Reciprocal Rank (MRR) across test alert payloads to fine-tune similarity score thresholds.
4. **Log & Code Investigation Fallbacks**:
   - Implement Stage 7 (Log Corpus keyword/error signature matching) and Stage 8 (Git diff / commit scan for recent dependency version bumps or config drifts).
5. **Expanded Incident Dataset & Domain Models**:
   - Expand [`generate_incidents.py`](file:///d:/2026Projects/triagePulseAI/backend/data/generate_incidents.py) to cover edge cases like database connection pool exhaustion, DNS resolution timeouts, and IAM permission changes.

---

### 🛠️ 4. DevOps, QA & Security Engineers

**Primary Directory**: [`backend/`](file:///d:/2026Projects/triagePulseAI/backend), [`frontend/`](file:///d:/2026Projects/triagePulseAI/frontend) & Root  
**Key Files**:
- [`backend/requirements.txt`](file:///d:/2026Projects/triagePulseAI/backend/requirements.txt)
- [`frontend/package.json`](file:///d:/2026Projects/triagePulseAI/frontend/package.json)

#### 📋 Actionable Tasks & Improvements:
1. **Containerization (Docker & Docker Compose)**:
   - Create `Dockerfile.backend`, `Dockerfile.frontend`, and a unified `docker-compose.yml` to launch backend, frontend, and vector store with one command.
2. **CI/CD Automation (GitHub Actions)**:
   - Add `.github/workflows/ci.yml` for automated linting (Ruff/Flake8 for Python, ESLint/oxlint for JS), unit tests, and vulnerability checks on every pull request.
3. **Automated Test Suite**:
   - Write pytest test cases in `backend/tests/` testing API endpoints, RAG embedder functions, and cost calculations.
   - Write frontend component and end-to-end tests using `Vitest` or `Playwright`.
4. **Observability, Tracing & Logging**:
   - Implement structured JSON logging using `structlog`, inject correlation request IDs into incident traces, and expose a `/metrics` endpoint for Prometheus monitoring.

---

## 📡 API Endpoint Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/alert` | Triggers the complete triage pipeline synchronously. Returns incident matches, AI synthesis, Jira ticket, and cost savings. |
| `POST` | `/api/alert/stream` | Triggers the pipeline via **Server-Sent Events (SSE)**, streaming progress updates live to the frontend dashboard. |
| `GET` | `/api/incidents` | Retrieves all historical synthetic incident records from `incidents.json`. |
| `GET` | `/api/tickets` | Lists all generated Jira tickets (mocked or live). |
| `GET` | `/api/status` | Returns backend health and active integration statuses (LLM, Email, Jira). |

---

## ⚡ Mock vs Live Integration Matrix

| Component | Default Mode | Enable Live Mode |
| :--- | :--- | :--- |
| **LLM Synthesis** | Mocked (returns baseline match text) | Set `GEMINI_API_KEY` in `.env` |
| **Incident Vector Search** | **Live** (Local SentenceTransformers + FAISS) | Enabled by default (no API keys required) |
| **Jira Ticketing** | Mocked (Generates local ticket object) | Set `JIRA_URL`, `JIRA_EMAIL`, `JIRA_TOKEN` |
| **Email Alerts** | Console Logged | Set `SMTP_USER`, `SMTP_PASSWORD` |
| **Slack Alerts** | Console Logged | Set `SLACK_WEBHOOK_URL` |

---

## 🤝 Contributing & Development Guidelines

1. **Branching Strategy**: Create feature branches off `main` using the naming convention `feature/<domain>-<short-description>` (e.g. `feature/frontend-sse-animation`, `feature/backend-slack-webhook`).
2. **Environment Isolation**: Never commit real API keys or credentials. Always use `.env.example` to document new required environment variables.
3. **Local Testing**: Run `python backend/pipeline/test_rag.py` to verify RAG vector matching before submitting pull requests affecting embeddings.
