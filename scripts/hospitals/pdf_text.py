"""Print the text of a PDF (for verifying captured quotes). Usage: python3 -E -P pdf_text.py <file.pdf>"""

import sys

from pypdf import PdfReader

reader = PdfReader(sys.argv[1])
print("\n".join(page.extract_text() or "" for page in reader.pages))
