import pytest
import respx
from httpx import Response

from betterbill_agent import api_client
from betterbill_agent.api_client import API_BASE, call_core_api

CASE_CREATE = f"{API_BASE}/api/v1/case/create"


@respx.mock
async def test_call_core_api_returns_parsed_json():
    respx.post(CASE_CREATE).mock(return_value=Response(200, json={"id": "case-1"}))
    result = await call_core_api("case.create", {})
    assert result == {"id": "case-1"}


@respx.mock
async def test_call_core_api_sends_the_adapter_key(monkeypatch):
    monkeypatch.setattr(api_client, "ADAPTER_KEY", "k" * 16)
    route = respx.post(CASE_CREATE).mock(return_value=Response(200, json={}))
    await call_core_api("case.create", {})
    assert route.calls.last.request.headers["x-bb-adapter-key"] == "k" * 16


@respx.mock
async def test_call_core_api_raises_on_server_error():
    respx.post(CASE_CREATE).mock(return_value=Response(500))
    with pytest.raises(Exception):  # noqa: B017 - just checking it doesn't swallow the error
        await call_core_api("case.create", {})
