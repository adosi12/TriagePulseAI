"""
config/settings.py — TriagePulseAI Configuration
All environment variables are loaded from .env in the project root.
"""
import os
import sys
import site
from pathlib import Path
from dotenv import load_dotenv

# ── ensure user-installed packages & backend root are on sys.path ──────────────
_user_site = site.getusersitepackages()
if _user_site and _user_site not in sys.path:
    sys.path.insert(0, _user_site)

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

load_dotenv(BASE_DIR / ".env", override=False)

# ── Gemini API (primary LLM) ──────────────────────────────────────────────────
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL:   str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

# ── Email Notification ────────────────────────────────────────────────────────
# For Gmail: use an App Password (not your regular password)
# For Outlook: use your outlook credentials
ALERT_EMAIL_TO:   str = os.getenv("ALERT_EMAIL_TO", "12aditidosi12@gmail.com")
SMTP_HOST:        str = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT:        int = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER:        str = os.getenv("SMTP_USER", "")
SMTP_PASSWORD:    str = os.getenv("SMTP_PASSWORD", "")

# ── Slack Notification ────────────────────────────────────────────────────────
SLACK_WEBHOOK_URL: str = os.getenv("SLACK_WEBHOOK_URL", "")
SLACK_ENABLED:     bool = bool(SLACK_WEBHOOK_URL)

# ── Jira Integration ──────────────────────────────────────────────────────────
JIRA_URL:         str = os.getenv("JIRA_URL", "")
JIRA_USER:        str = os.getenv("JIRA_USER", "")
JIRA_API_TOKEN:   str = os.getenv("JIRA_API_TOKEN", "")
JIRA_PROJECT_KEY: str = os.getenv("JIRA_PROJECT_KEY", "TPAI")
JIRA_ENABLED:     bool = bool(JIRA_URL and JIRA_USER and JIRA_API_TOKEN)

# ── RAG Tuning ────────────────────────────────────────────────────────────────
RAG_TOP_K: int = int(os.getenv("RAG_TOP_K", "5"))

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://db_user:db_password@localhost:5432/triagepulse")

# ── Derived flags ─────────────────────────────────────────────────────────────
LLM_ENABLED:   bool = bool(GEMINI_API_KEY)
EMAIL_ENABLED: bool = bool(SMTP_USER and SMTP_PASSWORD)

def print_status() -> None:
    """Print integration status at startup."""
    print("\n============================")
    print("  TriagePulseAI — Status   ")
    print("============================")
    print(f"  LLM:   {'[LIVE] Gemini' if LLM_ENABLED else '[MOCK] No API key'}")
    print(f"  Jira:  {'[LIVE] ' + JIRA_URL if JIRA_ENABLED else '[MOCK] Local only'}")
    print(f"  Slack: {'[LIVE] Enabled' if SLACK_ENABLED else '[MOCK] Console only'}")
    print(f"  Email: {'[LIVE] ' + SMTP_USER if EMAIL_ENABLED else '[MOCK] Console only'}")
    print("============================\n")
