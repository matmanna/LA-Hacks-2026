"""HTTP client for B's adapter API. No business logic here.

POST /api/v1/<router>/<procedure> (apps/web/src/routes/api/v1/$.ts) with the
shared BB_ADAPTER_KEY in the x-bb-adapter-key header; the API returns 401
without it. Retries once when the server is briefly unavailable.
"""

import os

import httpx
from dotenv import load_dotenv

load_dotenv()

API_BASE = os.environ.get("BETTERBILL_API_BASE", "http://localhost:3001")
ADAPTER_KEY = os.environ.get("BB_ADAPTER_KEY", "")
RETRY_STATUS = {502, 503, 504}


class ApiError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(f"{code}: {message}")
        self.code = code
        self.message = message


async def call_core_api(procedure: str, payload: dict) -> dict:
    """POST to the core API. Raises ApiError on failure."""
    url = f"{API_BASE}/api/v1/{procedure.replace('.', '/')}"
    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url, json=payload, headers={"x-bb-adapter-key": ADAPTER_KEY}
                )
        except httpx.TimeoutException:
            if attempt == 0:
                continue
            raise ApiError("TIMEOUT", "The server took too long to answer.") from None
        if response.status_code in RETRY_STATUS and attempt == 0:
            continue
        if response.is_success:
            return response.json()
        try:
            body = response.json()
        except ValueError:
            body = {}
        raise ApiError(
            str(body.get("code", response.status_code)),
            str(body.get("message", "The request failed.")),
        )
    raise ApiError("UNAVAILABLE", "The server is not answering.")
