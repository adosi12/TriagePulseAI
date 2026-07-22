"""
Cost / Time-Saved Calculator
============================
Compares manual triage time (historical average from the incident corpus)
against Sentinel's actual end-to-end processing time for this run.

Exposes: compute_savings(matched_incidents, sentinel_seconds) -> dict
"""

import statistics
from typing import Any


# Assumed manual triage time if the dataset has no timing data
DEFAULT_MANUAL_MINUTES = 40


def compute_savings(
    matched_incidents: list[dict],
    sentinel_seconds: float,
    manual_minutes_override: float | None = None,
) -> dict:
    """
    Calculate the time (and rough cost) saved vs. manual triage.

    Parameters
    ----------
    matched_incidents : list[dict]
        Output of embedder.match_incident — each item has an "incident" key.
    sentinel_seconds : float
        Wall-clock seconds Sentinel took to process this alert end-to-end.
    manual_minutes_override : float | None
        If provided, use this instead of the average from the matched corpus.

    Returns
    -------
    dict:
        manual_triage_minutes : float   — avg manual triage from corpus
        sentinel_seconds      : float   — actual processing time
        time_saved_minutes    : float   — manual − sentinel (in minutes)
        speedup_factor        : float   — how many times faster
        estimated_cost_saved  : float   — rough USD savings
        details               : str     — human-readable explanation
    """
    if manual_minutes_override is not None:
        avg_manual = float(manual_minutes_override)
    else:
        triage_times = [
            m["incident"].get("manual_triage_minutes", DEFAULT_MANUAL_MINUTES)
            for m in matched_incidents
            if "incident" in m
        ]
        avg_manual = (
            statistics.mean(triage_times) if triage_times else DEFAULT_MANUAL_MINUTES
        )

    sentinel_minutes = sentinel_seconds / 60.0
    time_saved_minutes = max(0.0, avg_manual - sentinel_minutes)

    # Rough cost model: senior engineer @ $150/hr, Sentinel @ ~$0.01/run (Claude tokens)
    ENGINEER_HOURLY_USD = 150
    SENTINEL_COST_USD = 0.02  # approximate Claude API cost per run

    engineer_cost = (avg_manual / 60.0) * ENGINEER_HOURLY_USD
    sentinel_cost = SENTINEL_COST_USD
    cost_saved = max(0.0, engineer_cost - sentinel_cost)

    speedup = avg_manual / sentinel_minutes if sentinel_minutes > 0 else float("inf")

    details = (
        f"Manual triage avg: {avg_manual:.1f} min | "
        f"Sentinel: {sentinel_seconds:.1f}s ({sentinel_minutes:.2f} min) | "
        f"Saved: {time_saved_minutes:.1f} min | "
        f"Speedup: {speedup:.0f}x | "
        f"Cost saved: ~${cost_saved:.2f}"
    )

    return {
        "manual_triage_minutes": round(avg_manual, 1),
        "sentinel_seconds": round(sentinel_seconds, 2),
        "sentinel_minutes": round(sentinel_minutes, 3),
        "time_saved_minutes": round(time_saved_minutes, 1),
        "speedup_factor": round(speedup, 1) if speedup != float("inf") else 9999,
        "engineer_cost_usd": round(engineer_cost, 2),
        "sentinel_cost_usd": round(sentinel_cost, 4),
        "estimated_cost_saved_usd": round(cost_saved, 2),
        "details": details,
    }
