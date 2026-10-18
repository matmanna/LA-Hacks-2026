import json

from betterbill_agent.cards import card_message, text_message


def _metadata(msg):
    items = [item for item in msg.content if item.type == "metadata"]
    assert len(items) == 1
    return items[0].metadata


def test_card_message_metadata_values_are_strings():
    metadata = _metadata(card_message("narration", "review", {"title": "t"}))
    for value in metadata.values():
        assert isinstance(value, str)
    assert metadata["card_protocol_version"] == "1"
    assert metadata["requires_card_interaction"] == "true"


def test_card_payload_round_trips_through_json():
    payload = {"title": "Check these lines", "rows": [1, 2, 3]}
    metadata = _metadata(card_message("narration", "review", payload))
    assert json.loads(metadata["card_payload"]) == payload


def test_terminal_card_asks_for_no_interaction():
    metadata = _metadata(card_message("Sent.", "detail", {}, terminal=True))
    assert metadata["is_terminal"] == "true"
    assert metadata["requires_card_interaction"] == "false"


def test_text_message_has_one_text_item():
    msg = text_message("hello")
    assert [item.type for item in msg.content] == ["text"]
