"""Participant-bound speech permission; hosted text never authenticates a patient."""

import re
from dataclasses import dataclass

_NEGATION = re.compile(r"\b(?:no|not|never|don't|doesn't|isn't|can't|won't|shouldn't)\b")
_ADDRESS = re.compile(
    r"^(?:(?:hey|okay|ok)[,\s]+)?(?:advocate|better\s?bill)[\s,:.!?\-]+(.+)$"
)
_REQUEST = re.compile(
    r"^(?:please\s+)?(?:(?:can|could|would|will)\s+you\s+(?:please\s+)?)?"
    r"(?:help(?:\s+me)?(?=$|[.!?]|\s+(?:with|understand|explain|answer|out)\b)"
    r"|continue\b|explain\b|answer(?:\s+(?:my|the|this|that))?\s+question\b)"
    r"|^i\s+(?:have\s+a\s+question|need\s+(?:your\s+)?help)\b"
    r"|^(?:what|why|how(?:\s+(?:much|many))?|which|when|where)\s+"
    r"(?:do|does|did|is|are|was|were|can|could|should|would|will|am)\b"
)
_VERIFICATION = re.compile(
    r"\b(?:verif\w*|identity|date\s+of\s+birth|dob|birthday|born|authoriz\w*|full\s+name)\b"
    r"|\b(?:your|(?:the\s+)?patient(?:'s)?)\s+(?:name|address)\b"
    r"|\b(?:speak|talk|speaking|talking)\b.{0,45}\bpatient\b"
    r"|\bpatient\b.{0,30}\b(?:answer|respond|speak|talk)\b"
)
_HANDOFF = re.compile(
    r"\b(?:i'll|i\s+will|let\s+me)\s+(?:step\s+back|stay\s+quiet|remain\s+silent)\b"
    r"|\b(?:i'll|i\s+will)\s+let\s+(?:the\s+patient|you\s+two)\b"
)
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
        self._pending = False
        self._response_open = False
        self._commits: set[tuple[str, str]] = set()
        self._last_commit: dict[str, str] = {}

    @property
    def can_output(self) -> bool:
        return not self.ended and (not self.protected or self._response_open)

    @property
    def quiet(self) -> bool:
        return not self.can_output

    def yield_floor(self, source: str) -> FloorDecision:
        self.protected = True
        self._pending = self._response_open = False
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
        if final:
            key = (role, utterance_id) if utterance_id is not None else None
            # shortcut: identical finals without IDs are blocked; supply IDs for repeated requests.
            duplicate = key in self._commits if key else self._last_commit.get(role) == text
            if duplicate:
                return FloorDecision("ignore", "duplicate_commit")
            if key:
                self._commits.add(key)
            self._last_commit[role] = text
        address = _ADDRESS.match(text)
        if final and (
            _DECLINE.fullmatch(address[1] if address else text)
            or (address and _LEAVE.fullmatch(address[1]))
        ):
            self.end()
            return FloorDecision("withdraw", "participation_declined")
        if role == "hospital":
            if _VERIFICATION.search(text):
                # One cue tells the patient to answer, then quiet until billing moves on.
                self.protected = self._pending = True
                self._response_open = False
                return FloorDecision("grant", "staff_verification")
            # Billing moved on (or verification is done): the advocate leads again.
            # Billing talking over the advocate stops it; it answers once they finish.
            self.protected = self._pending = self._response_open = False
            return FloorDecision("interrupt", "staff_speech")

        # The advocate waits while the patient talks, until billing speaks next.
        decision = self.yield_floor("patient_commit" if final else "patient_partial")
        if final and address and not _NEGATION.search(text) and _REQUEST.match(address[1]):
            self._pending = True
            return FloorDecision("grant", "patient_request")
        return decision

    def observe_agent(self, text: str) -> FloorDecision:
        if not self.ended and _HANDOFF.search(_normalize(text)):
            return self.yield_floor("agent_handoff")
        return FloorDecision("ignore", "agent_transcript")

    def begin_response(self) -> bool:
        if self.ended or self._response_open or (self.protected and not self._pending):
            return False
        self._pending = False
        self._response_open = True
        return True

    def complete_response(self) -> None:
        self._response_open = False

    def end(self) -> None:
        self.ended = True
        self._pending = self._response_open = False
