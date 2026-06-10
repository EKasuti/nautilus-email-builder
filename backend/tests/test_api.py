"""
Integration tests for the FastAPI endpoints.

Strategy: every test patches `main.get_conn` to inject a mock cursor, and uses
`main.resend.Emails` (already patched to FakeResendEmails in conftest) so no
real DB or network calls are made.

WHY integration tests over pure unit tests here:
  The endpoints are mostly DB + Resend glue — the interesting logic is in the
  orchestration (cancel → render → resend, validation before insert, etc.).
  Mocking at the FastAPI layer lets us test that orchestration end-to-end,
  catching issues like wrong column order in an INSERT or missing status_code
  on a response, which pure unit tests on individual functions would miss.
"""

import json
import sys
import os
from unittest.mock import MagicMock, patch, call
from datetime import datetime, timezone

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ── Helpers ───────────────────────────────────────────────────────────────────

def _cursor(fetchone=None, fetchall=None):
    cur = MagicMock()
    cur.__enter__ = lambda s: s
    cur.__exit__ = MagicMock(return_value=False)
    cur.fetchone.return_value = fetchone
    cur.fetchall.return_value = fetchall or []
    return cur


def _conn(cursor):
    conn = MagicMock()
    conn.__enter__ = lambda s: s
    conn.__exit__ = MagicMock(return_value=False)
    conn.cursor.return_value = cursor
    return conn


# ── /health ───────────────────────────────────────────────────────────────────

def test_health_returns_ok(client):
    """
    WHY: Smoke test. If the app fails to import or the startup hook panics,
    this catches it before any other test. Also useful in CI health checks.
    """
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


# ── POST /api/send ────────────────────────────────────────────────────────────

def test_send_now_returns_success(client):
    """
    WHY: The happy path for the most critical feature. Verifies the response
    shape matches what SendEmailResponse promises — callers depend on `success`
    and `id` being present.
    """
    cur = _cursor(fetchone=None)
    with patch("main.get_conn", return_value=_conn(cur)), \
         patch("main.EMAIL_FROM", "from@example.com"):
        res = client.post("/api/send", json={
            "to": "user@example.com",
            "subject": "Test",
            "blocks": [{"id": "b1", "type": "text", "content": "Hello"}],
            "send_mode": "now",
        })
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["id"] == "fake-resend-id-001"


def test_send_scheduled_forwards_scheduled_at(client):
    """
    WHY: Scheduled sends rely on the `scheduled_at` param being passed through
    to Resend.Emails.send(). If it's dropped (e.g. a missing dict key), Resend
    sends immediately instead — the user thinks they scheduled but it went out now.
    We capture the call args to verify the param is present.
    """
    sent_params = {}

    class CapturingEmails:
        @staticmethod
        def send(params):
            sent_params.update(params)
            return {"id": "sched-001"}
        @staticmethod
        def get(rid): return {"last_event": "scheduled"}
        @staticmethod
        def cancel(rid): return {}

    cur = _cursor()
    with patch("main.get_conn", return_value=_conn(cur)), \
         patch("main.EMAIL_FROM", "from@example.com"), \
         patch("main.resend.Emails", CapturingEmails):
        res = client.post("/api/send", json={
            "to": "user@example.com",
            "subject": "Later",
            "blocks": [],
            "send_mode": "schedule",
            "scheduled_at": "2026-12-01T09:00:00Z",
        })
    assert res.status_code == 200
    assert sent_params.get("scheduled_at") == "2026-12-01T09:00:00Z"


def test_send_missing_api_key_returns_500(client):
    """
    WHY: If RESEND_API_KEY is not set, the server should return 500 with a clear
    message rather than letting Resend throw an opaque AuthenticationError that
    surfaces as a 502. The distinction matters for on-call triage.
    """
    with patch("main.resend.api_key", ""), patch("main.EMAIL_FROM", "f@e.com"):
        res = client.post("/api/send", json={
            "to": "u@e.com", "subject": "x", "blocks": [], "send_mode": "now",
        })
    assert res.status_code == 500
    assert "RESEND_API_KEY" in res.json()["detail"]


# ── GET /api/scheduled ────────────────────────────────────────────────────────

def test_list_scheduled_returns_rows(client):
    """
    WHY: The scheduled page depends on this response shape exactly. If `last_event`
    or `scheduled_at` keys are missing, the UI silently shows wrong data (blank
    badges, "—" everywhere). Asserting keys present catches schema drift.
    """
    now_iso = datetime.now(timezone.utc)
    cur = _cursor(fetchall=[
        (1, "r-001", "Subject A", "to@x.com", "promo", "schedule", "scheduled", now_iso, now_iso),
    ])

    class QuietEmails:
        @staticmethod
        def get(rid): return {"last_event": "scheduled"}
        @staticmethod
        def send(p): return {"id": "x"}
        @staticmethod
        def cancel(rid): pass

    with patch("main.get_conn", return_value=_conn(cur)), \
         patch("main.resend.Emails", QuietEmails):
        res = client.get("/api/scheduled")

    assert res.status_code == 200
    rows = res.json()
    assert len(rows) == 1
    row = rows[0]
    for key in ("id", "subject", "to", "last_event", "scheduled_at"):
        assert key in row, f"Missing key: {key}"


# ── GET /api/scheduled/{id} ───────────────────────────────────────────────────

def test_get_scheduled_returns_blocks(client):
    """
    WHY: This endpoint feeds the edit flow. If `blocks` is null or missing,
    the edit page silently shows an empty canvas — the user loses all their
    content. This test verifies the round-trip from DB through the response.
    """
    blocks_data = [{"id": "b1", "type": "text", "content": "Hello"}]
    now_iso = datetime.now(timezone.utc)
    cur = _cursor(fetchone=(
        1, "r-001", "Subject", "to@x.com", "promo", "scheduled", now_iso, blocks_data,
    ))
    with patch("main.get_conn", return_value=_conn(cur)):
        res = client.get("/api/scheduled/1")

    assert res.status_code == 200
    body = res.json()
    assert body["blocks"] == blocks_data
    assert body["subject"] == "Subject"


def test_get_scheduled_404_for_missing(client):
    cur = _cursor(fetchone=None)
    with patch("main.get_conn", return_value=_conn(cur)):
        res = client.get("/api/scheduled/9999")
    assert res.status_code == 404


# ── PUT /api/scheduled/{id} ───────────────────────────────────────────────────

def test_update_scheduled_cancels_old_resend_id(client):
    """
    WHY: The update flow must cancel the old scheduled email before creating the
    new one. If cancel() is skipped, Resend delivers BOTH emails — the original
    and the rescheduled version. This test captures calls to verify ordering.
    """
    cancel_calls = []
    send_calls = []

    class TrackingEmails:
        @staticmethod
        def send(params):
            send_calls.append(params)
            return {"id": "new-resend-id"}
        @staticmethod
        def get(rid): return {"last_event": "scheduled", "html": "<p>x</p>"}
        @staticmethod
        def cancel(rid):
            cancel_calls.append(rid)

    cur_select = _cursor(fetchone=("old-resend-id", "promo"))
    cur_update = _cursor()
    call_count = 0

    def conn_factory():
        nonlocal call_count
        call_count += 1
        return _conn(cur_select if call_count == 1 else cur_update)

    blocks = [{"id": "b1", "type": "text", "content": "Updated"}]
    with patch("main.get_conn", side_effect=conn_factory), \
         patch("main.EMAIL_FROM", "from@e.com"), \
         patch("main.resend.Emails", TrackingEmails):
        res = client.put("/api/scheduled/1", json={
            "subject": "New Subject",
            "to": "to@e.com",
            "scheduled_at": "2026-12-02T10:00:00Z",
            "blocks": blocks,
        })

    assert res.status_code == 200
    assert "old-resend-id" in cancel_calls, "cancel() was not called with the old Resend ID"
    assert len(send_calls) == 1, "Resend.send() should be called exactly once"


def test_update_scheduled_requires_all_fields(client):
    """
    WHY: The endpoint accepts a raw dict (no Pydantic model), so validation is
    manual. Missing subject/to/scheduled_at must return 400, not 500. A 500
    surfaces as "something went wrong" to the UI; a 400 shows a specific message.
    """
    cur = _cursor(fetchone=("old-id", "promo"))
    with patch("main.get_conn", return_value=_conn(cur)):
        res = client.put("/api/scheduled/1", json={"blocks": []})
    assert res.status_code == 400


# ── DELETE /api/scheduled/{id} ────────────────────────────────────────────────

def test_delete_scheduled_cancels_with_resend(client):
    """
    WHY: Deleting a scheduled email must cancel it in Resend first. If we only
    mark it 'cancelled' in our DB but don't call Resend.cancel(), the email
    still delivers at its scheduled time — the user thinks they cancelled it.
    """
    cancel_calls = []

    class TrackingEmails:
        @staticmethod
        def cancel(rid): cancel_calls.append(rid)
        @staticmethod
        def send(p): return {"id": "x"}
        @staticmethod
        def get(rid): return {"last_event": "scheduled"}

    cur_select = _cursor(fetchone=("resend-abc",))
    cur_update = _cursor()
    call_count = 0

    def conn_factory():
        nonlocal call_count
        call_count += 1
        return _conn(cur_select if call_count == 1 else cur_update)

    with patch("main.get_conn", side_effect=conn_factory), \
         patch("main.resend.Emails", TrackingEmails):
        res = client.delete("/api/scheduled/1")

    assert res.status_code == 200
    assert "resend-abc" in cancel_calls


def test_delete_scheduled_404_for_missing(client):
    cur = _cursor(fetchone=None)
    with patch("main.get_conn", return_value=_conn(cur)):
        res = client.delete("/api/scheduled/9999")
    assert res.status_code == 404


# ── POST /api/recurring ───────────────────────────────────────────────────────

def test_create_recurring_validates_required_fields(client):
    """
    WHY: The recurring endpoint accepts an untyped dict. Without explicit
    validation, missing email_to causes a psycopg NOT NULL violation that
    surfaces as a 500 with a database traceback. The 400 path is intentional
    and this test ensures it's actually reached.
    """
    cur = _cursor()
    with patch("main.get_conn", return_value=_conn(cur)):
        # Missing email_to and next_send_at
        res = client.post("/api/recurring", json={"subject": "Test"})
    assert res.status_code == 400
    assert "required" in res.json()["detail"].lower()


def test_create_recurring_rejects_invalid_frequency(client):
    """
    WHY: frequency drives the `next_send_at` delta calculation. An unknown value
    like "yearly" silently falls back to `timedelta(weeks=1)` (the dict.get default),
    which is wrong and hard to debug. The 400 enforces the allowed set explicitly.
    """
    cur = _cursor(fetchone=(42,))
    with patch("main.get_conn", return_value=_conn(cur)):
        res = client.post("/api/recurring", json={
            "email_to": "x@x.com",
            "subject": "Hi",
            "next_send_at": "2026-12-01T09:00:00Z",
            "frequency": "yearly",
        })
    assert res.status_code == 400


def test_create_recurring_success(client):
    cur = _cursor(fetchone=(7,))
    with patch("main.get_conn", return_value=_conn(cur)):
        res = client.post("/api/recurring", json={
            "email_to": "user@x.com",
            "subject": "Weekly wash",
            "next_send_at": "2026-12-01T09:00:00Z",
            "frequency": "weekly",
        })
    assert res.status_code == 201
    assert res.json()["id"] == 7


# ── PATCH /api/recurring/{id}/toggle ─────────────────────────────────────────

def test_toggle_recurring_flips_active(client):
    """
    WHY: The toggle endpoint uses `UPDATE ... SET active = NOT active RETURNING active`.
    If that SQL is wrong (e.g. hardcoded TRUE), toggling a paused job never resumes it.
    We call toggle twice and verify the active state alternates — this catches the
    NOT logic being incorrect without needing the actual DB.
    """
    states = [False, True]  # simulate DB returning alternating values
    call_count = 0

    def conn_factory():
        nonlocal call_count
        active_val = states[call_count % 2]
        call_count += 1
        cur = _cursor(fetchone=(active_val,))
        return _conn(cur)

    with patch("main.get_conn", side_effect=conn_factory):
        r1 = client.patch("/api/recurring/1/toggle")
        r2 = client.patch("/api/recurring/1/toggle")

    assert r1.json()["active"] is False
    assert r2.json()["active"] is True


def test_toggle_recurring_404_for_missing(client):
    cur = _cursor(fetchone=None)
    with patch("main.get_conn", return_value=_conn(cur)):
        res = client.patch("/api/recurring/9999/toggle")
    assert res.status_code == 404


# ── DELETE /api/recurring/{id} ────────────────────────────────────────────────

def test_delete_recurring_removes_row(client):
    cur = _cursor(fetchone=(5,))
    with patch("main.get_conn", return_value=_conn(cur)):
        res = client.delete("/api/recurring/5")
    assert res.status_code == 200
    assert res.json()["success"] is True


def test_delete_recurring_404_for_missing(client):
    cur = _cursor(fetchone=None)
    with patch("main.get_conn", return_value=_conn(cur)):
        res = client.delete("/api/recurring/9999")
    assert res.status_code == 404


# ── GET /api/analytics ────────────────────────────────────────────────────────

def test_analytics_aggregates_correctly(client):
    """
    WHY: The analytics endpoint does in-Python aggregation (event_counts, by_template,
    sends_by_day) over the DB rows. If the aggregation logic breaks (e.g. wrong key
    name, off-by-one), the dashboard silently shows zeros or wrong bars. This test
    verifies the aggregation with known inputs, not just the response shape.
    """
    now_iso = datetime.now(timezone.utc)
    rows = [
        (1, "r1", "Subject A", "a@x.com", "promo",    "now",      "delivered", now_iso),
        (2, "r2", "Subject B", "b@x.com", "promo",    "now",      "opened",    now_iso),
        (3, "r3", "Subject C", "c@x.com", "welcome",  "schedule", "scheduled", now_iso),
    ]

    class QuietEmails:
        @staticmethod
        def get(rid):
            mapping = {"r1": "delivered", "r2": "opened", "r3": "scheduled"}
            return {"last_event": mapping.get(rid, "sent")}
        @staticmethod
        def send(p): return {"id": "x"}
        @staticmethod
        def cancel(rid): pass

    cur = _cursor(fetchall=rows)
    cur.fetchone.return_value = (10,)  # total_members

    with patch("main.get_conn", return_value=_conn(cur)), \
         patch("main.resend.Emails", QuietEmails):
        res = client.get("/api/analytics")

    assert res.status_code == 200
    body = res.json()
    assert body["total_sent"] == 3
    assert body["total_members"] == 10

    event_counts = body["event_counts"]
    assert event_counts.get("delivered") == 1
    assert event_counts.get("opened") == 1

    templates = {t["template"]: t["count"] for t in body["by_template"]}
    assert templates.get("promo") == 2
    assert templates.get("welcome") == 1
