"""Pick the price rows the demo uses from capture.json and tidy allMatches (C-05, Part C).

Usage: python -I scripts/hospitals/select_prices.py data/hospitals/cedars-sinai/capture.json

- Collapses identical rows in allMatches into one row with a "count".
- Redacts descriptions that are CPT descriptor text (AMA copyright; plan C section 7 rule 6).
  The hospital's own item labels (e.g. "HB MRI L-SPINE WO CONTRAST", "MRI/MRA") are kept.
- Writes "prices" (one row per code and setting) and "selection" (why each row was chosen).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Hospital item chosen per code: the hospital's own chargemaster line with its revenue code.
TARGETS = {
    "72148": {
        "description": "HB MRI L-SPINE WO CONTRAST",
        "rc": "612",
        "why": "Item described 'HB MRI L-SPINE WO CONTRAST' (RC 612), the hospital's own chargemaster line for this code. "
        "Outpatient is the setting the demo bill uses (SB-01, SB-06). Other items with the same code (category rows "
        "such as 'MRI', 'MRI/MRA', 'PET Scan') carry the same gross and cash amounts and are listed in allMatches.",
    },
    "85025": {
        "description": "HB CBC WITH AUTO DIFF",
        "rc": "305",
        "why": "Item described 'HB CBC WITH AUTO DIFF' (RC 305), the hospital's own chargemaster line for this code. "
        "Gross and cash amounts are the same on every matching row; see allMatches.",
    },
}
REDACTED = "[CPT descriptor text omitted]"
ROW_KEYS = ("code", "codeType", "hospitalDescription", "otherCodes", "setting", "grossChargeCents",
            "discountedCashCents", "minNegotiatedCents", "maxNegotiatedCents")


def is_cpt_descriptor(desc: str | None) -> bool:
    # CPT long descriptors use semicolon clauses; the hospital's own labels here do not.
    return bool(desc) and ";" in desc


def main() -> None:
    path = Path(sys.argv[1])
    cap = json.loads(path.read_text())

    rows: dict[str, dict] = {}
    for r in cap["allMatches"]:
        row = {k: r.get(k) for k in ROW_KEYS}
        if is_cpt_descriptor(row["hospitalDescription"]):
            row["hospitalDescription"] = REDACTED
        key = json.dumps(row, sort_keys=True)
        if key in rows:
            rows[key]["count"] += r.get("count", 1)
        else:
            rows[key] = {**row, "count": r.get("count", 1)}
    all_matches = sorted(
        rows.values(),
        key=lambda r: (r["code"], r["hospitalDescription"] or "", r["setting"] or "", r["minNegotiatedCents"] or 0),
    )

    prices, selection = [], {}
    for code, t in TARGETS.items():
        picked = [
            r for r in all_matches
            if r["code"] == code and r["hospitalDescription"] == t["description"]
            and {"code": t["rc"], "type": "RC"} in r["otherCodes"]
        ]
        if not picked:
            sys.exit(f"no row for {code} {t['description']}")
        for setting in sorted({r["setting"] for r in picked}):
            same = [r for r in picked if r["setting"] == setting]
            gross = {r["grossChargeCents"] for r in same}
            cash = {r["discountedCashCents"] for r in same}
            if len(gross) != 1 or len(cash) != 1:
                sys.exit(f"{code} {setting}: rows disagree on gross or cash: {gross} {cash}")
            mins = [r["minNegotiatedCents"] for r in same if r["minNegotiatedCents"] is not None]
            maxs = [r["maxNegotiatedCents"] for r in same if r["maxNegotiatedCents"] is not None]
            prices.append({
                "code": code,
                "codeType": same[0]["codeType"],
                "hospitalDescription": t["description"],
                "otherCodes": same[0]["otherCodes"],
                "setting": setting,
                "grossChargeCents": gross.pop(),
                "discountedCashCents": cash.pop(),
                "minNegotiatedCents": min(mins) if mins else None,
                "maxNegotiatedCents": max(maxs) if maxs else None,
                "rowsInFile": sum(r["count"] for r in same),
            })
        selection[code] = t["why"]

    cap["prices"] = prices
    cap["selection"] = selection
    cap["allMatches"] = all_matches
    cap["notes"] = (
        "Amounts are the file's dollar values converted to integer cents. minNegotiated/maxNegotiated are the "
        "file's minimum/maximum across payer rows and are not used by the app. Descriptions that are CPT descriptor "
        "text are omitted."
    )
    order = ["hospitalKey", "hospitalName", "capturedAt", "capturedBy", "sources", "prices", "selection", "notes", "allMatches"]
    path.write_text(json.dumps({k: cap[k] for k in order}, indent=2) + "\n")
    for p in prices:
        print(p["code"], p["setting"], p["grossChargeCents"], p["discountedCashCents"], p["rowsInFile"])
    print(f"allMatches: {len(all_matches)} distinct rows")


if __name__ == "__main__":
    main()
