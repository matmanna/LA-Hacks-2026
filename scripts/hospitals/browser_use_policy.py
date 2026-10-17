"""Browser Use run that finds a hospital's financial assistance policy and quotes it verbatim (ticket C-06).

Usage: python -I scripts/hospitals/browser_use_policy.py <start url> <out json>
Reads BROWSER_USE_API_KEY from the environment or the repo .env. Never prints the key.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from browser_use_sdk.v4 import BrowserUse
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parents[2]
MAX_COST_USD = 1.0


def api_key() -> str:
    key = os.environ.get("BROWSER_USE_API_KEY")
    env = ROOT / ".env"
    if not key and env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("BROWSER_USE_API_KEY="):
                key = line.split("=", 1)[1].strip()
    if not key:
        sys.exit("BROWSER_USE_API_KEY is not set")
    return key


class PolicyQuotes(BaseModel):
    policy_url: str
    policy_title: str
    quotes: list[str]
    pdf_urls: list[str]


def task(start: str) -> str:
    return (
        f"Open {start} and find the financial assistance (charity care) policy. Return the policy URL, title, "
        "any PDF links, and copy verbatim every sentence that states an income limit as a percent of the federal "
        "poverty level or a discount amount. Do not paraphrase."
    )


def main() -> None:
    start, out = sys.argv[1], Path(sys.argv[2])
    client = BrowserUse(api_key=api_key())
    created = client.runs.create(
        task(start), output_schema=PolicyQuotes.model_json_schema(), max_cost_usd=MAX_COST_USD
    )
    print(f"run {created.id} started (session {created.session_id})")
    run = client.runs.wait_for_completion(created.id, timeout=900)
    record = {
        "runId": str(run.id),
        "sessionId": str(run.session_id),
        "status": str(getattr(run.status, "value", run.status)),
        "model": run.model,
        "task": run.task,
        "output": run.output,
        "result": run.result,
        "error": run.error,
        "createdAt": run.created_at.isoformat(),
        "updatedAt": run.updated_at.isoformat(),
        "totalCostUsd": run.total_cost_usd,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(record, indent=2) + "\n")
    print(json.dumps(record["output"], indent=2))
    if record["status"] != "completed":
        sys.exit(f"run ended with status {record['status']}: {run.error}")


if __name__ == "__main__":
    main()
