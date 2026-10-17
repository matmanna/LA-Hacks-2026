import pytest
import respx
from httpx import Response

from betterbill_agent.api_client import API_BASE, call_core_api


@respx.mock
async def test_call_core_api_returns_parsed_json():
    respx.post(f"{API_BASE}/api/rpc/case/create").mock(
        return_value=Response(200, json={"id": "case-1"})
    )
    result = await call_core_api("case.create", {})
    assert result == {"id": "case-1"}


@respx.mock
async def test_call_core_api_raises_on_server_error():
    respx.post(f"{API_BASE}/api/rpc/case/create").mock(return_value=Response(500))
    with pytest.raises(Exception):  # noqa: B017 - just checking it doesn't swallow the error
        await call_core_api("case.create", {})
