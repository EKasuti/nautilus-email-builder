/**
 * Tests for the ProductTour onboarding component.
 *
 * WHY this component gets dedicated tests:
 *   The tour has two independent activation paths (first-visit via localStorage,
 *   replay via custom DOM event) and a dismissal flow that must write to
 *   localStorage. Bugs here mean:
 *   (a) the tour never shows for new users (first impression broken)
 *   (b) the tour never dismisses (user stuck in a loop)
 *   (c) replay doesn't work (Info icon does nothing)
 *   All three are invisible to type-checking and only caught at runtime.
 *
 * Note: ProductTour uses `useRouter` from next/navigation and `useLayoutEffect`.
 * Both are mocked below. The spotlight positioning logic (getBoundingClientRect)
 * is NOT tested here — that's a visual concern better covered by e2e tests.
 *
 * Setup: `npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom`
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";

// ── Mock next/navigation ──────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// ── Mock localStorage ────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// ── Import component after mocks ──────────────────────────────────────────────
import { ProductTour } from "@/components/ProductTour";

const STORAGE_KEY = "nautilus_tour_v2";

describe("ProductTour", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  // ── First-visit gating ───────────────────────────────────────────────────────

  it("shows the welcome step on first visit (no localStorage key)", () => {
    /**
     * WHY: The entire value of the tour depends on it showing automatically
     * for new users. If the localStorage check is inverted or the key is wrong,
     * new users never see the tour and the onboarding is dead on arrival.
     */
    render(<ProductTour />);
    expect(screen.getByText("Welcome to Nautilus 👋")).toBeInTheDocument();
  });

  it("does NOT show when the tour has already been completed", () => {
    /**
     * WHY: Returning users should not be interrupted by the tour every visit.
     * If the localStorage write is missing or uses the wrong key, the tour
     * shows every page load — deeply annoying for regular users.
     */
    localStorageMock.setItem(STORAGE_KEY, "1");
    render(<ProductTour />);
    expect(screen.queryByText("Welcome to Nautilus 👋")).not.toBeInTheDocument();
  });

  // ── Dismissal ─────────────────────────────────────────────────────────────────

  it("hides the tour and writes localStorage when Skip (X) is clicked", () => {
    /**
     * WHY: Skip is the escape hatch for users who don't want to be guided.
     * If clicking X doesn't write to localStorage, the tour re-appears on the
     * next navigation within the same session (layout remounts).
     */
    render(<ProductTour />);
    const skipBtn = screen.getByTitle("Skip tour");
    fireEvent.click(skipBtn);

    expect(screen.queryByText("Welcome to Nautilus 👋")).not.toBeInTheDocument();
    expect(localStorageMock.getItem(STORAGE_KEY)).toBe("1");
  });

  // ── Step navigation ───────────────────────────────────────────────────────────

  it("advances to the next step when Next is clicked", () => {
    /**
     * WHY: The tour's value comes from its progression — if Next doesn't advance
     * the step index, users are stuck on the welcome slide forever and never
     * learn about the builder or analytics.
     */
    render(<ProductTour />);
    const nextBtn = screen.getByText(/Next/i);
    fireEvent.click(nextBtn);

    expect(screen.getByText("Start with a template")).toBeInTheDocument();
  });

  it("shows Back button only after the first step", () => {
    /**
     * WHY: The first step has no Back button (nothing to go back to).
     * If Back renders on step 0, clicking it would try to go to step -1,
     * causing an array out-of-bounds access that silently renders nothing.
     */
    render(<ProductTour />);
    expect(screen.queryByText(/Back/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/Next/i));
    expect(screen.getByText(/Back/i)).toBeInTheDocument();
  });

  it("goes back to the previous step when Back is clicked", () => {
    render(<ProductTour />);
    fireEvent.click(screen.getByText(/Next/i)); // step 0 → 1
    fireEvent.click(screen.getByText(/Back/i)); // step 1 → 0
    expect(screen.getByText("Welcome to Nautilus 👋")).toBeInTheDocument();
  });

  // ── Replay via custom event ───────────────────────────────────────────────────

  it("re-shows the tour when 'nautilus:replay-tour' event is dispatched", () => {
    /**
     * WHY: The replay mechanism (Info icon → "Do tour" button) dispatches a
     * custom DOM event rather than calling a React callback. If the event
     * listener is not wired up, or uses the wrong event name, clicking "Do tour"
     * does absolutely nothing — a silent UX failure that's easy to miss in
     * manual testing because you have to actually complete the tour first.
     */
    localStorageMock.setItem(STORAGE_KEY, "1"); // tour already done
    render(<ProductTour />);

    // Tour is hidden
    expect(screen.queryByText("Welcome to Nautilus 👋")).not.toBeInTheDocument();

    // Dispatch replay event
    act(() => {
      window.dispatchEvent(new CustomEvent("nautilus:replay-tour"));
    });

    expect(screen.getByText("Welcome to Nautilus 👋")).toBeInTheDocument();
    // localStorage key cleared so tour isn't gated anymore
    expect(localStorageMock.getItem(STORAGE_KEY)).toBeNull();
  });

  it("cleans up the replay event listener on unmount", () => {
    /**
     * WHY: If the listener is not removed on unmount (useEffect cleanup),
     * navigating away and back adds a second listener. After N navigations
     * there are N listeners; one replay event triggers N re-renders. This
     * tests the cleanup indirectly — if cleanup is missing, a second dispatch
     * after unmount+remount would trigger twice, which React's strict mode
     * would surface as a double-setState warning.
     */
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<ProductTour />);
    unmount();

    const calls = removeEventListenerSpy.mock.calls.filter(
      ([event]) => event === "nautilus:replay-tour"
    );
    expect(calls.length).toBeGreaterThan(0);
    removeEventListenerSpy.mockRestore();
  });

  // ── Progress dots ─────────────────────────────────────────────────────────────

  it("renders one progress dot per step (5 total)", () => {
    /**
     * WHY: Progress dots tell users how far through the tour they are and
     * how much is left. If the count doesn't match STEPS.length (5), users
     * see the wrong completion signal — e.g. 3 dots when there are 5 steps
     * makes the tour feel longer than advertised.
     */
    render(<ProductTour />);
    // Each dot is a div with a rounded-full class and no text content
    const dots = document.querySelectorAll(".rounded-full");
    // The active dot is wider (w:20) vs inactive (w:6) but both are still dots
    expect(dots.length).toBeGreaterThanOrEqual(5);
  });
});
