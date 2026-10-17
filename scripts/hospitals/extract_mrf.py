"""Stream a CMS v2 JSON machine-readable file, hash every byte, and extract rows for given codes (C-05, Part B).

Usage:
  python -I scripts/hospitals/extract_mrf.py --url <mrf url> --codes 72148 85025 \
      --page-url <source page url> --run-id <browser use run id> \
      --out data/hospitals/cedars-sinai/capture.json

The MRF itself is never written to disk. Evidence (cms-hpt.txt, price page text) goes next to --out.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import ssl
import sys
import urllib.request
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

import certifi
import ijson

UA = "BetterBill-hackathon-research/0.1 (LA Hacks 2026 student project)"
HPT_URL = "https://www.cedars-sinai.org/cms-hpt.txt"
HEAD_BYTES = 256 * 1024
TLS = ssl.create_default_context(cafile=certifi.where())


def now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def fetch(url: str) -> tuple[bytes, dict[str, str]]:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60, context=TLS) as r:
        return r.read(), dict(r.headers)


class HashingReader:
    """File-like wrapper that hashes and counts every byte read and keeps the first HEAD_BYTES."""

    def __init__(self, raw):
        self.raw = raw
        self.sha = hashlib.sha256()
        self.bytes = 0
        self.head = bytearray()
        self.last_report = 0

    def read(self, n: int = -1) -> bytes:
        chunk = self.raw.read(n)
        self.sha.update(chunk)
        self.bytes += len(chunk)
        if len(self.head) < HEAD_BYTES:
            self.head += chunk[: HEAD_BYTES - len(self.head)]
        if self.bytes - self.last_report >= 100 * 1024 * 1024:
            self.last_report = self.bytes
            print(f"  {self.bytes / 1e6:,.0f} MB read", file=sys.stderr, flush=True)
        return chunk

    def drain(self) -> None:
        while self.read(1024 * 1024):
            pass


def cents(x) -> int | None:
    if x is None:
        return None
    return int((Decimal(str(x)) * 100).quantize(Decimal(1)))


def head_field(head: bytes, name: str) -> str | None:
    m = re.search(rb'"' + name.encode() + rb'"\s*:\s*"([^"]*)"', head)
    return m.group(1).decode("utf-8", "replace") if m else None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--codes", nargs="+", required=True)
    ap.add_argument("--page-url", required=True)
    ap.add_argument("--run-id", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    out = Path(args.out)
    evidence = out.parent / "evidence"
    evidence.mkdir(parents=True, exist_ok=True)
    codes = set(args.codes)

    hpt, _ = fetch(HPT_URL)
    (evidence / "cms-hpt.txt").write_bytes(hpt)
    page, _ = fetch(args.page_url)
    (evidence / "price_page.html").write_bytes(page)

    print(f"streaming {args.url}", file=sys.stderr)
    req = urllib.request.Request(args.url, headers={"User-Agent": UA})
    matches = []
    with urllib.request.urlopen(req, timeout=120, context=TLS) as r:
        last_modified = r.headers.get("Last-Modified")
        content_length = r.headers.get("Content-Length")
        reader = HashingReader(r)
        for item in ijson.items(reader, "standard_charge_information.item", use_float=False):
            info = item.get("code_information") or []
            hit = [c for c in info if c.get("type") in ("CPT", "HCPCS") and c.get("code") in codes]
            if not hit:
                continue
            for sc in item.get("standard_charges") or []:
                matches.append(
                    {
                        "code": hit[0]["code"],
                        "codeType": hit[0]["type"],
                        "hospitalDescription": item.get("description"),
                        "otherCodes": [
                            {"code": c.get("code"), "type": c.get("type")} for c in info if c not in hit
                        ],
                        "setting": sc.get("setting"),
                        "grossChargeCents": cents(sc.get("gross_charge")),
                        "discountedCashCents": cents(sc.get("discounted_cash")),
                        "minNegotiatedCents": cents(sc.get("minimum")),
                        "maxNegotiatedCents": cents(sc.get("maximum")),
                    }
                )
        reader.drain()
    captured_at = now()
    head = bytes(reader.head)

    result = {
        "hospitalKey": "cedars-sinai",
        "hospitalName": head_field(head, "hospital_name"),
        "capturedAt": captured_at,
        "capturedBy": f"browser_use_capture.py run {args.run_id} + extract_mrf.py",
        "sources": [
            {
                "kind": "cms_hpt_txt",
                "url": HPT_URL,
                "sha256": hashlib.sha256(hpt).hexdigest(),
                "bytes": len(hpt),
                "evidenceFile": "evidence/cms-hpt.txt",
            },
            {
                "kind": "price_page",
                "url": args.page_url,
                "sha256": hashlib.sha256(page).hexdigest(),
                "bytes": len(page),
                "evidenceFile": "evidence/price_page.html",
            },
            {
                "kind": "mrf",
                "url": args.url,
                "sha256": reader.sha.hexdigest(),
                "bytes": reader.bytes,
                "httpContentLength": int(content_length) if content_length else None,
                "httpLastModified": last_modified,
                "fileLastUpdatedOn": head_field(head, "last_updated_on"),
                "fileVersion": head_field(head, "version"),
            },
        ],
        "allMatches": matches,
    }
    out.write_text(json.dumps(result, indent=2) + "\n")
    print(f"done: {reader.bytes:,} bytes, {len(matches)} matching rows -> {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
