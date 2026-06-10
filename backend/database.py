import os
import psycopg
from contextlib import contextmanager

@contextmanager
def get_conn():
    conn = psycopg.connect(os.getenv("DATABASE_URL", ""))
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS email_logs (
                    id          SERIAL PRIMARY KEY,
                    resend_id   TEXT,
                    template    TEXT,
                    subject     TEXT NOT NULL,
                    from_email  TEXT NOT NULL,
                    to_email    TEXT NOT NULL,
                    send_mode    TEXT NOT NULL DEFAULT 'now',
                    status       TEXT NOT NULL DEFAULT 'sent',
                    sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    scheduled_at TIMESTAMPTZ
                )
            """)
            cur.execute("""
                ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS groups (
                    id    SERIAL PRIMARY KEY,
                    slug  TEXT UNIQUE NOT NULL,
                    name  TEXT NOT NULL
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS members (
                    id         SERIAL PRIMARY KEY,
                    email      TEXT UNIQUE NOT NULL,
                    name       TEXT,
                    group_slug TEXT REFERENCES groups(slug),
                    joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS saved_templates (
                    id         SERIAL PRIMARY KEY,
                    name       TEXT NOT NULL,
                    blocks     JSONB NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
            cur.execute("ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS blocks JSONB")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS recurring_emails (
                    id           SERIAL PRIMARY KEY,
                    email_to     TEXT NOT NULL,
                    subject      TEXT NOT NULL,
                    template     TEXT,
                    blocks       JSONB NOT NULL DEFAULT '[]',
                    frequency    TEXT NOT NULL DEFAULT 'weekly',
                    next_send_at TIMESTAMPTZ NOT NULL,
                    active       BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
