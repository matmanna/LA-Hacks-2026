"""Build data/hospitals/cedars-sinai/policy.json from the Browser Use policy run, keeping only verbatim quotes (C-06).

Usage: python -I scripts/hospitals/build_policy.py --pdf-retrieved <ISO> --page-retrieved <ISO>

Inputs (in data/hospitals/cedars-sinai/evidence/):
  browser_use_policy_run.json   Browser Use output (policy URL, PDF links, candidate quotes)
  full-fap-english.pdf          policy PDF as downloaded
  assistance_page.txt           rendered text of the policy web page
Each candidate quote is kept only if it appears in the PDF text or page text after whitespace and dash
normalization. Thresholds are set from verified quotes only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / "data/hospitals/cedars-sinai"
EV = DIR / "evidence"
PDF_URL = "https://www.cedars-sinai.org/content/dam/cedars-sinai/billing-insurance/financial-assistance/documents/faps/full-fap-english.pdf"

# Quotes that set the thresholds. Each must be among the verified quotes.
FREE_CARE_QUOTE = "Charity Care will be made available to patients whose family income is at or below 400% of FPL."
DISCOUNT_QUOTE = "Patients whose income ranges between 401% to 600% of FPL qualify for a Discount Payment."


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKC", s)
    s = re.sub(r"[‐-―−]", "-", s).replace("’", "'").replace("“", '"').replace("”", '"')
    return re.sub(r"\s+", " ", s).strip()


def purpose(q: str) -> str:
    n = norm(q).lower()
    if "physician" in n:
        return "other"
    if "charity care" in n and "400" in n:
        return "free_care_threshold"
    if "401" in n or "600%" in n or "fpl %" in n:
        return "discount_threshold"
    return "eligibility"


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf-retrieved", required=True)
    ap.add_argument("--page-retrieved", required=True)
    args = ap.parse_args()

    run = json.loads((EV / "browser_use_policy_run.json").read_text())
    out = run["output"]
    pdf = EV / "full-fap-english.pdf"
    page = EV / "assistance_page.txt"
    reader = PdfReader(pdf)
    pdf_text = norm("\n".join(p.extract_text() or "" for p in reader.pages))
    page_text = norm(page.read_text())

    quotes, dropped = [], []
    for q in out["quotes"]:
        n = norm(q)
        source = "pdf" if n in pdf_text else "page" if n in page_text else None
        if source is None:
            dropped.append(q)
            continue
        quotes.append({"text": q, "purpose": purpose(q), "foundIn": f"evidence/{pdf.name if source == 'pdf' else page.name}"})

    verified = {norm(q["text"]) for q in quotes}
    for q in (FREE_CARE_QUOTE, DISCOUNT_QUOTE):
        if norm(q) not in verified:
            raise SystemExit(f"threshold quote not verified: {q}")

    meta = reader.metadata or {}
    policy = {
        "hospitalKey": "cedars-sinai",
        "policyUrl": out["policy_url"],
        "policyTitle": out["policy_title"],
        "capturedAt": max(args.pdf_retrieved, args.page_retrieved),
        "capturedBy": f"browser_use_policy.py run {run['runId']} + build_policy.py",
        "evidence": [
            {
                "file": f"evidence/{pdf.name}",
                "url": PDF_URL,
                "sha256": sha(pdf),
                "bytes": pdf.stat().st_size,
                "retrievedAt": args.pdf_retrieved,
                "pages": len(reader.pages),
                "pdfModDate": str(meta.get("/ModDate")) if meta.get("/ModDate") else None,
            },
            {
                "file": f"evidence/{page.name}",
                "url": out["policy_url"],
                "sha256": sha(page),
                "bytes": page.stat().st_size,
                "retrievedAt": args.page_retrieved,
                "note": "Rendered page text (innerText via Playwright); the page body is built by JavaScript.",
            },
            {"file": "evidence/browser_use_policy_run.json", "runId": run["runId"]},
        ],
        "otherLanguagePdfs": [u for u in out["pdf_urls"] if u != PDF_URL],
        "quotes": quotes,
        "thresholds": {
            "freeCareMaxFplPct": 400,
            "freeCareQuote": FREE_CARE_QUOTE,
            "discountMinFplPct": 401,
            "discountMaxFplPct": 600,
            "discountQuote": DISCOUNT_QUOTE,
        },
        "notes": (
            "Charity care is for medically necessary services. Discount size follows the policy's sliding-scale "
            "table by FPL % and insurance status (see the quoted table). A discounted patient is not charged more "
            "than expected reimbursement under Medicare or Medi-Cal, whichever is greater. Eligibility is decided "
            "by the hospital's application; BetterBill only estimates. Quotes not found verbatim were dropped: "
            f"{len(dropped)}."
        ),
    }
    (DIR / "policy.json").write_text(json.dumps(policy, indent=2, ensure_ascii=False) + "\n")
    print(f"{len(quotes)} verified quotes, {len(dropped)} dropped -> {DIR / 'policy.json'}")


if __name__ == "__main__":
    main()
