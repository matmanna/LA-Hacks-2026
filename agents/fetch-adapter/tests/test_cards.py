import json

from betterbill_agent.cards import card_message, gate_test_card, parse_card_selection


def _metadata(msg):
    items = [item for item in msg.content if item.type == "metadata"]
    assert len(items) == 1
    return items[0].metadata


def test_card_message_metadata_values_are_strings():
    metadata = _metadata(card_message("narration", "review", {"title": "t"}))
    for value in metadata.values():
        assert isinstance(value, str)
    assert metadata["card_protocol_version"] == "1"


def test_card_payload_round_trips_through_json():
    payload = {"title": "Gate test", "rows": [1, 2, 3]}
    metadata = _metadata(card_message("narration", "review", payload))
    assert json.loads(metadata["card_payload"]) == payload


def test_gate_test_card_has_narration_and_card_kind():
    msg = gate_test_card()
    text_items = [item for item in msg.content if item.type == "text"]
    assert len(text_items) == 1
    assert _metadata(msg)["card_kind"] == "review"


def test_parse_card_selection_from_json():
    assert parse_card_selection(json.dumps({"action": "gate_ok"})) == "gate_ok"


def test_parse_card_selection_fallback_substring():
    assert parse_card_selection("I'll pick gate_cancel please") == "gate_cancel"


def test_parse_card_selection_none_when_unrecognized():
    assert parse_card_selection("hello there") is None
