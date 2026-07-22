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

# ── RAG Tuning ────────────────────────────────────────────────────────────────
RAG_TOP_K: int = int(os.getenv("RAG_TOP_K", "5"))

# ── Derived flags ─────────────────────────────────────────────────────────────
LLM_ENABLED:   bool = bool(GEMINI_API_KEY)
EMAIL_ENABLED: bool = bool(SMTP_USER and SMTP_PASSWORD)


def print_status() -> None:
    """Print integration status at startup."""
    print("\n============================")
    print("  TriagePulseAI — Status   ")
    print("============================")
    print(f"  LLM:   {'[LIVE] Gemini' if LLM_ENABLED else '[MOCK] No API key'}")
    print(f"  Jira:  [MOCK] Local only")
    print(f"  Email: {'[LIVE] ' + SMTP_USER if EMAIL_ENABLED else '[MOCK] Console only'}")
    print("============================\n")
