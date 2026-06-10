# Nautilus Email Builder

A visual, block-based email builder for Nautilus Car Wash — compose, preview, schedule, and send email campaigns with live delivery analytics.

**Live demo: [https://www.trynautilus.space](https://www.trynautilus.space)**

---

## Quick Start

### Prerequisites

- Node.js 20+, Python 3.11+
- A [Resend](https://resend.com) account with a verified sending domain
- A PostgreSQL database (Neon, Supabase, or local)

### 1. Clone & Install

```bash
git clone <your-fork>
cd nautilus-email-builder
```

**Frontend**
```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in vars below
npm run dev
```

**Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python main.py
```

### 2. Environment Variables

**`backend/.env`**

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `RESEND_API_KEY` | API key from Resend dashboard | `re_abc123...` |
| `EMAIL_FROM` | Verified sender address | `noreply@yourdomain.com` |
| `ALLOWED_ORIGINS` | Comma-separated frontend URLs | `http://localhost:3000` |

**`frontend/.env.local`**

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL | `http://localhost:8000` |

> **Domain verification**: The `EMAIL_FROM` domain must be verified in the *same Resend workspace* as your `RESEND_API_KEY`

---

## Features


| Feature | Where |
|---|---|
| **Template library** — 6 pre-built layouts (Welcome, Promo, Newsletter, Announcement, Reactivation, Custom) | `/email/templates` |
| **Block-based builder** — drag to reorder, add/remove header, heading, text, button, image, divider blocks | `/email/builder` |
| **Per-block property editing** — color picker, font size slider, alignment, URL, image src/alt | Builder sidebar |
| **Live preview** — preview panel updates on every block change | Builder right pane |
| **Send email** — recipient field, subject, send-now via Resend | `/email/builder/send` |
| **One-time scheduling** — pick future date/time, Resend queues delivery | Send page → Schedule tab |
| **Scheduled email management** — list, edit full content, cancel | `/email/scheduled` |
| **Contact groups** — create groups, add members, broadcast to a group in one send | `/email/groups` |
| **Analytics dashboard** — sends by day chart, template breakdown, per-email event status (delivered/opened/clicked/bounced) | `/email/analytics` |
| **Recurring emails** — daily/weekly/monthly cadence, pause/resume, delete | Send page → Recurring tab, `/email/scheduled` |
| **Edit scheduled email** — full block edit + reschedule in one PUT | Pencil icon on scheduled row |
| **First-time onboarding tour** — 5-step spotlight tour, localStorage-gated, replayable | Auto on first visit, Info icon in nav |
| **Saved templates** — save any builder state as a named template | Builder toolbar |

---

## Architecture Decisions

### 1. Custom block schema over Puck/React Email

The brief suggested Puck (drag-and-drop) and React Email (rendering). I replaced both with a custom solution for a specific reason: **bridging the two is the core challenge**.

Puck's data model is opaque and SSR-hostile in Next.js App Router. React Email components require a Node.js rendering pipeline that would need a separate `/render` server endpoint or awkward `renderToStaticMarkup` calls in a route handler.

Instead, I defined a minimal `Block` schema (7 types: header, heading, text, button, image, section) stored as JSONB. The `email_renderer.py` function converts blocks to inline-styled HTML at send time on the backend. This means:

- The stored representation is **intent** (blocks), not rendered output
- Blocks survive across template edits — re-render from blocks on every send
- Full TypeScript types from the same schema on the frontend
- Zero SSR/RSC complications

Tradeoff: less rich than React Email's full component set. Acceptable for a car wash app's email needs (header, body, CTA button, footer).

### 2. Resend native scheduling over Temporal

The brief mentioned Temporal for durable scheduling. I used **Resend's built-in `scheduled_at` parameter** for one-time sends instead.

Why: Temporal requires a running daemon (temporal server start-dev), adding significant setup friction for evaluators. Resend already owns delivery — letting it own the schedule too eliminates an entire infrastructure layer.

Tradeoff: editing a scheduled email requires cancel + re-send (two API calls) rather than mutating workflow state. This is handled in `PUT /api/scheduled/{id}`. The cancel is best-effort: if Resend has already started delivery, the cancel fails silently and we proceed with the resend.

### 3. APScheduler for recurring emails

Recurring sends run via **APScheduler `BackgroundScheduler`** — an in-process background thread polling every 5 minutes for due `recurring_emails` rows.

Why over Temporal: zero external dependencies, no worker process to manage. The `next_send_at` column acts as the clock; on each tick, rows where `active = TRUE AND next_send_at <= NOW()` are sent and advanced by their delta (daily +1d, weekly +7d, monthly +30d).

Tradeoff: if the process crashes mid-send, the row's `next_send_at` is not updated and the email sends again on next restart. For a production system, Temporal or Celery Beat with transactional job updates would be correct. For this take-home the failure window (≤5 min) is acceptable.

### 4. Direct SQL over an ORM

`psycopg3` with raw SQL rather than SQLAlchemy or Prisma. The schema is stable (4 tables, all `CREATE IF NOT EXISTS`), queries are simple, and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` handles migrations inline on startup without a migration tool.

Tradeoff: no type-safe query builder, no auto-generated schema from models. Fine for this scope; the DB layer is ~80 lines total.

### 5. localStorage tour gating with versioned key

The onboarding tour is gated by `localStorage.getItem("nautilus_tour_v2")`. The version suffix is intentional: bumping it (→ `v3`) forces the tour to re-show for existing users after a significant UX change. The replay mechanism uses a custom DOM event (`nautilus:replay-tour`) dispatched from the Info icon's popover, avoiding React context or prop drilling through the layout tree.

---

## Challenges

**1. Resend workspace mismatch**  
Emails sending successfully (HTTP 200 from Resend) but not appearing in the dashboard. Root cause: the `RESEND_API_KEY` belonged to a different Resend workspace than where the sending domain was verified. The API accepts the send without error but the email is invisible in the wrong workspace's logs. Fix: ensure key and domain live in the same workspace.

**2. Block serialization round-trip**  
The `blocks` field on `SendEmailRequest` is a `list[Block]` (Pydantic models). Storing to DB requires `json.dumps([b.model_dump() for b in blocks])` (Pydantic v2 — `.dict()` is deprecated). Reading back requires `[Block(**b) for b in blocks_from_db]`. Missing either step causes a `TypeError` or silent loss of block data for the edit flow.

**3. APScheduler + FastAPI lifecycle**  
APScheduler's `BackgroundScheduler` must start after the app is initialized and stop cleanly on shutdown. Using `@app.on_event("startup"/"shutdown")` (FastAPI lifespan hooks) handles this, but the scheduler must not be started before `init_db()` completes — ordering matters.

**4. Tour spotlight positioning**  
CSS `box-shadow: 0 0 0 9999px rgba(0,0,0,0.5)` on a `position: fixed` div achieves the spotlight effect without SVG clip paths or multiple overlay divs. The div is positioned over the target element using `getBoundingClientRect()`, measured in `useLayoutEffect` to avoid flash-of-wrong-position. The tooltip arrow is a rotated square div with two border sides — standard CSS trick but requires careful `arrowLeft` calculation relative to the tooltip container, not the viewport.

**5. Edit-scheduled full-content flow**  
Editing a scheduled email originally only supported rescheduling the time (cancel + resend same HTML). Extending it to full block edit required storing `blocks JSONB` in `email_logs` (added via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) and returning blocks in `GET /api/scheduled/{id}`. Old rows with `blocks = NULL` fall back to fetching the original HTML from Resend's `GET /emails/{id}` endpoint.

---

## Test Strategy

Tests are organized by layer. Each test section below includes the test location and the reasoning for why that case was chosen.

### Running backend tests

```bash
cd backend
source venv/bin/activate
pip install pytest pytest-asyncio httpx
pytest tests/ -v
```

### Running frontend tests

```bash
cd frontend
npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
npx vitest run
```

See `backend/tests/` and `frontend/src/__tests__/` for test files.

---

## Assumptions

1. The "drag-and-drop" requirement is satisfied by the builder's draggable block handles — a full Puck integration would require significant additional work for marginal UX gain over the custom block system.
2. "React Email" components are not used at runtime; the custom `email_renderer.py` produces equivalent inline-styled HTML that all major email clients render correctly.
3. Temporal scheduling is replaced by Resend's native `scheduled_at` for one-time sends and APScheduler for recurring, removing the need for a Temporal daemon.
4. "Mobile preview toggle" is omitted in favor of the recurring email and onboarding tour features, which add more end-to-end value.
5. Image uploads store URLs only (no object storage); images can be pasted as external URLs or data URIs.
