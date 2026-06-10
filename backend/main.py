import os
import resend
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from database import init_db, get_conn
from schemas import SendEmailRequest, SendEmailResponse
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


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def root():
    return {"message": "Welcome to the Nautilus Email Builder API"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/config")
def config():
    return {"from_email": EMAIL_FROM}


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

    try:
        response = resend.Emails.send({
            "from": EMAIL_FROM,
            "to": [payload.to],
            "subject": payload.subject,
            "html": html,
        })
    except resend.exceptions.ResendError as e:
        raise HTTPException(status_code=502, detail=f"Resend error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

    resend_id = response.get("id") if isinstance(response, dict) else getattr(response, "id", None)

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO email_logs (resend_id, template, subject, from_email, to_email, send_mode, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (resend_id, payload.template, payload.subject, EMAIL_FROM, payload.to, payload.send_mode, "sent"),
                )
    except Exception as e:
        # Don't fail the request if DB logging fails — email was already sent
        print(f"[DB] Failed to log email: {e}")

    return SendEmailResponse(success=True, id=resend_id, message=f"Email sent to {payload.to}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
