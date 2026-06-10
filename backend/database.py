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
                    send_mode   TEXT NOT NULL DEFAULT 'now',
                    status      TEXT NOT NULL DEFAULT 'sent',
                    sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
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
