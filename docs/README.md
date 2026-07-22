# 🚨 Sentinel AI
> **Autonomous AI SRE Operating System**

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Status](https://img.shields.io/badge/status-Active-success)
![License](https://img.shields.io/badge/license-MIT-green)

Welcome to the comprehensive documentation for **Sentinel AI**. This documentation set is designed to guide engineering teams, platform owners, and executive stakeholders through the architecture, design, and capabilities of the Sentinel AI SRE platform.

---

## 📚 Documentation Map

| File | Title | Description | Audience |
| :--- | :--- | :--- | :--- |
| [01_Product_Vision.md](01_Product_Vision.md) | Product Vision & Mission | Executive summary, value propositions, and positioning | Executives, All |
| [02_PRD.md](02_PRD.md) | Product Requirements | Detailed user stories, functional requirements, and OKRs | Product, Engineering |
| [03_System_Architecture.md](03_System_Architecture.md) | System Architecture | High-level architecture, data flows, and tech stack | Architects, Backend |
| [04_AI_Agents.md](04_AI_Agents.md) | AI Agent Design | Specifications for the 10 core AI agents | AI/ML, Backend |
| [05_Incident_Workflows.md](05_Incident_Workflows.md) | Incident Workflows | Step-by-step reactive and proactive investigation flows | SREs, Product |
| [06_Manual_Investigation.md](06_Manual_Investigation.md) | Manual Investigation | Proactive search and analysis workflows | SREs, Developers |
| [07_Incident_Memory.md](07_Incident_Memory.md) | Incident Memory Design | PostgreSQL/pgvector database design for incidents | Database, Backend |
| [08_Database_Design.md](08_Database_Design.md) | Complete Database Design | Full schema for all system entities | Database, Backend |
| [09_Live_System_Map.md](09_Live_System_Map.md) | Live System Topology | Real-time dependency graph visualization specs | Frontend, SREs |
| [10_Demo_Scenarios.md](10_Demo_Scenarios.md) | Demo Scenarios | Detailed synthetic production scenarios | QA, Devs, Sales |
| [11_AI_Impact_Dashboard.md](11_AI_Impact_Dashboard.md) | AI Impact & ROI | Metrics for MTTR reduction, cost savings, and AI accuracy | Executives, Managers |
| [12_About_Project.md](12_About_Project.md) | About the Project | Origins, competitive positioning, and team | All |
| [13_API_Specification.md](13_API_Specification.md) | API Specification | Full OpenAPI/REST specification | API Developers |
| [14_UI_Design.md](14_UI_Design.md) | UI/UX Design Spec | Design system, components, and layouts | Frontend, Design |
| [15_Development_Roadmap.md](15_Development_Roadmap.md) | Development Roadmap | Phases, backlog, and milestones | Product, Engineering |
| [16_Executive_Summary.md](16_Executive_Summary.md) | Executive Summary | One-page business case and ROI | Executives |

---

## 🧭 Quick Navigation

**I am a...**
* **New Developer**: Start with [System Architecture](03_System_Architecture.md) and [API Specification](13_API_Specification.md).
* **SRE Engineer**: Check out [Incident Workflows](05_Incident_Workflows.md) and [Manual Investigation](06_Manual_Investigation.md).
* **Engineering Manager**: Review the [Development Roadmap](15_Development_Roadmap.md) and [AI Impact Dashboard](11_AI_Impact_Dashboard.md).
* **Executive / CTO**: Read the [Executive Summary](16_Executive_Summary.md) and [Product Vision](01_Product_Vision.md).
* **AI / ML Engineer**: Deep dive into [AI Agents](04_AI_Agents.md) and [Incident Memory](07_Incident_Memory.md).

---

## ⚡ Getting Started in 5 Minutes

1. **Backend (FastAPI)**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or .\venv\Scripts\Activate.ps1 on Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn api.main:app --reload
```

2. **Frontend (React + Vite)**
```bash
cd frontend
npm install
npm run dev
```

---

## 🔄 The 8-Step AI Investigation Flow

1. **Intake**: Ingest alerts from Email/PagerDuty/ServiceNow.
2. **Historical Memory**: Vector search past incidents (RAG).
3. **Telemetry**: Correlate logs, metrics, and traces.
4. **Live Map**: Visualize blast radius and dependencies.
5. **RCA**: Synthesize root cause with confidence score.
6. **Code/Patch**: Scan repository and suggest fixes.
7. **Ticketing**: Create Jira/ServiceNow tickets and notify Slack.
8. **Memory Update**: Save findings to Incident Memory for future learning.

---

## 🛠️ Technology Stack Summary

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React, Vite, CSS Modules |
| **Backend** | Python, FastAPI |
| **AI / ML** | Google Gemini, LangGraph, SentenceTransformers |
| **Database** | PostgreSQL, pgvector, FAISS |
| **Telemetry** | OpenTelemetry, Prometheus (Simulated) |

---

## 📝 Contributing to Docs

To update the documentation:
1. Ensure changes follow GitHub-flavored Markdown.
2. Maintain the professional tone and formatting (tables, ASCII diagrams where relevant).
3. Submit a Pull Request targeting the `main` branch.

*Copyright © 2026 Sentinel AI. All Rights Reserved.*
