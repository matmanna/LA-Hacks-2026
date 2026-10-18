"""Capture Medicare's Care Compare star ratings for the Prices tab hospitals (CMS Provider Data, no API key).

Usage: python3 -E -P scripts/hospitals/capture_ratings.py [hospital-key ...]

Per hospital (default: the 9 in HOSPITALS) it writes data/hospitals/<key>/ratings.json and keeps every raw
API response in data/hospitals/<key>/evidence/:
1. Hospital General Information (xubh-q36u): rows in the same state and city at the same street number as
   capture.json's `location.address`. A row matches when its street name is the same and its name is close to
   capture.json's `hospitalName`. Two or more close names (or none) leave the CCN and stars null, with the
   candidates and a note. `hospital_overall_rating` gives `overallStars`.
2. Patient survey (HCAHPS) - Hospital (dgck-syfz): the H_STAR_RATING row for that CCN gives
   `patientSurveyStars`, `surveysCompleted`, `responseRatePct` and the survey period.
3. Footnote Crosswalk (y9us-9xdf): text for any footnote code on those rows.
Each dataset's title and dates come from its metastore entry. "Not Available" becomes null.
"""

from __future__ import annotations

import hashlib
import json
import re
import ssl
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import certifi

UA = "BetterBill-hackathon-research/0.1 (LA Hacks 2026 student project)"
TLS = ssl.create_default_context(cafile=certifi.where())
API = "https://data.cms.gov/provider-data/api/1"
ROOT = Path(__file__).resolve().parents[2] / "data" / "hospitals"
GENERAL, HCAHPS, FOOTNOTES = "xubh-q36u", "dgck-syfz", "y9us-9xdf"

HOSPITALS = [
    "cedars-sinai",
    "ucla-ronald-reagan",
    "ucla-santa-monica",
    "providence-saint-johns",
    "providence-saint-joseph",
    "providence-tarzana",
    "providence-holy-cross",
    "providence-little-company-of-mary-torrance",
    "memorialcare-long-beach",
]

# Facts a reader needs that the match itself does not show. Each one is checked against the CMS rows
# the script fetched (see the evidence files); none changes which row is matched.
NOTES = {
    "ucla-santa-monica": "CMS lists one CCN for the medical center and its orthopaedic hospital together "
    "('SANTA MONICA - UCLA MED CTR & ORTHOPAEDIC HOSPITAL'). The price file in capture.json covers the same "
    "combined hospital (its file name is santa-monica-ucla-medical-center-and-orthopaedic-hospital), so the "
    "stars are for both buildings together.",
    "memorialcare-long-beach": "Miller Children's & Women's Hospital Long Beach shares this street address but "
    "has its own CCN and is a children's hospital, so it is listed as a candidate and not used.",
}

STREET_WORDS = {
    "S": "SOUTH",
    "N": "NORTH",
    "E": "EAST",
    "W": "WEST",
    "ST": "STREET",
    "AVE": "AVENUE",
    "BLVD": "BOULEVARD",
    "DR": "DRIVE",
    "RD": "ROAD",
}
STREET_DROP = {"SOUTH", "NORTH", "EAST", "WEST", "STREET", "AVENUE", "BOULEVARD", "DRIVE", "ROAD", "PLAZA"}
NAME_WORDS = {"MED": "MEDICAL", "CTR": "CENTER", "HOSP": "HOSPITAL", "ST": "SAINT", "MEM": "MEMORIAL"}
NAME_DROP = {"AND", "OF", "THE"}
NAME_MIN, NAME_MARGIN = 0.5, 0.2


def now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60, context=TLS) as r:
        body = r.read()
    time.sleep(0.5)
    return body


def query_url(dataset: str, conditions: list[tuple[str, str, str | list[str]]]) -> str:
    params = []
    for i, (prop, op, value) in enumerate(conditions):
        params.append((f"conditions[{i}][property]", prop))
        if isinstance(value, list):
            params += [(f"conditions[{i}][value][{j}]", v) for j, v in enumerate(value)]
        else:
            params.append((f"conditions[{i}][value]", value))
        params.append((f"conditions[{i}][operator]", op))
    params.append(("schema", "false"))
    return f"{API}/datastore/query/{dataset}/0?{urllib.parse.urlencode(params)}"


def fetch(evidence: Path, name: str, url: str) -> tuple[dict, dict]:
    """GET url, keep the raw bytes as evidence/<name>, return (parsed JSON, provenance)."""
    body = get(url)
    (evidence / name).write_bytes(body)
    prov = {
        "url": url,
        "sha256": hashlib.sha256(body).hexdigest(),
        "fetchedAt": now(),
        "evidence": f"evidence/{name}",
    }
    return json.loads(body), prov


def source(evidence: Path, dataset: str, url: str, name: str) -> tuple[list[dict], dict]:
    meta, meta_prov = fetch(evidence, f"care-compare-metastore-{dataset}.json", f"{API}/metastore/schemas/dataset/items/{dataset}")
    data, prov = fetch(evidence, name, url)
    return data["results"], {
        "dataset": meta["title"],
        "id": dataset,
        "landingPage": meta.get("landingPage"),
        "modified": meta.get("modified"),
        "released": meta.get("released"),
        **prov,
        "metastore": {"url": meta_prov["url"], "sha256": meta_prov["sha256"], "evidence": meta_prov["evidence"]},
    }


def street_key(street: str) -> list[str]:
    words = re.sub(r"[^A-Z0-9 ]", " ", street.upper()).split()
    return [w for w in (STREET_WORDS.get(w, w) for w in words) if w not in STREET_DROP]


def name_tokens(name: str) -> set[str]:
    name = re.sub(r"\bU C L A\b", "UCLA", name.upper()).replace("'", "")
    words = re.sub(r"[^A-Z0-9 ]", " ", name).split()
    return {w for w in (NAME_WORDS.get(w, w) for w in words) if w not in NAME_DROP}


def similarity(a: str, b: str) -> float:
    ta, tb = name_tokens(a), name_tokens(b)
    return round(len(ta & tb) / len(ta | tb), 2) if ta | tb else 0.0


def stars(value: str | None) -> int | None:
    return int(value) if value and value.strip() in {"1", "2", "3", "4", "5"} else None


def number(value: str | None) -> int | None:
    return int(value) if value and value.strip().isdigit() else None


def us_date(value: str | None) -> str | None:
    m = re.fullmatch(r"(\d{2})/(\d{2})/(\d{4})", value or "")
    return f"{m[3]}-{m[1]}-{m[2]}" if m else None


def cms_address(row: dict) -> str:
    return f"{row['address']}, {row['citytown']}, {row['state']} {row['zip_code']}"


def footnote_texts(evidence: Path, codes: set[str], sources: list[dict]) -> dict[str, str]:
    codes = {c.strip() for code in codes for c in (code or "").split(",") if c.strip()}
    if not codes:
        return {}
    url = query_url(FOOTNOTES, [("footnote", "in", sorted(codes))])
    rows, prov = source(evidence, FOOTNOTES, url, "care-compare-footnotes.json")
    sources.append(prov)
    return {r["footnote"]: r["footnote_text"] for r in rows}


def capture(key: str) -> dict:
    folder = ROOT / key
    evidence = folder / "evidence"
    evidence.mkdir(exist_ok=True)
    cap = json.loads((folder / "capture.json").read_text())
    our_name, our_address = cap["hospitalName"], cap["location"]["address"]
    m = re.fullmatch(r"\s*(\d+)\s+([^,]+),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5})\s*", our_address)
    if not m:
        raise SystemExit(f"{key}: cannot read address {our_address!r}")
    number_, street, city, state, zip_ = m.groups()

    sources: list[dict] = []
    url = query_url(
        GENERAL,
        [("state", "=", state), ("citytown", "=", city.upper()), ("address", "like", f"{number_} %")],
    )
    rows, prov = source(evidence, GENERAL, url, "care-compare-general-information.json")
    sources.append(prov)

    same_street = [r for r in rows if street_key(r["address"].split(",")[0].split(" ", 1)[1]) == street_key(street)]
    scored = sorted(
        ({"row": r, "score": similarity(our_name, r["facility_name"])} for r in same_street),
        key=lambda c: -c["score"],
    )
    candidates = [
        {
            "ccn": c["row"]["facility_id"],
            "name": c["row"]["facility_name"],
            "address": cms_address(c["row"]),
            "hospitalType": c["row"]["hospital_type"],
            "nameSimilarity": c["score"],
        }
        for c in scored
    ]
    best = scored[0] if scored else None
    runner_up = scored[1]["score"] if len(scored) > 1 else 0.0
    matched = best["row"] if best and best["score"] >= NAME_MIN and best["score"] - runner_up >= NAME_MARGIN else None

    out: dict = {
        "hospitalKey": key,
        "ourName": our_name,
        "ourAddress": our_address,
        "ccn": None,
        "matchedName": None,
        "matchedAddress": None,
        "matchNote": "",
        "overallStars": None,
        "overallRaw": None,
        "overallFootnote": None,
        "patientSurveyStars": None,
        "patientSurveyRaw": None,
        "patientSurveyFootnote": None,
        "surveysCompleted": None,
        "responseRatePct": None,
        "surveyPeriod": None,
        "candidates": candidates,
        "capturedAt": now(),
        "sources": sources,
    }
    if not matched:
        out["matchNote"] = (
            f"No confident match: {len(rows)} CMS row(s) in {city.upper()} at street number {number_}, "
            f"{len(same_street)} on the same street. A match needs name similarity >= {NAME_MIN} and "
            f"{NAME_MARGIN} more than the next candidate. Ratings left null."
        )
        return out

    ccn = matched["facility_id"]
    note = (
        f"Matched on state, city, street number and street name; name similarity {best['score']} "
        f"(token overlap with capture.json hospitalName)."
    )
    if matched["zip_code"] != zip_:
        note += f" CMS lists ZIP {matched['zip_code']}; our address has {zip_}."
    if key in NOTES:
        note += " " + NOTES[key]

    url = query_url(HCAHPS, [("facility_id", "=", ccn), ("hcahps_measure_id", "=", "H_STAR_RATING")])
    hc_rows, prov = source(evidence, HCAHPS, url, "care-compare-hcahps-summary-star.json")
    sources.append(prov)
    hc = hc_rows[0] if len(hc_rows) == 1 else None
    if hc is None:
        note += f" HCAHPS query returned {len(hc_rows)} rows for H_STAR_RATING, so patient survey fields are null."

    fn_overall = matched.get("hospital_overall_rating_footnote") or ""
    fn_survey = (hc or {}).get("patient_survey_star_rating_footnote") or ""
    texts = footnote_texts(evidence, {fn_overall, fn_survey}, sources)

    def footnote(code: str) -> str | None:
        parts = [c.strip() for c in code.split(",") if c.strip()]
        return " ".join(f"Footnote {c}: {texts.get(c, '(text not found)')}" for c in parts) or None

    out.update(
        {
            "ccn": ccn,
            "matchedName": matched["facility_name"],
            "matchedAddress": cms_address(matched),
            "matchNote": note,
            "overallStars": stars(matched["hospital_overall_rating"]),
            "overallRaw": matched["hospital_overall_rating"],
            "overallFootnote": footnote(fn_overall),
        }
    )
    if hc:
        out.update(
            {
                "patientSurveyStars": stars(hc["patient_survey_star_rating"]),
                "patientSurveyRaw": hc["patient_survey_star_rating"],
                "patientSurveyFootnote": footnote(fn_survey),
                "surveysCompleted": number(hc["number_of_completed_surveys"]),
                "responseRatePct": number(hc["survey_response_rate_percent"]),
                "surveyPeriod": {"start": us_date(hc["start_date"]), "end": us_date(hc["end_date"])},
            }
        )
    return out


def main(keys: list[str]) -> None:
    for key in keys or HOSPITALS:
        out = capture(key)
        (ROOT / key / "ratings.json").write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
        print(
            f"{key}: ccn={out['ccn']} overall={out['overallStars']} survey={out['patientSurveyStars']} "
            f"surveys={out['surveysCompleted']} rate={out['responseRatePct']}"
        )


if __name__ == "__main__":
    main(sys.argv[1:])
