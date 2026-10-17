"""Thin HTTP client for the BetterBill core API. No business logic here.

Calls B's plain JSON adapter API, POST /api/v1/<router>/<procedure>
(apps/web/src/routes/api/v1/$.ts), authenticated by the shared
BB_ADAPTER_KEY in the x-bb-adapter-key header. Without it the API returns 401.
"""

import os

import httpx
from dotenv import load_dotenv

load_dotenv()

API_BASE = os.environ.get("BETTERBILL_API_BASE", "http://localhost:3001")
ADAPTER_KEY = os.environ.get("BB_ADAPTER_KEY", "")


async def call_core_api(procedure: str, payload: dict) -> dict:
    """POST to the core API. Raises on failure; callers decide the user-facing message."""
    url = f"{API_BASE}/api/v1/{procedure.replace('.', '/')}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            url, json=payload, headers={"x-bb-adapter-key": ADAPTER_KEY}
        )
        response.raise_for_status()
        return response.json()
