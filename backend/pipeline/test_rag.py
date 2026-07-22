"""
Stage 2 — Standalone RAG Test
==============================
Fires three realistic synthetic alerts against the FAISS index and prints
the top matches with similarity scores.

Usage:
    python backend/pipeline/test_rag.py
"""
import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from pipeline.embedder import match_incident

TEST_ALERTS = [
    {
        "name": "TLS cert expired on payments-gateway",
        "payload": {
            "description": (
                "payments-gateway is returning SSL handshake errors to all clients. "
                "The error started at 02:15 UTC and coincides with cert expiry."
            ),
            "error_signature": "javax.net.ssl.SSLHandshakeException: certificate has expired",
            "affected_service": "payments-gateway",
        },
    },
    {
        "name": "Kafka consumer lag spike on fraud-event-stream",
        "payload": {
            "description": (
                "Consumer group for fraud-event-stream has stopped committing offsets. "
                "Lag is growing at ~50k messages/minute. No recent deployments."
            ),
            "error_signature": "ConsumerGroupRebalanceError: maximum poll interval exceeded",
            "affected_service": "fraud-event-stream",
        },
    },
    {
        "name": "UAT-passed, prod-failed: NoSuchMethodError in reporting-engine",
        "payload": {
            "description": (
                "reporting-engine passes all CI and UAT tests but crashes immediately "
                "on prod startup with NoSuchMethodError in a commons-lang3 method. "
                "Same build artifact, different environments."
            ),
            "error_signature": "java.lang.NoSuchMethodError: org.apache.commons.lang3",
            "affected_service": "reporting-engine",
        },
    },
]


def run_tests():
    print("=" * 70)
    print("Sentinel — RAG Matching Test")
    print("=" * 70)

    for test in TEST_ALERTS:
        print(f"\n[>] Alert: {test['name']}")
        print(f"  Error sig: {test['payload']['error_signature']}")
        print("  Top matches:")

        matches = match_incident(test["payload"], top_k=3)
        if not matches:
            print("  [-] No matches found.")
            continue

        for rank, m in enumerate(matches, 1):
            inc = m["incident"]
            score = m["similarity_score"]
            print(f"    [{rank}] score={score:.4f}  id={inc['incident_id']}  family={inc['family']}")
            print(f"        root_cause: {inc['root_cause'][:80]}...")
            print(f"        resolution: {inc['resolution'][:80]}...")

    print("\n" + "=" * 70)
    print("[+] RAG test complete.")


if __name__ == "__main__":
    run_tests()
