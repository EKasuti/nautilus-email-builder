"""
Shared pytest fixtures.

Strategy: patch both the database layer and the Resend client at the module level
so tests are hermetic — no real DB or network calls needed. This lets the test
suite run in CI without any external services.
"""

import json
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient


# ── Shared Resend mock ────────────────────────────────────────────────────────

class FakeResendEmails:
    @staticmethod
    def send(params):
        return {"id": "fake-resend-id-001"}

    @staticmethod
    def get(resend_id):
        return {"id": resend_id, "last_event": "delivered", "html": "<p>test</p>"}

    @staticmethod
    def cancel(resend_id):
        return {"object": "email", "id": resend_id}


# ── Shared DB cursor mock ─────────────────────────────────────────────────────

def _make_cursor(fetchone_val=None, fetchall_val=None):
    cur = MagicMock()
    cur.__enter__ = lambda s: s
    cur.__exit__ = MagicMock(return_value=False)
    cur.fetchone.return_value = fetchone_val
    cur.fetchall.return_value = fetchall_val or []
    return cur


def _make_conn(cursor):
    conn = MagicMock()
    conn.__enter__ = lambda s: s
    conn.__exit__ = MagicMock(return_value=False)
    conn.cursor.return_value = cursor
    return conn


@pytest.fixture()
def client():
    """
    Return a TestClient with Resend and get_conn mocked out.
    The app is imported fresh here so patches are applied before startup.
    """
    with (
        patch("resend.Emails", FakeResendEmails),
        patch("main.resend.Emails", FakeResendEmails),
        patch("main.init_db"),
        patch("main.scheduler"),
    ):
        from main import app
        with TestClient(app, raise_server_exceptions=True) as c:
            yield c
