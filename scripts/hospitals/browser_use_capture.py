"""Browser Use live navigation of Cedars-Sinai's price transparency page (ticket C-05, Part A).

Usage: python -I scripts/hospitals/browser_use_capture.py
Reads BROWSER_USE_API_KEY from the environment or the repo .env. Never prints the key.
Writes data/hospitals/cedars-sinai/evidence/browser_use_run.json.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from browser_use_sdk.v4 import BrowserUse
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data/hospitals/cedars-sinai/evidence/browser_use_run.json"
MAX_COST_USD = 1.0

TASK = (
    "Go to https://www.cedars-sinai.org/cms-hpt.txt and read it. Then open the source-page-url it lists. "
    "On that page, find every link to a machine-readable standard charges file and any link to the hospital's "
    "financial assistance or charity care policy. Do not download large files. Return the URLs exactly as written "
    "on the page, any 'last updated' text shown, and short notes on what the page says about the file."
)


class PriceLinks(BaseModel):
    source_page_url: str
    mrf_urls: list[str]
    financial_assistance_url: str | None
    page_last_updated_text: str | None
    notes: str


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


def main() -> None:
    client = BrowserUse(api_key=api_key())
    created = client.runs.create(
        TASK, output_schema=PriceLinks.model_json_schema(), max_cost_usd=MAX_COST_USD
    )
    print(f"run {created.id} started (session {created.session_id})")
    run = client.runs.wait_for_completion(created.id, timeout=900)

    share_url = None
    try:
        share = client.sessions.create_share(run.session_id)
        share_url = share.model_dump(mode="json", by_alias=True)
    except Exception as exc:  # recording link is optional evidence
        share_url = {"error": str(exc)}

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
        "eventsUrl": created.events_url,
        "sessionShare": share_url,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(record, indent=2) + "\n")
    print(json.dumps(record["output"], indent=2))
    if record["status"] != "completed":
        sys.exit(f"run ended with status {record['status']}: {run.error}")


if __name__ == "__main__":
    main()
