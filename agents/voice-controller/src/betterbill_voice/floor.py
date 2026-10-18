"""Temporary speech pauses and explicit withdrawal from trusted human tracks."""

import re
from dataclasses import dataclass

_ADDRESS = re.compile(r"^(?:(?:hey|okay|ok)[,\s]+)?(?:advocate|better\s?bill)[\s,:.!?\-]+(.+)$")
_DECLINE = re.compile(
    r"^(?:please\s+)?(?:stop\s+(?:recording|transcribing)\b.*"
    r"|(?:do\s+not|don't)\s+(?:record|transcribe)\b.*"
    r"|i\s+(?:do\s+not|don't)\s+consent\s+to\s+(?:the\s+)?"
    r"(?:recording|transcription|ai|bots)\b.*|no\s+(?:ai|bots)(?:\s+allowed)?[.!]*)$"
)
_LEAVE = re.compile(r"^(?:please\s+)?leave(?:\s+the\s+call)?[.!]*$")


def _normalize(text: str) -> str:
    return " ".join(text.lower().replace("\u2019", "'").split())


@dataclass(frozen=True)
class FloorDecision:
    action: str
    source: str


class SpeechFloor:
    def __init__(self) -> None:
        self.protected = False
        self.ended = False
        self._response_open = False
        self._commits: set[tuple[str, str]] = set()
        self._last_commit: dict[str, str] = {}

    @property
    def can_output(self) -> bool:
        return not self.ended and not self.protected

    @property
    def quiet(self) -> bool:
        return not self.can_output

    def yield_floor(self, source: str) -> FloorDecision:
        self.protected = True
        self._response_open = False
        return FloorDecision("yield", source)

    def observe(
        self,
        role: str,
        text: str,
        *,
        final: bool = False,
        utterance_id: str | None = None,
    ) -> FloorDecision:
        if self.ended or role not in {"patient", "hospital"}:
            return FloorDecision("ignore", "inactive_or_unknown_role")
        text = _normalize(text)
        if not text:
            return FloorDecision("ignore", "empty_transcript")
        # Partial transcripts can be background speech; never discard an answer for them.
        if not final:
            return FloorDecision("ignore", "partial_transcript")
        key = (role, utterance_id) if utterance_id is not None else None
        # shortcut: identical finals without IDs are blocked; supply IDs for repeated turns.
        duplicate = key in self._commits if key else self._last_commit.get(role) == text
        if duplicate:
            return FloorDecision("ignore", "duplicate_commit")
        if key:
            self._commits.add(key)
        self._last_commit[role] = text
        address = _ADDRESS.match(text)
        if _DECLINE.fullmatch(address[1] if address else text) or (
            address and _LEAVE.fullmatch(address[1])
        ):
            self.end()
            return FloorDecision("withdraw", "participation_declined")
        self.protected = False
        return FloorDecision("grant", "human_turn")

    def observe_agent(self, text: str) -> FloorDecision:
        return FloorDecision("ignore", "agent_transcript")

    def begin_response(self) -> bool:
        if not self.can_output or self._response_open:
            return False
        self._response_open = True
        return True

    def complete_response(self) -> None:
        self._response_open = False

    def end(self) -> None:
        self.ended = True
        self._response_open = False
