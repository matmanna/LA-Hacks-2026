import base64
import json
from dataclasses import dataclass

FLOW_VERSION = "patient-first-v1"


def parse_metadata(raw: str) -> tuple[str, str]:
    data = json.loads(raw)
    if not isinstance(data, dict) or set(data) != {"actionId", "roomName", "flowVersion"}:
        raise ValueError("Dispatch must contain bound identifiers and flowVersion")
    if data["flowVersion"] != FLOW_VERSION:
        raise ValueError("Unsupported call flow")
    if not all(isinstance(value, str) and 0 < len(value) <= 128 for value in data.values()):
        raise ValueError("Invalid dispatch identifiers")
    return data["actionId"], data["roomName"]


@dataclass
class BridgeState:
    """Speech gate; human audio remains connected while the advocate yields."""

    phase: str = "setup"
    quiet: bool = False

    @property
    def can_output(self) -> bool:
        return self.phase == "active" and not self.quiet

    @property
    def can_finish(self) -> bool:
        return self.phase == "active" and not self.quiet

    def end(self) -> None:
        self.phase = "ended"


def pcm_event(event: dict, *, enabled: bool, interrupted_before: int) -> bytes | None:
    if not enabled:
        return None
    audio = event["audio_event"]
    if not isinstance(audio.get("event_id"), int):
        raise ValueError("Missing audio event ID")
    if audio["event_id"] <= interrupted_before:
        return None
    pcm = base64.b64decode(audio["audio_base_64"], validate=True)
    if len(pcm) % 2:
        raise ValueError("Expected signed 16-bit PCM")
    return pcm or None


def tool_result(call_id: str, result: str, *, error: bool = False) -> dict:
    return {
        "type": "client_tool_result",
        "tool_call_id": call_id,
        "result": result,
        "is_error": error,
    }
