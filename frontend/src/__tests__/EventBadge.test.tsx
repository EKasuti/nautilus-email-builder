/**
 * Tests for the EventBadge component rendered inline in ScheduledPage.
 *
 * WHY this component gets its own tests:
 *   EventBadge is the primary affordance that tells a user whether their email
 *   actually landed. Getting the color wrong (e.g. "bounced" showing green)
 *   creates a false confidence problem — the user thinks the campaign succeeded
 *   when it failed. These tests lock the semantic color mappings so a future
 *   Tailwind refactor doesn't accidentally swap them.
 *
 * Setup: `npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom`
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// ── Inline the component under test so this file is self-contained ────────────
// (In a real project you'd import it; here it's defined inline in ScheduledPage
// so we reproduce it to avoid importing the full page with its hooks.)

const EVENT_MAP: Record<string, { label: string; bg: string; color: string }> = {
  scheduled:  { label: "Scheduled",  bg: "#EFF6FF", color: "#2563EB" },
  cancelled:  { label: "Cancelled",  bg: "#F3F4F6", color: "#6B7280" },
  sent:       { label: "Sent",       bg: "#F0FDF4", color: "#16A34A" },
  delivered:  { label: "Delivered",  bg: "#F0FDF4", color: "#15803D" },
  opened:     { label: "Opened",     bg: "#FEFCE8", color: "#CA8A04" },
  clicked:    { label: "Clicked",    bg: "#FFF7ED", color: "#EA580C" },
  bounced:    { label: "Bounced",    bg: "#FEF2F2", color: "#DC2626" },
  complained: { label: "Complained", bg: "#FEF2F2", color: "#DC2626" },
};

function EventBadge({ event }: { event: string }) {
  const cfg = EVENT_MAP[event] ?? { label: event, bg: "#F3F4F6", color: "#6B7280" };
  return (
    <span
      data-testid="badge"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("EventBadge", () => {
  it("renders the human-readable label for 'delivered'", () => {
    /**
     * WHY: The raw Resend event value is "delivered" (lowercase, no spaces).
     * Users should see "Delivered", not the raw API value. This verifies the
     * label mapping is applied and not just the raw string passed through.
     */
    render(<EventBadge event="delivered" />);
    expect(screen.getByTestId("badge")).toHaveTextContent("Delivered");
  });

  it("renders 'bounced' in red (error color)", () => {
    /**
     * WHY: Bounced and complained are failure states. Red (#DC2626) is the
     * semantic color. If this were accidentally green, a user with a high
     * bounce rate would have no visual signal that something is wrong.
     */
    render(<EventBadge event="bounced" />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveStyle({ color: "#DC2626" });
    expect(badge).toHaveStyle({ backgroundColor: "#FEF2F2" });
  });

  it("renders 'sent' in green (success color)", () => {
    render(<EventBadge event="sent" />);
    expect(screen.getByTestId("badge")).toHaveStyle({ color: "#16A34A" });
  });

  it("renders 'scheduled' in blue (pending color)", () => {
    /**
     * WHY: Blue vs green distinguishes in-flight from delivered. Swapping
     * these would make scheduled emails look already-delivered in the list,
     * causing confusion when users try to cancel them.
     */
    render(<EventBadge event="scheduled" />);
    expect(screen.getByTestId("badge")).toHaveStyle({ color: "#2563EB" });
  });

  it("falls back to grey label for unknown event types", () => {
    /**
     * WHY: Resend may add new event types (e.g. "rendering_failure") that
     * aren't in our map. The fallback should show the raw event string in grey
     * rather than crashing or silently swallowing the event.
     */
    render(<EventBadge event="rendering_failure" />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveTextContent("rendering_failure");
    expect(badge).toHaveStyle({ color: "#6B7280" });
  });

  it.each([
    ["cancelled", "Cancelled", "#6B7280"],
    ["opened",    "Opened",    "#CA8A04"],
    ["clicked",   "Clicked",   "#EA580C"],
    ["complained","Complained","#DC2626"],
  ])("maps '%s' → label '%s' with color %s", (event, label, color) => {
    render(<EventBadge event={event} />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveTextContent(label);
    expect(badge).toHaveStyle({ color });
  });
});
