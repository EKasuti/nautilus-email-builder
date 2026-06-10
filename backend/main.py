import json
import os
from datetime import datetime, timedelta, timezone

import resend
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from database import init_db, get_conn
from schemas import Block, SendEmailRequest, SendEmailResponse
from email_renderer import render_html

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "")

app = FastAPI(title="Nautilus Email Builder API")

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler = BackgroundScheduler()


def _process_recurring():
    now = datetime.now(timezone.utc)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, email_to, subject, template, blocks, frequency
                FROM recurring_emails
                WHERE active = TRUE AND next_send_at <= %s
            """, (now,))
            due = cur.fetchall()

    for rec_id, email_to, subject, template, blocks, frequency in due:
        try:
            html = render_html([Block(**b) for b in (blocks or [])])
            response = resend.Emails.send({
                "from": EMAIL_FROM,
                "to": [email_to],
                "subject": subject,
                "html": html,
            })
            resend_id = response.get("id") if isinstance(response, dict) else getattr(response, "id", None)
            delta = {"daily": timedelta(days=1), "weekly": timedelta(weeks=1), "monthly": timedelta(days=30)}.get(frequency, timedelta(weeks=1))
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO email_logs (resend_id, template, subject, from_email, to_email, send_mode, status, blocks)
                        VALUES (%s, %s, %s, %s, %s, 'recurring', 'sent', %s)
                    """, (resend_id, template, subject, EMAIL_FROM, email_to, json.dumps(blocks or [])))
                    cur.execute("UPDATE recurring_emails SET next_send_at = %s WHERE id = %s", (now + delta, rec_id))
        except Exception as e:
            print(f"[Recurring] Failed to send #{rec_id}: {e}")


@app.on_event("startup")
def startup():
    init_db()
    scheduler.add_job(_process_recurring, "interval", minutes=5, id="recurring")
    scheduler.start()


@app.on_event("shutdown")
def shutdown():
    scheduler.shutdown(wait=False)


@app.get("/")
def root():
    return {"message": "Welcome to the Nautilus Email Builder API"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/config")
def config():
    return {"from_email": EMAIL_FROM}


@app.get("/api/templates")
def list_templates():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, blocks, created_at FROM saved_templates ORDER BY created_at DESC")
            rows = cur.fetchall()
    return [{"id": r[0], "name": r[1], "blocks": r[2], "created_at": r[3].isoformat()} for r in rows]


@app.post("/api/templates", status_code=201)
def save_template(payload: dict):
    name = payload.get("name", "").strip()
    blocks = payload.get("blocks", [])
    if not name:
        raise HTTPException(status_code=400, detail="Template name is required.")
    import json
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO saved_templates (name, blocks) VALUES (%s, %s) RETURNING id",
                (name, json.dumps(blocks)),
            )
            new_id = cur.fetchone()[0]
    return {"id": new_id, "name": name}


@app.get("/api/groups")
def list_groups():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT g.slug, g.name, COUNT(m.id) AS member_count
                FROM groups g
                LEFT JOIN members m ON m.group_slug = g.slug
                GROUP BY g.slug, g.name
                ORDER BY g.id
            """)
            rows = cur.fetchall()
    return [{"id": row[0], "name": row[1], "count": row[2]} for row in rows]


@app.post("/api/send", response_model=SendEmailResponse)
def send_email(payload: SendEmailRequest):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="RESEND_API_KEY is not configured.")
    if not EMAIL_FROM:
        raise HTTPException(status_code=500, detail="EMAIL_FROM is not configured.")

    html = render_html(payload.blocks)

    resend_params: dict = {
        "from": EMAIL_FROM,
        "to": [payload.to],
        "subject": payload.subject,
        "html": html,
    }
    if payload.send_mode == "schedule" and payload.scheduled_at:
        resend_params["scheduled_at"] = payload.scheduled_at

    try:
        response = resend.Emails.send(resend_params)
    except resend.exceptions.ResendError as e:
        raise HTTPException(status_code=502, detail=f"Resend error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

    resend_id = response.get("id") if isinstance(response, dict) else getattr(response, "id", None)
    status = "scheduled" if payload.send_mode == "schedule" else "sent"

    blocks_json = json.dumps([b.model_dump() for b in payload.blocks])
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO email_logs
                        (resend_id, template, subject, from_email, to_email, send_mode, status, scheduled_at, blocks)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (resend_id, payload.template, payload.subject, EMAIL_FROM, payload.to,
                     payload.send_mode, status, payload.scheduled_at, blocks_json),
                )
    except Exception as e:
        print(f"[DB] Failed to log email: {e}")

    msg = f"Email scheduled for {payload.to}" if payload.send_mode == "schedule" else f"Email sent to {payload.to}"
    return SendEmailResponse(success=True, id=resend_id, message=msg)


@app.get("/api/scheduled")
def scheduled():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, resend_id, subject, to_email, template, send_mode, status, sent_at, scheduled_at
                FROM email_logs
                WHERE send_mode = 'schedule'
                ORDER BY COALESCE(scheduled_at, sent_at) ASC
            """)
            rows = cur.fetchall()

    enriched = []
    for row in rows:
        log_id, resend_id, subject, to_email, template, send_mode, status, sent_at, scheduled_at = row
        last_event = status
        if resend_id:
            try:
                result = resend.Emails.get(resend_id)
                last_event = result.get("last_event", status) if isinstance(result, dict) else status
            except Exception:
                pass
        enriched.append({
            "id": log_id,
            "resend_id": resend_id,
            "subject": subject,
            "to": to_email,
            "template": template or "custom",
            "mode": send_mode,
            "last_event": last_event,
            "sent_at": sent_at.isoformat(),
            "scheduled_at": scheduled_at.isoformat() if scheduled_at else None,
        })

    return enriched


@app.get("/api/scheduled/{log_id}")
def get_scheduled(log_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, resend_id, subject, to_email, template, status, scheduled_at, blocks
                FROM email_logs WHERE id = %s AND send_mode = 'schedule'
            """, (log_id,))
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Scheduled email not found.")
    log_id, resend_id, subject, to_email, template, status, scheduled_at, blocks = row
    return {
        "id": log_id,
        "resend_id": resend_id,
        "subject": subject,
        "to": to_email,
        "template": template or "custom",
        "status": status,
        "scheduled_at": scheduled_at.isoformat() if scheduled_at else None,
        "blocks": blocks or [],
    }


@app.put("/api/scheduled/{log_id}", status_code=200)
def update_scheduled(log_id: int, payload: dict):
    blocks = payload.get("blocks", [])
    subject = payload.get("subject", "").strip()
    to_email = payload.get("to", "").strip()
    scheduled_at = payload.get("scheduled_at", "").strip()
    if not subject or not to_email or not scheduled_at:
        raise HTTPException(status_code=400, detail="subject, to, and scheduled_at are required.")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT resend_id, template FROM email_logs WHERE id = %s AND send_mode = 'schedule'", (log_id,))
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Scheduled email not found.")
    old_resend_id, template = row
    if old_resend_id:
        try:
            resend.Emails.cancel(old_resend_id)
        except Exception:
            pass
    html = render_html([Block(**b) for b in blocks]) if blocks else ""
    if not html:
        try:
            orig = resend.Emails.get(old_resend_id)
            html = orig.get("html", "") if isinstance(orig, dict) else getattr(orig, "html", "")
        except Exception:
            raise HTTPException(status_code=502, detail="Could not retrieve original email content.")
    try:
        response = resend.Emails.send({"from": EMAIL_FROM, "to": [to_email], "subject": subject, "html": html, "scheduled_at": scheduled_at})
    except resend.exceptions.ResendError as e:
        raise HTTPException(status_code=502, detail=f"Resend error: {str(e)}")
    new_resend_id = response.get("id") if isinstance(response, dict) else getattr(response, "id", None)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE email_logs
                SET resend_id = %s, subject = %s, to_email = %s, status = 'scheduled',
                    scheduled_at = %s, blocks = %s
                WHERE id = %s
            """, (new_resend_id, subject, to_email, scheduled_at, json.dumps(blocks), log_id))
    return {"success": True, "id": new_resend_id}


@app.delete("/api/scheduled/{log_id}", status_code=200)
def cancel_scheduled(log_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT resend_id FROM email_logs WHERE id = %s AND send_mode = 'schedule'", (log_id,))
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Scheduled email not found.")
    resend_id = row[0]
    if resend_id:
        try:
            resend.Emails.cancel(resend_id)
        except Exception:
            pass
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE email_logs SET status = 'cancelled' WHERE id = %s", (log_id,))
    return {"success": True}


@app.patch("/api/scheduled/{log_id}/reschedule", status_code=200)
def reschedule_email(log_id: int, payload: dict):
    new_scheduled_at = payload.get("scheduled_at", "").strip()
    if not new_scheduled_at:
        raise HTTPException(status_code=400, detail="scheduled_at is required.")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT resend_id, subject, to_email FROM email_logs WHERE id = %s AND send_mode = 'schedule'",
                (log_id,),
            )
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Scheduled email not found.")
    resend_id, subject, to_email = row
    try:
        original = resend.Emails.get(resend_id)
        html = original.get("html") if isinstance(original, dict) else getattr(original, "html", "")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not retrieve original email: {e}")
    try:
        resend.Emails.cancel(resend_id)
    except Exception:
        pass
    try:
        response = resend.Emails.send({
            "from": EMAIL_FROM,
            "to": [to_email],
            "subject": subject,
            "html": html,
            "scheduled_at": new_scheduled_at,
        })
    except resend.exceptions.ResendError as e:
        raise HTTPException(status_code=502, detail=f"Resend error: {str(e)}")
    new_resend_id = response.get("id") if isinstance(response, dict) else getattr(response, "id", None)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE email_logs SET resend_id = %s, status = 'scheduled', scheduled_at = %s WHERE id = %s",
                (new_resend_id, new_scheduled_at, log_id),
            )
    return {"success": True, "id": new_resend_id}


@app.get("/api/recurring")
def list_recurring():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, email_to, subject, template, frequency, next_send_at, active, created_at FROM recurring_emails ORDER BY created_at DESC")
            rows = cur.fetchall()
    return [{"id": r[0], "email_to": r[1], "subject": r[2], "template": r[3] or "custom", "frequency": r[4], "next_send_at": r[5].isoformat(), "active": r[6], "created_at": r[7].isoformat()} for r in rows]


@app.post("/api/recurring", status_code=201)
def create_recurring(payload: dict):
    email_to   = payload.get("email_to", "").strip()
    subject    = payload.get("subject", "").strip()
    template   = payload.get("template", "custom")
    blocks     = payload.get("blocks", [])
    frequency  = payload.get("frequency", "weekly")
    next_send  = payload.get("next_send_at", "").strip()
    if not email_to or not subject or not next_send:
        raise HTTPException(status_code=400, detail="email_to, subject, and next_send_at are required.")
    if frequency not in ("daily", "weekly", "monthly"):
        raise HTTPException(status_code=400, detail="frequency must be daily, weekly, or monthly.")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO recurring_emails (email_to, subject, template, blocks, frequency, next_send_at)
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
            """, (email_to, subject, template, json.dumps(blocks), frequency, next_send))
            new_id = cur.fetchone()[0]
    return {"id": new_id, "email_to": email_to, "subject": subject, "frequency": frequency}


@app.delete("/api/recurring/{rec_id}", status_code=200)
def delete_recurring(rec_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM recurring_emails WHERE id = %s RETURNING id", (rec_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Recurring email not found.")
    return {"success": True}


@app.patch("/api/recurring/{rec_id}/toggle", status_code=200)
def toggle_recurring(rec_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE recurring_emails SET active = NOT active WHERE id = %s RETURNING active", (rec_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Recurring email not found.")
    return {"active": row[0]}


@app.get("/api/analytics")
def analytics():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, resend_id, subject, to_email, template, send_mode, status, sent_at
                FROM email_logs
                ORDER BY sent_at DESC
            """)
            rows = cur.fetchall()

            cur.execute("SELECT COUNT(*) FROM members")
            total_members = cur.fetchone()[0]

    # Enrich with live Resend status
    enriched = []
    for row in rows:
        log_id, resend_id, subject, to_email, template, send_mode, status, sent_at = row
        last_event = status
        if resend_id:
            try:
                result = resend.Emails.get(resend_id)
                last_event = result.get("last_event", status) if isinstance(result, dict) else status
            except Exception:
                pass
        enriched.append({
            "resend_id": resend_id,
            "subject": subject,
            "to": to_email,
            "template": template or "custom",
            "mode": send_mode,
            "last_event": last_event,
            "sent_at": sent_at.isoformat(),
        })

    # Aggregate
    total_sent = len(enriched)
    unique_recipients = len({e["to"] for e in enriched})

    event_counts: dict[str, int] = {}
    for e in enriched:
        event_counts[e["last_event"]] = event_counts.get(e["last_event"], 0) + 1

    by_template: dict[str, int] = {}
    for e in enriched:
        by_template[e["template"]] = by_template.get(e["template"], 0) + 1

    sends_by_day: dict[str, int] = {}
    for e in enriched:
        day = e["sent_at"][:10]
        sends_by_day[day] = sends_by_day.get(day, 0) + 1

    return {
        "total_sent": total_sent,
        "unique_recipients": unique_recipients,
        "total_members": total_members,
        "event_counts": event_counts,
        "sends_by_day": [{"date": d, "sent": c} for d, c in sorted(sends_by_day.items())],
        "by_template": [{"template": t, "count": c} for t, c in sorted(by_template.items(), key=lambda x: -x[1])],
        "recent": enriched[:10],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
