"""Thin HTTP client for the BetterBill core API. No business logic here.

UNVERIFIED / placeholder, confirmed against the real repo on 2026-10-17:
oRPC is mounted at /api/rpc using its own RPC-over-HTTP protocol
(apps/web/src/routes/api/rpc/$.ts), not the REST/OpenAPI endpoint the A-02
ticket assumed. B's case.create procedure also does not exist yet
(packages/api/src/routers/index.ts only has healthCheck and privateData as
of this commit). ROUTES and the POST-JSON call shape below are a guess at
oRPC's RPC wire format; confirm both once B's router lands (the 17:00
handoff in docs/plans/A-conversation-actions.md) and fix here only.
"""

import os

import httpx
from dotenv import load_dotenv

load_dotenv()

API_BASE = os.environ.get("BETTERBILL_API_BASE", "http://localhost:3001")
SERVICE_TOKEN = os.environ.get("BB_ADAPTER_KEY", "")
ROUTES = {
    "case.create": "/api/rpc/case/create",
}


async def call_core_api(procedure: str, payload: dict) -> dict:
    """POST to the core TypeScript API. Raises on failure; callers decide the user-facing message."""
    url = f"{API_BASE}{ROUTES[procedure]}"
    headers = {"x-bb-service-token": SERVICE_TOKEN} if SERVICE_TOKEN else {}
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
