# Email Builder with Drag & Drop

**Nautilus Engineering · Full-Stack Engineer Take-Home**

## Getting Started

### Option A: Fork (recommended)

1. Click **Fork** on this repo to create your own copy
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/nautilus-email-builder.git
   cd nautilus-email-builder
   ```

### Option B: Clone directly

```bash
git clone https://github.com/xxxoooxoxo/nautilus-email-builder.git
cd nautilus-email-builder
```

> **⚠️ Important:** Do **not** push to this repository. Work on your own fork or a local copy only. If you cloned directly, remove the remote before starting:
> ```bash
> git remote remove origin
> ```

---

## Overview

A visual email builder that lets users compose, preview, and send emails using a drag-and-drop interface.

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 15+ (App Router) | Application framework |
| TypeScript (strict) | Type safety |
| React Email | Email-safe components |
| Resend | Email delivery |
| Puck Editor | Drag & drop builder |
| Temporal | Durable scheduling |

## Setup

```bash
# Install dependencies
npm install

# Copy env vars
cp .env.example .env.local
# Fill in your RESEND_API_KEY, etc.

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) |
| `RESEND_FROM_EMAIL` | Sender email address (default: `onboarding@resend.dev`) |
| `TEMPORAL_ADDRESS` | Temporal server address (default: `localhost:7233`) |

### Temporal (for scheduling)

```bash
# Install Temporal CLI: https://docs.temporal.io/cli
temporal server start-dev
```

## Requirements

### Tier 1 — Must Have

- **Drag & Drop Email Builder** — Puck editor with React Email components (Button, Heading, Text, Image, Container, Section)
- **Component Property Editing** — Sidebar editing for colors, typography, sizing, image URLs, content & links
- **Live Email Preview** — Real-time preview updating as users edit
- **Email Sending** — Send via Resend with recipient input, subject line, status notifications

### Tier 2 — Expected

- **Email Scheduling** — Durable workflow via Temporal with date/time picker, scheduled email list, cancellation
- **Desktop & Mobile Preview** — Toggle between preview widths

### Tier 3 — Impress Us

- Undo / redo
- Starter template library (Welcome Email, Newsletter, Promo)
- Image upload, dark mode, keyboard shortcuts

## Architecture Decisions

<!-- Document your decisions here as you build -->

## Assumptions

<!-- Document assumptions here -->

## Time Spent

<!-- Track your time here -->

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Puck Editor](https://puckeditor.com)
- [React Email](https://react.email)
- [Resend](https://resend.com)
- [Temporal](https://temporal.io)
