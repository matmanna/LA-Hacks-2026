"""Finish a capture written by extract_mrf.py: pick one price row per code, add the hospital's location.

Usage:
  python3 -E -P scripts/hospitals/finish_capture.py data/hospitals/<key>/capture.json [...] \
      --codes 72148 85025 99284 70450 [--select] [--locate]

--select  Builds `prices` from `allMatches` (skipped when `prices` already exists, so curated captures
          keep their hand-written selection). Per code: rows whose setting is outpatient (else "both"),
          then the most common (gross, cash) pair among rows with a cash price. Ties go to the pair that
          appears first in the file. A code with rows but no cash price keeps one row with cash null.
--locate  Adds `location`: the address printed in the price file's own header (hospital_address; the
          first one when the file lists several), geocoded with Nominatim (one request per second).
          When extract_mrf.py did not keep the header, the first 256 KB of the mrf-url are read again.
"""

from __future__ import annotations

import argparse
import json
import re
import ssl
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import certifi

UA = "BetterBill-hackathon-research/0.1 (LA Hacks 2026 student project)"
TLS = ssl.create_default_context(cafile=certifi.where())
HEAD_BYTES = 256 * 1024
NOMINATIM = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q="


def now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def head_strings(head: bytes, name: str) -> list[str] | None:
    m = re.search(rb'"' + name.encode() + rb'"\s*:\s*(\[[^\]]*\]|"[^"]*")', head)
    if not m:
        return None
    try:
        v = json.loads(m.group(1).decode("utf-8", "replace"))
    except ValueError:
        return None
    return [v] if isinstance(v, str) else [str(x) for x in v]


def fetch_head(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60, context=TLS) as r:
        return r.read(HEAD_BYTES)


def select(capture: dict, codes: list[str]) -> None:
    rows = capture.get("allMatches") or []
    prices, notes = [], {}
    for code in codes:
        mine = [r for r in rows if r["code"] == code]
        if not mine:
            notes[code] = "No row for this code in the file."
            continue
        # Rows with a cash price first (CPT-descriptor rows often list payer rates only),
        # then outpatient over "both". Inpatient-only rows are not a visit price.
        options = [
            (setting, with_cash)
            for with_cash in (True, False)
            for setting in ("outpatient", "both")
        ]
        setting, mine = next(
            (
                (st, [r for r in mine if r["setting"] == st and (r["discountedCashCents"] is not None) == wc])
                for st, wc in options
                if any(r["setting"] == st and (r["discountedCashCents"] is not None) == wc for r in mine)
            ),
            (None, []),
        )
        if not mine:
            notes[code] = "Rows for this code are inpatient only; not used for a visit price."
            continue
        cash = [r for r in mine if r["discountedCashCents"] is not None]
        pool = mine
        pairs = Counter((r["grossChargeCents"], r["discountedCashCents"]) for r in pool)
        (gross, cash_c), n = pairs.most_common(1)[0]
        pick = next(r for r in pool if (r["grossChargeCents"], r["discountedCashCents"]) == (gross, cash_c))
        prices.append({**pick, "rowsInFile": len(mine)})
        notes[code] = (
            f"{len(mine)} {setting} row(s) with a cash price for this code. "
            f"{n} share this gross and cash amount, the most common pair (first in file on a tie). "
            "Every row, including rows that list payer rates only, is in allMatches."
            if cash
            else f"{len(mine)} {setting} row(s) for this code in the file, none with a cash price."
        )
    capture["prices"] = prices
    capture["selection"] = notes
    capture["codesSearched"] = codes
    # System-level files (Providence) put the system in hospital_name; location_name is the hospital.
    mrf = next(s for s in capture["sources"] if s["kind"] == "mrf")
    names = mrf.get("fileLocationName")
    if names:
        capture["fileHospitalName"] = capture["hospitalName"]
        capture["hospitalName"] = names[0].strip()
        capture["hospitalNameSource"] = "mrf location_name"


def redact_hpt(capture: dict, folder: Path) -> None:
    """Drop contact-name and contact-email lines from the committed cms-hpt.txt copy (as for UCLA)."""
    path = folder / "evidence" / "cms-hpt.txt"
    src = next((s for s in capture["sources"] if s["kind"] == "cms_hpt_txt"), None)
    if not path.exists() or not src or "note" in src:
        return
    lines = path.read_text(errors="replace").splitlines(keepends=True)
    path.write_text("".join(l for l in lines if not l.lower().startswith(("contact-name", "contact-email"))))
    src["note"] = (
        "sha256 and bytes are of the original response. "
        "The committed evidence copy redacts the contact-name and contact-email lines."
    )


def geocode(address: str) -> tuple[dict | None, str]:
    # Nominatim often misses suite or floor parts; retry once without them.
    queries = [address]
    simple = re.sub(r"(?i),?\s*(suite|ste\.?|floor|fl\.?|unit|#)\s*[\w-]+", "", address)
    if simple != address:
        queries.append(simple)
    for q in queries:
        req = urllib.request.Request(NOMINATIM + urllib.parse.quote(q), headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=30, context=TLS) as r:
            hits = json.loads(r.read())
        time.sleep(1.1)
        if hits:
            return hits[0], q
    return None, queries[-1]


def locate(capture: dict) -> None:
    mrf = next(s for s in capture["sources"] if s["kind"] == "mrf")
    addresses = mrf.get("fileHospitalAddress")
    if not addresses:
        addresses = head_strings(fetch_head(mrf["url"]), "hospital_address")
        mrf["fileHospitalAddress"] = addresses
        mrf["fileHospitalAddressReadAt"] = now()
    if not addresses:
        print(f"  no hospital_address in {mrf['url']}", file=sys.stderr)
        return
    address = addresses[0]
    hit, query = geocode(address)
    if not hit:
        print(f"  nominatim found nothing for {address!r}", file=sys.stderr)
        return
    capture["location"] = {
        "address": address,
        "lat": round(float(hit["lat"]), 6),
        "lng": round(float(hit["lon"]), 6),
        "source": {"kind": "mrf_header", "url": mrf["url"]},
        "geocoder": "nominatim",
        "geocoderQuery": query,
        "geocoderMatch": hit.get("display_name"),
        "geocodedAt": now(),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("captures", nargs="+")
    ap.add_argument("--codes", nargs="+", default=["72148", "85025", "99284", "70450"])
    ap.add_argument("--select", action="store_true")
    ap.add_argument("--locate", action="store_true")
    args = ap.parse_args()
    for path in map(Path, args.captures):
        capture = json.loads(path.read_text())
        print(path, file=sys.stderr)
        if args.select and "prices" not in capture:
            select(capture, args.codes)
            redact_hpt(capture, path.parent)
        if args.locate:
            locate(capture)
        path.write_text(json.dumps(capture, indent=2) + "\n")
        loc = capture.get("location")
        print(f"  prices {len(capture.get('prices', []))}, location {loc and (loc['address'], loc['lat'], loc['lng'])}", file=sys.stderr)


if __name__ == "__main__":
    main()
