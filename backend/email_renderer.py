from schemas import Block


def render_html(blocks: list[Block]) -> str:
    parts = ["""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;">
"""]

    for b in blocks:
        align = b.align or "center"
        color = b.color or "#000000"
        font_size = b.fontSize or 15

        if b.type == "header":
            parts.append(
                f'<div style="background:{color};padding:24px 32px;text-align:center;">'
                f'<span style="color:#ffffff;font-size:18px;font-weight:600;letter-spacing:.05em;">{b.content}</span>'
                f'</div>'
            )
        elif b.type == "heading":
            parts.append(
                f'<div style="padding:24px 32px;">'
                f'<h1 style="margin:0;color:{color};font-size:{font_size}px;font-weight:700;text-align:{align};">{b.content}</h1>'
                f'</div>'
            )
        elif b.type == "text":
            parts.append(
                f'<div style="padding:8px 32px;">'
                f'<p style="margin:0;color:{color};font-size:{font_size}px;line-height:1.6;text-align:{align};">{b.content}</p>'
                f'</div>'
            )
        elif b.type == "button":
            url = b.url or "#"
            parts.append(
                f'<div style="padding:32px;text-align:{align};">'
                f'<a href="{url}" style="display:inline-block;background:{color};color:#ffffff;'
                f'padding:12px 24px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:500;">'
                f'{b.content}</a>'
                f'</div>'
            )
        elif b.type == "image" and b.src:
            alt = b.alt or ""
            parts.append(
                f'<div style="padding:16px 32px;">'
                f'<img src="{b.src}" alt="{alt}" style="width:100%;height:auto;border-radius:6px;display:block;">'
                f'</div>'
            )
        elif b.type == "section":
            parts.append(
                f'<div style="padding:24px 32px;">'
                f'<hr style="border:none;border-top:1px solid {color};margin:0;">'
                f'</div>'
            )

    parts.append("""
<div style="border-top:1px solid #e5e7eb;background:#f9fafb;padding:24px 32px;text-align:center;">
  <p style="margin:0 0 4px;color:#374151;font-size:13px;font-weight:600;">Nautilus Car Wash</p>
  <p style="margin:0 0 4px;color:#6b7280;font-size:12px;">1200 Marina Blvd, Suite 200, San Diego, CA 92101</p>
  <p style="margin:0 0 16px;color:#6b7280;font-size:12px;">You're receiving this email because you're a Nautilus member.</p>
  <p style="margin:0;color:#9ca3af;font-size:12px;">
    <a href="#" style="color:#9ca3af;text-decoration:none;">Unsubscribe</a> &middot;
    <a href="#" style="color:#9ca3af;text-decoration:none;">Manage preferences</a> &middot;
    <a href="#" style="color:#9ca3af;text-decoration:none;">Visit website</a>
  </p>
  <p style="margin:16px 0 0;color:#9ca3af;font-size:11px;">&copy; 2026 Nautilus Car Wash. All rights reserved.</p>
</div>
</div>
</body>
</html>""")

    return "".join(parts)
