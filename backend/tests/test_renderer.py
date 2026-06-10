"""
Unit tests for email_renderer.render_html().

WHY this layer gets its own test file:
  render_html() is the core architectural seam between stored JSON blocks and
  what recipients actually see. A regression here (e.g. a missing f-string
  variable, wrong CSS property) produces a broken email silently — FastAPI
  still returns 200, Resend still delivers it, but recipients see garbled HTML.
  Unit tests here catch that class of bug before any network calls are made.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from email_renderer import render_html
from schemas import Block


def _block(**kwargs) -> Block:
    defaults = {"id": "b1", "type": "text", "content": "hello"}
    defaults.update(kwargs)
    return Block(**defaults)


# ── Header block ──────────────────────────────────────────────────────────────

def test_header_block_uses_color_as_background():
    """
    WHY: The header block's color maps to background-color, not font color.
    This is the opposite of the text block, and easy to swap. If swapped, the
    header renders as white-on-white (invisible text on white background).
    """
    html = render_html([_block(type="header", content="Nautilus", color="#0EA5E9")])
    assert "background:#0EA5E9" in html
    assert "color:#ffffff" in html


def test_header_block_content_present():
    html = render_html([_block(type="header", content="Summer Sale")])
    assert "Summer Sale" in html


# ── Heading block ─────────────────────────────────────────────────────────────

def test_heading_uses_font_size():
    """
    WHY: font-size is user-controlled via the builder slider. If the template
    literal drops the px suffix or uses a hardcoded size, user customisation is
    silently ignored — the email looks different from the builder preview.
    """
    html = render_html([_block(type="heading", content="Hello", fontSize=28)])
    assert "font-size:28px" in html


def test_heading_uses_align():
    html = render_html([_block(type="heading", content="Centered", align="center")])
    assert "text-align:center" in html

    html = render_html([_block(type="heading", content="Left", align="left")])
    assert "text-align:left" in html


# ── Text block ────────────────────────────────────────────────────────────────

def test_text_block_renders_content():
    html = render_html([_block(type="text", content="Join us today")])
    assert "Join us today" in html


def test_text_block_color():
    """
    WHY: Color defaults to #000000 when omitted. Tests that the fallback is applied
    so emails don't render without any color style (email clients vary in defaults).
    """
    html = render_html([_block(type="text", content="x", color=None)])
    assert "color:#000000" in html


# ── Button block ──────────────────────────────────────────────────────────────

def test_button_renders_anchor_tag():
    """
    WHY: Buttons must be <a> tags with href, not <button> elements.
    Email clients strip or misrender <button>; only <a> is universally supported.
    If this changes, CTAs silently break across all email clients.
    """
    html = render_html([_block(type="button", content="Book now", url="https://example.com")])
    assert '<a href="https://example.com"' in html
    assert "Book now" in html


def test_button_url_defaults_to_hash():
    html = render_html([_block(type="button", content="Click", url=None)])
    assert 'href="#"' in html


def test_button_uses_color_as_background():
    html = render_html([_block(type="button", content="Go", color="#16A34A", url="#")])
    assert "background:#16A34A" in html


# ── Image block ───────────────────────────────────────────────────────────────

def test_image_renders_img_tag():
    """
    WHY: Images are the most common block type in promotional emails. If src is
    missing from the output the image is invisible; if alt is missing, accessibility
    tools flag the email as non-compliant.
    """
    html = render_html([_block(type="image", src="https://cdn.example.com/car.jpg", alt="Red car", content="")])
    assert 'src="https://cdn.example.com/car.jpg"' in html
    assert 'alt="Red car"' in html


def test_image_without_src_is_omitted():
    """
    WHY: An <img> with no src is a broken image icon in every email client.
    The renderer should skip the block entirely rather than emit broken HTML.
    """
    html = render_html([_block(type="image", src=None, content="")])
    assert "<img" not in html


# ── Section (divider) block ───────────────────────────────────────────────────

def test_section_renders_hr_style():
    html = render_html([_block(type="section", color="#E5E7EB", content="")])
    assert "border-top:1px solid #E5E7EB" in html


# ── Footer is always present ──────────────────────────────────────────────────

def test_footer_always_appended():
    """
    WHY: CAN-SPAM / GDPR require an unsubscribe link in every commercial email.
    The footer is the only place it appears. If render_html drops the footer for
    any reason, the company is liable.
    """
    html = render_html([_block(type="text", content="x")])
    assert "Unsubscribe" in html
    assert "Nautilus Car Wash" in html


# ── Multiple blocks ───────────────────────────────────────────────────────────

def test_multiple_blocks_all_present():
    """
    WHY: render_html loops over blocks; an off-by-one or early return would drop
    trailing blocks. This verifies the full list is rendered.
    """
    blocks = [
        _block(id="b1", type="header", content="Header text"),
        _block(id="b2", type="text", content="Body text"),
        _block(id="b3", type="button", content="CTA", url="#"),
    ]
    html = render_html(blocks)
    assert "Header text" in html
    assert "Body text" in html
    assert "CTA" in html


def test_empty_blocks_still_has_footer():
    html = render_html([])
    assert "Nautilus Car Wash" in html
    assert "<body" in html
