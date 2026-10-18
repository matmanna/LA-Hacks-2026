import httpx
import pytest
import respx
from httpx import Response

from betterbill_agent import api_client
from betterbill_agent.api_client import API_BASE, ApiError, call_core_api

CASE_CREATE = f"{API_BASE}/api/v1/case/create"


@respx.mock
async def test_call_core_api_returns_parsed_json():
    respx.post(CASE_CREATE).mock(return_value=Response(200, json={"id": "case-1"}))
    assert await call_core_api("case.create", {}) == {"id": "case-1"}


@respx.mock
async def test_call_core_api_sends_the_adapter_key(monkeypatch):
    monkeypatch.setattr(api_client, "ADAPTER_KEY", "k" * 16)
    route = respx.post(CASE_CREATE).mock(return_value=Response(200, json={}))
    await call_core_api("case.create", {})
    assert route.calls.last.request.headers["x-bb-adapter-key"] == "k" * 16


@respx.mock
async def test_call_core_api_raises_the_api_error_message():
    respx.post(CASE_CREATE).mock(
        return_value=Response(
            409, json={"code": "CONFLICT", "message": "Not ready yet."}
        )
    )
    with pytest.raises(ApiError) as error:
        await call_core_api("case.create", {})
    assert (error.value.code, error.value.message) == ("CONFLICT", "Not ready yet.")


@respx.mock
async def test_call_core_api_retries_once_when_unavailable():
    route = respx.post(CASE_CREATE).mock(
        side_effect=[Response(503), Response(200, json={"id": "case-2"})]
    )
    assert await call_core_api("case.create", {}) == {"id": "case-2"}
    assert route.call_count == 2


@respx.mock
async def test_call_core_api_gives_up_after_the_retry():
    respx.post(CASE_CREATE).mock(side_effect=httpx.ReadTimeout("slow"))
    with pytest.raises(ApiError) as error:
        await call_core_api("case.create", {})
    assert error.value.code == "TIMEOUT"
