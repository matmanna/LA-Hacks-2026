"""Capture the online self-pay prices Labcorp OnDemand and Quest (questhealth.com) publish for two blood tests.

Tests: 85025 blood count (CBC with differential) and 80053 comprehensive metabolic panel (CMP).

Usage:
  python3 -E -P scripts/labs/capture_lab_prices.py [--out data/labs]

Plain HTTPS GETs with a descriptive User-Agent: no Browser Use, no login, no cart or checkout calls. Every price and
quote is parsed from the fetched bytes, which are saved under data/labs/<key>/evidence/ (files over 2 MB are skipped
and noted). sha256 and bytes are of the original response. When the evidence copy redacts a public key embedded in
the page, the source says so and gives the copy's own sha256.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from decimal import Decimal
from html.parser import HTMLParser
from pathlib import Path

import certifi

UA = "BetterBill-hackathon-research/0.1 (LA Hacks 2026 student project)"
TLS = ssl.create_default_context(cafile=certifi.where())
MAX_EVIDENCE_BYTES = 2 * 1024 * 1024
SCRIPT = "scripts/labs/capture_lab_prices.py"

# Public client-side keys embedded in the pages (a Stripe publishable key, an Algolia search key). Not secrets, but
# secret scanners flag them and BetterBill does not need them, so the committed copies replace the values.
REDACTIONS = [
    (re.compile(rb"pk_live_[A-Za-z0-9]+"), b"pk_live_[redacted]"),
    (re.compile(rb'("appKey":\s*")[0-9A-Za-z]+(")'), rb"\1[redacted]\2"),
]
LEFTOVER_KEYS = re.compile(rb"(pk|sk|rk)_live_[A-Za-z0-9]{8,}|AIza[0-9A-Za-z_-]{20,}")

TESTS = {
    "85025": "Blood count (CBC with differential)",
    "80053": "Metabolic panel (comprehensive metabolic panel, CMP)",
}

LABCORP_PAGES = {
    "85025": "https://www.ondemand.labcorp.com/lab-tests/complete-blood-count",
    "80053": "https://www.ondemand.labcorp.com/lab-tests/comprehensive-metabolic-panel",
}
LABCORP_HELP = "https://support.ondemand.labcorp.com/api/v2/help_center/en-us/articles/{}.json"
LABCORP_ARTICLES = {
    "fees_at_lab": 360043703614,
    "physician_order": 360044203813,
    "promotions": 33271893091859,
}
QUEST_PAGES = {
    "85025": "https://www.questhealth.com/product/complete-blood-count-cbc/6399M.html",
    "80053": "https://www.questhealth.com/product/comprehensive-metabolic-panel-cmp/10231M.html",
}


def now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def cents(price: str) -> int:
    value = Decimal(price.replace("$", "").replace(",", "").strip()) * 100
    if value != value.to_integral_value():
        raise SystemExit(f"price is not a whole number of cents: {price!r}")
    return int(value)


class _Text(HTMLParser):
    SKIP = {"script", "style", "noscript", "template"}
    BLOCK = {"p", "div", "li", "br", "h1", "h2", "h3", "h4", "h5", "h6", "tr", "td", "th", "ul", "ol", "dt", "dd"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self.skip += 1
        elif tag in self.BLOCK:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in self.SKIP:
            self.skip = max(0, self.skip - 1)
        elif tag in self.BLOCK:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(re.sub(r"\s+", " ", data))


def text_lines(markup: str) -> list[str]:
    p = _Text()
    p.feed(markup)
    p.close()
    lines = (re.sub(r"\s+", " ", line).strip() for line in "".join(p.parts).split("\n"))
    return [line for line in lines if line]


def sentence(lines: list[str], anchor: str) -> str:
    """The full sentence (as printed) that contains anchor. Fails loudly so no quote is ever typed by hand."""
    for line in lines:
        if anchor in line:
            for s in re.split(r"(?<=[.!?])\s+", line):
                if anchor in s:
                    return s
    raise SystemExit(f"quote anchor not found: {anchor!r}")


class Lab:
    def __init__(self, key: str, out: Path) -> None:
        self.key = key
        self.dir = out / key
        (self.dir / "evidence").mkdir(parents=True, exist_ok=True)
        self.sources: list[dict] = []

    def fetch(self, kind: str, url: str, evidence_name: str) -> tuple[str, dict]:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=60, context=TLS) as r:
                raw, status, final_url, ctype = r.read(), r.status, r.url, r.headers.get("Content-Type")
        except urllib.error.HTTPError as e:
            raise SystemExit(f"{self.key}: HTTP {e.code} for {url}. Not worked around; nothing written.") from e
        source = {
            "kind": kind,
            "url": url,
            "sha256": hashlib.sha256(raw).hexdigest(),
            "bytes": len(raw),
            "evidenceFile": None,
            "fetchedAt": now(),
            "httpStatus": status,
            "contentType": ctype,
        }
        if final_url != url:
            source["finalUrl"] = final_url
        if len(raw) > MAX_EVIDENCE_BYTES:
            source["note"] = "Over 2 MB, not committed."
        else:
            copy = raw
            for pattern, replacement in REDACTIONS:
                copy = pattern.sub(replacement, copy)
            if LEFTOVER_KEYS.search(copy):
                raise SystemExit(f"{url}: key-like string left after redaction; check REDACTIONS")
            path = self.dir / "evidence" / evidence_name
            path.write_bytes(copy)
            source["evidenceFile"] = f"evidence/{evidence_name}"
            if copy != raw:
                source["redacted"] = {
                    "note": "sha256 and bytes are of the original response. The committed copy replaces public "
                    "client-side key values (Stripe publishable key, Algolia search key) with [redacted].",
                    "evidenceSha256": hashlib.sha256(copy).hexdigest(),
                    "evidenceBytes": len(copy),
                }
        self.sources.append(source)
        return raw.decode("utf-8"), source

    def write(self, capture: dict) -> None:
        path = self.dir / "capture.json"
        path.write_text(json.dumps(capture, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"wrote {path}", file=sys.stderr)


def labcorp(out: Path, captured_at: str) -> None:
    lab = Lab("labcorp-ondemand", out)

    articles = {}
    for name, article_id in LABCORP_ARTICLES.items():
        body, src = lab.fetch("help_article_json", LABCORP_HELP.format(article_id), f"help-{name.replace('_', '-')}.json")
        a = json.loads(body)["article"]
        src["title"] = a["title"]
        src["htmlUrl"] = a["html_url"]
        src["articleUpdatedAt"] = a["updated_at"]
        articles[name] = (text_lines(a["body"]), a["html_url"])

    order_lines, order_url = articles["physician_order"]
    lab_lines, lab_url = articles["fees_at_lab"]
    promo_lines, promo_url = articles["promotions"]
    includes = sentence(order_lines, "The price of each test includes")

    prices = []
    for code, url in LABCORP_PAGES.items():
        slug = "cbc" if code == "85025" else "cmp"
        markup, _ = lab.fetch("product_page", url, f"{slug}-product-page.html")
        button = re.search(r'<span[^>]*\bid="addToCart"[^>]*>', markup).group(0)
        attrs = dict(re.findall(r'(data-[\w-]+)="([^"]*)"', button))
        sku = attrs["data-sku"]
        name = html.unescape(re.search(r'<h1 itemprop="name"[^>]*>(.*?)</h1>', markup, re.S).group(1)).strip()
        block = re.search(rf'<div class="price" data-product-sku="{sku}">(.*?)</div>', markup, re.S).group(1)
        shown = " ".join(text_lines(block))
        regular = re.search(r'class="regularPrice">\s*(\$[\d,.]+)', block)
        list_cents = cents(attrs["data-price"])
        if regular and cents(regular.group(1)) != list_cents:
            raise SystemExit(f"{url}: regular price {regular.group(1)} != data-price {attrs['data-price']}")
        if not regular and cents(shown) != list_cents:
            raise SystemExit(f"{url}: shown price {shown!r} != data-price {attrs['data-price']}")
        page_lines = text_lines(markup)

        directory, dsrc = lab.fetch("test_directory", f"https://www.labcorp.com/tests/{sku}", f"labcorp-test-{sku}.html")
        title = html.unescape(re.search(r"<title>(.*?)</title>", directory, re.S).group(1)).strip()
        m = re.search(r"Labcorp Test (\d+), CPT (\d{5})", title)
        if not m or m.group(1) != sku or m.group(2) != code:
            raise SystemExit(f"Labcorp test {sku}: title {title!r} does not give CPT {code}")
        dsrc["title"] = title

        sale = None
        if attrs.get("data-discountedPrice"):
            if not any(name in line for line in promo_lines):
                raise SystemExit(f"{name} is on sale but not named in the promotions article")
            sale = {
                "cents": cents(attrs["data-discountedPrice"]),
                "percentOff": int(attrs["data-discountPercent"]),
                "quote": shown,
                "sourceUrl": url,
                "terms": [
                    {"quote": sentence(promo_lines, "for a limited time beginning"), "sourceUrl": promo_url},
                    {"quote": sentence(promo_lines, "Discounts do not apply to the Physician Fee"), "sourceUrl": promo_url},
                ],
            }

        prices.append(
            {
                "code": code,
                "test": TESTS[code],
                "productName": name,
                "productId": sku,
                "cashCents": list_cents,
                "cashCentsBasis": "Regular listed price on the product page. The help center says the ordering "
                "provider's fee and sample collection are included.",
                "listedPriceCents": list_cents,
                "addedFees": [],
                "includes": includes,
                "includesSourceUrl": order_url,
                "sourceUrl": url,
                "quote": shown,
                "sale": sale,
                "codeEvidence": {
                    "verified": True,
                    "kind": "test_directory",
                    "url": dsrc.get("finalUrl", dsrc["url"]),
                    "quote": m.group(0),
                    "testName": title.split(" | ")[0],
                },
                "otherQuotes": [
                    {"quote": sentence(lab_lines, "No additional payment is due at the lab"), "sourceUrl": lab_url},
                    {"quote": sentence(lab_lines, "The cost of sample collection is included"), "sourceUrl": lab_url},
                    {"quote": sentence(page_lines, "will review and approve your test requests"), "sourceUrl": url},
                ],
            }
        )

    lab.write(
        {
            "labKey": lab.key,
            "labName": "Labcorp OnDemand",
            "capturedAt": captured_at,
            "capturedBy": f"{SCRIPT} (plain HTTPS GETs; no Browser Use, login or checkout)",
            "sources": lab.sources,
            "prices": prices,
            "notes": [
                "Product pages were found in https://www.ondemand.labcorp.com/sitemap.xml. Prices are in each page's "
                "server-rendered HTML (the price block and the add-to-cart button's data-price), so no price JSON was "
                "needed.",
                "CPT codes: the OnDemand SKU is the Labcorp test number, and https://www.labcorp.com/tests/<sku> gives "
                "the CPT code in its page title (005009 is CPT 85025, 322000 is CPT 80053). Labcorp's test menu names "
                "005009 'Complete Blood Count (CBC) With Differential, Reflex to Peripheral Smear Review'.",
                "Fees: the help center articles (fetched as the help center's own article JSON) say the ordering "
                "provider's fee and sample collection are included in the price. Tax was not checked.",
                "The CMP was on an October sale when captured: the page shows the sale price and the regular price. "
                "cashCents is the regular price; the sale price and its terms are in `sale`. The promotions article "
                "also says discounts do not apply to the physician fee, and the page shows no separate physician fee, "
                "so the exact sale total at checkout was not confirmed (no cart or checkout calls were made).",
                "These are national online prices for ordering the test directly, with the draw at a Labcorp location. "
                "They are not tied to one location and are not hospital prices.",
            ],
        }
    )


def quest(out: Path, captured_at: str) -> None:
    lab = Lab("quest-health", out)
    prices = []
    for code, url in QUEST_PAGES.items():
        slug = "cbc" if code == "85025" else "cmp"
        markup, _ = lab.fetch("product_page", url, f"{slug}-product-page.html")
        name = html.unescape(re.search(r'<h1 class="qd-text-h2">(.*?)</h1>', markup, re.S).group(1)).strip()
        product_id = re.search(r'"product_id":\["([^"]+)"\]', markup).group(1)
        start = markup.index('<div class="prices">')
        block = markup[start : markup.index('<div class="hsa', start)]
        listed = re.search(r'class="price-formatted">\s*(\$[\d,.]+)', block).group(1)
        fee = re.search(r'class="pwn-fee-price">\s*(\$[\d,.]+) Physician Service Fee', block).group(1)
        shown = " ".join(text_lines(block))
        page_lines = text_lines(markup)
        # The checkout text for the fee is a URL-encoded string inside a JSON blob on the page.
        fee_text = re.search(r'"pwnServiceFee":"((?:[^"\\]|\\.)*)"', markup).group(1)
        fee_lines = text_lines(urllib.parse.unquote(json.loads(f'"{fee_text}"')))

        if code == "85025":
            basis = sentence(page_lines, "This CBC includes a white blood cell differential")
        else:
            basis = sentence(page_lines, "measures 14 components of the blood")

        prices.append(
            {
                "code": code,
                "test": TESTS[code],
                "productName": name,
                "productId": product_id,
                "cashCents": cents(listed) + cents(fee),
                "cashCentsBasis": "Listed test price plus the Physician Service Fee shown under it, for one test in "
                "one order, before tax.",
                "listedPriceCents": cents(listed),
                "addedFees": [{"name": "Physician Service Fee", "cents": cents(fee), "quote": f"{fee} Physician Service Fee"}],
                "includes": sentence(page_lines, "physician oversight of testing is included with your order"),
                "includesSourceUrl": url,
                "sourceUrl": url,
                "quote": shown,
                "sale": None,
                "codeEvidence": {
                    "verified": False,
                    "kind": "page_description",
                    "url": url,
                    "quote": basis,
                    "note": "questhealth.com does not print CPT codes. Matched from the page's own description.",
                },
                "otherQuotes": [
                    {
                        "quote": sentence(fee_lines, "The PWN Service Fee is collected"),
                        "sourceUrl": url,
                        "note": "Checkout text embedded in the product page (pwnServiceFee).",
                    },
                    {"quote": sentence(page_lines, "This test requires sample collection"), "sourceUrl": url},
                    {"quote": sentence(page_lines, "Collection is not available in"), "sourceUrl": url},
                    {"quote": sentence(page_lines, "purchase for an additional"), "sourceUrl": url},
                    {"quote": sentence(page_lines, "we do not bill insurance"), "sourceUrl": url},
                ],
            }
        )

    lab.write(
        {
            "labKey": lab.key,
            "labName": "Quest Diagnostics (questhealth.com)",
            "capturedAt": captured_at,
            "capturedBy": f"{SCRIPT} (plain HTTPS GETs; no Browser Use, login or checkout)",
            "sources": lab.sources,
            "prices": prices,
            "notes": [
                "Product pages were found in https://www.questhealth.com/sitemap_0.xml. Prices are in each page's "
                "server-rendered HTML (price-formatted and pwn-fee-price), so no price JSON was needed. robots.txt "
                "disallows /on/demandware.store paths; none were fetched.",
                "Each page shows the test price plus a $6.00 Physician Service Fee. cashCents adds the two for one test "
                "in one order. The pages do not say whether the fee is charged once per order or once per test, so "
                "ordering both tests together may cost less than the two cashCents added together (not checked; no "
                "cart or checkout calls were made). Tax was not checked.",
                "CPT codes are not printed on questhealth.com. Quest's test directory "
                "(testdirectory.questdiagnostics.com) loads test details from an API that needs app credentials, so "
                "it was not used. The codes here are matched from each page's own description and are marked "
                "codeEvidence.verified = false.",
                "The pages do not list a separate fee for the draw at a Quest location. In-home collection costs extra "
                "where it is offered (see otherQuotes).",
                "The committed evidence copies of the product pages redact Quest's Stripe publishable key, a public "
                "checkout key embedded in every page.",
                "These are national online prices for ordering the test directly, with the draw at a Quest location. "
                "They are not tied to one location and are not hospital prices.",
            ],
        }
    )


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", type=Path, default=Path(__file__).resolve().parents[2] / "data" / "labs")
    args = ap.parse_args()
    captured_at = now()
    labcorp(args.out, captured_at)
    quest(args.out, captured_at)


if __name__ == "__main__":
    main()
