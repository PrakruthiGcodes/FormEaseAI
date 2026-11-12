"""PDF generation.

The PDF contains every form field. It is only built after all fields are
present and valid (the route checks this first).

Two rendering engines:

* Chromium (preferred). The form is laid out as HTML and printed by a real
  browser through Playwright. Browsers shape Indic scripts correctly, so Telugu
  vowel signs (matras) and conjuncts appear in the right place. The browser is
  the bundled Playwright Chromium if installed (`playwright install chromium`),
  otherwise the installed Microsoft Edge or Google Chrome. Set PDF_BROWSER_PATH
  to use a specific Chromium executable.

* ReportLab (fallback). Used only when no browser can be started. ReportLab
  does not do complex-script shaping, so Indic text can look wrong. A warning is
  logged whenever this fallback is used.

Fonts: Chromium uses the system's Nirmala UI (Windows), which covers Hindi,
Kannada, Telugu and other Indian scripts, with Noto fallbacks. ReportLab uses
Nirmala when present and Helvetica otherwise.
"""

import html
import io
import logging
import os
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.schemas.chat import FIELD_LABELS, FORM_FIELDS

logger = logging.getLogger("formease.pdf")

NIRMALA_PATH = Path("C:/Windows/Fonts/Nirmala.ttc")
BLUE = colors.HexColor("#2563eb")
PURPLE = colors.HexColor("#7c3aed")
LIGHT = colors.HexColor("#f5f3ff")
GRID = colors.HexColor("#e2e8f0")

# Font stack for the browser. Nirmala UI is installed with Windows; the Noto
# fonts cover Linux/macOS machines that have them. Chromium falls back per character.
BROWSER_FONT_STACK = (
    "'Nirmala UI', 'Noto Sans Telugu', 'Noto Sans Kannada', 'Noto Sans Devanagari', "
    "'Segoe UI', Arial, sans-serif"
)


class BrowserUnavailable(Exception):
    """No Chromium-based browser could be started for PDF rendering."""


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _check_complete(values: dict) -> None:
    missing = [field for field in FORM_FIELDS if not values.get(field)]
    if missing:
        raise ValueError(f"Missing fields: {', '.join(missing)}")


def _text(value: str) -> str:
    """Escape text for markup (ReportLab Paragraph or HTML) and keep line breaks."""
    return html.escape(value).replace("\n", "<br/>")


def _generated_on() -> str:
    return datetime.now().strftime("%d %B %Y, %H:%M")


# ---------------------------------------------------------------------------
# Chromium rendering (preferred)
# ---------------------------------------------------------------------------

_CSS = """
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #ffffff; }
body { width: 170mm; font-family: __FONT__; color: #0f172a; font-size: 11pt; }
h1 { color: #2563eb; font-size: 20pt; font-weight: 700; text-align: center; margin: 0 0 4px; }
.subtitle { color: #64748b; font-size: 10pt; text-align: center; margin: 0 0 14px; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
td { border: 0.5pt solid #e2e8f0; padding: 7px 8px; vertical-align: middle; text-align: left; }
td.label { width: 52mm; background: #f5f3ff; color: #7c3aed; font-size: 10pt; font-weight: 700; line-height: 13pt; }
td.value { font-size: 11pt; line-height: 15pt; word-wrap: break-word; }
tr { page-break-inside: avoid; }
.note { color: #64748b; font-size: 8.5pt; line-height: 11pt; margin-top: 12px; }
"""


def _build_html(values: dict, language_name: str) -> str:
    rows = "\n".join(
        f'<tr><td class="label">{_text(FIELD_LABELS[field])}</td>'
        f'<td class="value">{_text(str(values[field]))}</td></tr>'
        for field in FORM_FIELDS
    )
    css = _CSS.replace("__FONT__", BROWSER_FONT_STACK)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>FormEase AI - Completed Form</title>
<style>{css}</style>
</head>
<body>
<h1>FormEase AI</h1>
<div class="subtitle">Completed Application Form</div>
<table>
<colgroup><col style="width: 52mm"><col></colgroup>
{rows}
</table>
<div class="note">Form language: {_text(language_name)}. Generated on {_generated_on()}.
Please check every detail before submitting this form.</div>
</body>
</html>"""


_FOOTER_TEMPLATE = (
    f"<div style=\"width:100%; font-family:{BROWSER_FONT_STACK}; font-size:8px; "
    "color:#94a3b8; text-align:center;\">"
    "FormEase AI &middot; Page <span class=\"pageNumber\"></span></div>"
)

# Launch options tried in order. The first that works is remembered for this process.
_working_launch: dict | None = None


def _launch_candidates() -> list[dict]:
    candidates: list[dict] = []
    custom = os.getenv("PDF_BROWSER_PATH", "").strip()
    if custom:
        candidates.append({"executable_path": custom})
    candidates += [{}, {"channel": "msedge"}, {"channel": "chrome"}]
    return candidates


def _launch_browser(playwright):
    global _working_launch
    candidates = [_working_launch] if _working_launch is not None else _launch_candidates()
    for kwargs in candidates:
        try:
            browser = playwright.chromium.launch(**kwargs)
        except Exception:
            continue
        _working_launch = kwargs
        return browser
    raise BrowserUnavailable("No Chromium browser could be started for PDF rendering.")


_MEASURE_VALUE_CELLS_JS = """() => Array.from(document.querySelectorAll('td.value')).map(td => {
    const r = td.getBoundingClientRect();
    return [r.left, r.top + window.scrollY, r.width, r.height];
})"""

# Printable area in points (A4 minus the margins used by Playwright below).
_MARGIN_LEFT_PT = 20 * mm
_MARGIN_TOP_PT = 18 * mm
_CONTENT_HEIGHT_PT = A4[1] - 2 * (18 * mm)
_CSS_PX_TO_PT = 0.75  # 96 CSS pixels per inch, 72 points per inch


def _render_with_browser(html_doc: str, rows: list[tuple[str, str]]) -> bytes:
    # Imported here so the module still loads when Playwright is not installed.
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        browser = _launch_browser(playwright)
        try:
            page = browser.new_page(viewport={"width": 643, "height": 1000})
            page.set_content(html_doc, wait_until="load")
            page.emulate_media(media="print")
            cells = page.evaluate(_MEASURE_VALUE_CELLS_JS)
            pdf = page.pdf(
                format="A4",
                print_background=True,
                margin={"top": "18mm", "bottom": "18mm", "left": "20mm", "right": "20mm"},
                display_header_footer=True,
                header_template="<span></span>",
                footer_template=_FOOTER_TEMPLATE,
            )
        finally:
            browser.close()
    return _add_text_layer(pdf, [(text, box) for (_, text), box in zip(rows, cells)])


def _add_text_layer(pdf_bytes: bytes, items: list[tuple[str, list[float]]]) -> bytes:
    """Add the exact field values as invisible text, positioned over the printed cells.

    Browsers print Indic scripts as shaped glyph runs, and their text layer does
    not always extract back to the typed characters. The visible page stays the
    browser's; this invisible layer (ReportLab, render mode 3) keeps search,
    copy and screen readers working on the exact Unicode the user typed.
    Skipped when Nirmala UI is not available, because ReportLab then cannot
    encode these characters.
    """
    if FONT != "FormEaseUnicode" or not items:
        return pdf_bytes

    from pypdf import PdfReader, PdfWriter  # runtime dependency, see requirements.txt

    base = PdfReader(io.BytesIO(pdf_bytes))
    overlay_buffer = io.BytesIO()
    canvas_obj = canvas.Canvas(overlay_buffer, pagesize=A4)
    overlay_pages = 0
    for text, (left_px, top_px, _width_px, height_px) in items:
        text = " ".join(str(text).split())
        if not text:
            continue
        top_pt = top_px * _CSS_PX_TO_PT
        page_index = int(top_pt // _CONTENT_HEIGHT_PT)
        while overlay_pages <= page_index:
            if overlay_pages:
                canvas_obj.showPage()
            overlay_pages += 1
        y_in_page = top_pt - page_index * _CONTENT_HEIGHT_PT
        baseline_from_top = _MARGIN_TOP_PT + y_in_page + height_px * _CSS_PX_TO_PT / 2 + 4
        text_object = canvas_obj.beginText()
        text_object.setTextRenderMode(3)  # invisible
        text_object.setFont(FONT, 11)
        text_object.setTextOrigin(_MARGIN_LEFT_PT + left_px * _CSS_PX_TO_PT + 8, A4[1] - baseline_from_top)
        text_object.textOut(text)
        canvas_obj.drawText(text_object)
    canvas_obj.save()

    overlay = PdfReader(io.BytesIO(overlay_buffer.getvalue()))
    writer = PdfWriter(clone_from=base)
    for index, page in enumerate(writer.pages):
        if index < len(overlay.pages):
            page.merge_page(overlay.pages[index])
    writer.add_metadata({key: str(value) for key, value in (base.metadata or {}).items()})
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


# ---------------------------------------------------------------------------
# ReportLab rendering (fallback)
# ---------------------------------------------------------------------------

def _register_fonts() -> tuple[str, str]:
    """Return (regular font name, bold font name). Falls back to Helvetica."""
    if NIRMALA_PATH.exists():
        try:
            pdfmetrics.registerFont(TTFont("FormEaseUnicode", str(NIRMALA_PATH), subfontIndex=0))
            pdfmetrics.registerFont(TTFont("FormEaseUnicodeBold", str(NIRMALA_PATH), subfontIndex=1))
            return "FormEaseUnicode", "FormEaseUnicodeBold"
        except Exception:
            pass  # fall through to the built-in font
    return "Helvetica", "Helvetica-Bold"


FONT, FONT_BOLD = _register_fonts()


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("title", parent=base["Title"], fontName=FONT_BOLD,
                                fontSize=20, textColor=BLUE, alignment=TA_CENTER, spaceAfter=4),
        "subtitle": ParagraphStyle("subtitle", parent=base["Normal"], fontName=FONT,
                                   fontSize=10, textColor=colors.HexColor("#64748b"),
                                   alignment=TA_CENTER, spaceAfter=14),
        "label": ParagraphStyle("label", parent=base["Normal"], fontName=FONT_BOLD,
                                fontSize=10, textColor=PURPLE, leading=13),
        "value": ParagraphStyle("value", parent=base["Normal"], fontName=FONT,
                                fontSize=11, leading=15),
        "note": ParagraphStyle("note", parent=base["Normal"], fontName=FONT,
                               fontSize=8.5, textColor=colors.HexColor("#64748b"), leading=11),
    }


def _build_with_reportlab(values: dict, language_name: str) -> bytes:
    styles = _styles()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="FormEase AI - Completed Form",
        author="FormEase AI",
    )

    rows = []
    for field in FORM_FIELDS:
        rows.append([
            Paragraph(_text(FIELD_LABELS[field]), styles["label"]),
            Paragraph(_text(str(values[field])), styles["value"]),
        ])
    table = Table(rows, colWidths=[52 * mm, doc.width - 52 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), LIGHT),
        ("GRID", (0, 0), (-1, -1), 0.5, GRID),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))

    story = [
        Paragraph("FormEase AI", styles["title"]),
        Paragraph("Completed Application Form", styles["subtitle"]),
        table,
        Spacer(1, 12),
        Paragraph(
            f"Form language: {_text(language_name)}. Generated on {_generated_on()}. "
            "Please check every detail before submitting this form.",
            styles["note"],
        ),
    ]

    def _footer(canvas, _doc):
        canvas.saveState()
        canvas.setFont(FONT, 8)
        canvas.setFillColor(colors.HexColor("#94a3b8"))
        canvas.drawCentredString(A4[0] / 2, 10 * mm, f"FormEase AI  ·  Page {canvas.getPageNumber()}")
        canvas.restoreState()

    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
    return buffer.getvalue()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_form_pdf(values: dict, language_name: str = "English") -> bytes:
    """Build the PDF bytes from validated form values.

    `values` must contain a non-empty value for every field in FORM_FIELDS.
    """
    _check_complete(values)
    rows = [(FIELD_LABELS[field], str(values[field])) for field in FORM_FIELDS]
    try:
        return _render_with_browser(_build_html(values, language_name), rows)
    except Exception as exc:  # no browser, or a browser failure: fall back to ReportLab
        # Log the exception type only: browser errors can include file paths.
        logger.warning(
            "Chromium PDF rendering unavailable (%s). Using the ReportLab fallback, "
            "which does not shape Indic scripts correctly.",
            type(exc).__name__,
        )
        return _build_with_reportlab(values, language_name)
