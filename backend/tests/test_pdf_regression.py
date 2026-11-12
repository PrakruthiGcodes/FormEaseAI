"""Visual regression tests for PDF output.

Why pixels and not only text: the PDF text layer does not reliably reproduce
Telugu conjuncts and vowel signs (see app/services/pdf_service.py). The
checks here rasterise the page with PDFium and compare the pixels, so a
wrong vowel position fails the test even when the extracted text looks right.

* test_telugu_name_matches_golden_rendering: the Telugu name cell must match
  the approved image in tests/fixtures/pdf/telugu_name_value.png.
* test_reportlab_fallback_is_detected_as_different: negative control. The old
  ReportLab output for the same text must NOT match the golden image, which
  proves the comparison would have caught the original Telugu defect.

Golden tests need Chromium (Playwright) and the Nirmala UI font; they are
skipped with a reason when either is missing.
"""

import io
from pathlib import Path

import pypdfium2 as pdfium
import pytest
from PIL import Image, ImageChops
from pypdf import PdfReader

from app.services import pdf_service
from app.services.pdf_service import build_form_pdf

GOLDEN_DIR = Path(__file__).parent / "fixtures" / "pdf"
GOLDEN_TELUGU_NAME = GOLDEN_DIR / "telugu_name_value.png"
RENDER_SCALE = 2
PAD_PT = 6
MAX_CHANGED_FRACTION = 0.01  # up to 1% of pixels may differ (anti-aliasing, hinting)
PIXEL_THRESHOLD = 40  # per-pixel grey-level difference that counts as "changed"

BASE = {
    "full_name": "Ananya Rao", "age": "21", "date_of_birth": "15-08-1999", "gender": "Female",
    "mobile_number": "9876543210", "email": "ananya@example.com", "address": "12 MG Road, Bengaluru",
    "city": "Bengaluru", "state": "Karnataka", "pin_code": "560001", "occupation": "Engineer",
    "education": "B.E. Computer Science",
}
TELUGU = dict(BASE, full_name="స్త్రీ కర్ణాటక", city="కర్ణాటక", occupation="ఇంజనీర్", address="స్త్రీ, కర్ణాటక")
TELUGU_NAME = "స్త్రీ కర్ణాటక"


def _chromium_available() -> bool:
    try:
        import playwright  # noqa: F401
    except ImportError:
        return False
    try:
        return "Skia" in (PdfReader(io.BytesIO(build_form_pdf(BASE, "English"))).metadata or {}).get("/Producer", "")
    except Exception:
        return False


requires_chromium = pytest.mark.skipif(
    not _chromium_available(), reason="Chromium (Playwright) is not available for PDF rendering"
)
requires_nirmala = pytest.mark.skipif(
    pdf_service.FONT != "FormEaseUnicode", reason="Nirmala UI font not installed (Windows only)"
)


def _producer(pdf_bytes: bytes) -> str:
    return str((PdfReader(io.BytesIO(pdf_bytes)).metadata or {}).get("/Producer", ""))


def crop_text(pdf_bytes: bytes, text: str) -> Image.Image:
    """Rasterise page 1 and return the area around the first match of `text` in the text layer."""
    page = pdfium.PdfDocument(pdf_bytes)[0]
    textpage = page.get_textpage()
    match = textpage.search(text).get_next()
    assert match is not None, f"{text!r} is not in the PDF text layer"
    start, count = match
    boxes = [textpage.get_charbox(index) for index in range(start, start + count)]
    boxes = [box for box in boxes if box[2] > box[0]]  # skip zero-width characters
    left = min(box[0] for box in boxes) - PAD_PT
    bottom = min(box[1] for box in boxes) - PAD_PT
    right = max(box[2] for box in boxes) + PAD_PT
    top = max(box[3] for box in boxes) + PAD_PT
    height_pt = page.get_height()
    image = page.render(scale=RENDER_SCALE).to_pil()
    box_px = (
        int(left * RENDER_SCALE),
        int((height_pt - top) * RENDER_SCALE),
        int(right * RENDER_SCALE),
        int((height_pt - bottom) * RENDER_SCALE),
    )
    return image.crop(box_px).convert("RGB")


def changed_fraction(actual: Image.Image, expected: Image.Image) -> float:
    expected = expected.resize(actual.size) if expected.size != actual.size else expected
    diff = ImageChops.difference(actual.convert("L"), expected.convert("L"))
    histogram = diff.histogram()
    changed = sum(histogram[PIXEL_THRESHOLD:])
    return changed / (actual.width * actual.height)


@requires_chromium
@requires_nirmala
def test_telugu_name_matches_golden_rendering():
    actual = crop_text(build_form_pdf(TELUGU, "Telugu"), TELUGU_NAME)
    golden = Image.open(GOLDEN_TELUGU_NAME).convert("RGB")
    assert actual.size == golden.size, f"crop size {actual.size} != golden {golden.size}"
    fraction = changed_fraction(actual, golden)
    assert fraction <= MAX_CHANGED_FRACTION, (
        f"{fraction:.2%} of pixels differ from the approved Telugu rendering"
    )


@requires_chromium
@requires_nirmala
def test_reportlab_fallback_is_detected_as_different():
    """Negative control: the old ReportLab output must fail the golden comparison."""
    reportlab_pdf = pdf_service._build_with_reportlab(TELUGU, "Telugu")
    golden = Image.open(GOLDEN_TELUGU_NAME).convert("RGB")
    fraction = changed_fraction(crop_text(reportlab_pdf, TELUGU_NAME), golden)
    assert fraction > 0.02, f"ReportLab output matched the golden image ({fraction:.2%} differs)"


@requires_chromium
@requires_nirmala
def test_telugu_words_are_in_the_text_layer():
    """Search and copy work on the exact typed characters (invisible text layer)."""
    page = pdfium.PdfDocument(build_form_pdf(TELUGU, "Telugu"))[0]
    textpage = page.get_textpage()
    for word in ["స్త్రీ", "కర్ణాటక", "ఇంజనీర్", TELUGU_NAME]:
        assert textpage.search(word).get_next() is not None, f"{word!r} not searchable"


@requires_chromium
def test_standard_form_is_one_page_with_footer():
    pdf = build_form_pdf(BASE, "English")
    assert len(PdfReader(io.BytesIO(pdf)).pages) == 1
    assert "Skia" in _producer(pdf)


def test_pdf_falls_back_to_reportlab_when_no_browser(monkeypatch, caplog):
    monkeypatch.setattr(pdf_service, "_working_launch", None)
    monkeypatch.setattr(
        pdf_service, "_launch_candidates", lambda: [{"executable_path": "C:/no/such/browser.exe"}]
    )
    with caplog.at_level("WARNING", logger="formease.pdf"):
        pdf = build_form_pdf(BASE, "English")
    assert pdf.startswith(b"%PDF")
    assert "ReportLab" in _producer(pdf)
    assert any("Chromium PDF rendering unavailable" in record.getMessage() for record in caplog.records)


def test_fallback_pdf_still_contains_every_value():
    pdf = pdf_service._build_with_reportlab(BASE, "English")
    text = "".join(page.extract_text() for page in PdfReader(io.BytesIO(pdf)).pages)
    for value in BASE.values():
        assert value in text
