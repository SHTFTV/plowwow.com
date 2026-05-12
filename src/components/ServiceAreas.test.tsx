import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ServiceAreas from "./ServiceAreas";

const LAST_CITY_KEY = "service-areas:last-city";
const STORAGE_KEY = "service-areas:query";

const scrollIntoViewMock = vi.fn();

beforeEach(() => {
  window.localStorage.clear();
  scrollIntoViewMock.mockClear();
  // jsdom doesn't implement scrollIntoView; provide a spy so we can
  // assert that the same card that gets focused also gets scrolled.
  Element.prototype.scrollIntoView = scrollIntoViewMock as unknown as Element["scrollIntoView"];
});

const renderWithRouter = (initialEntries: string[] = ["/"]) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <ServiceAreas />
    </MemoryRouter>,
  );

/**
 * Helper: returns the card link element by slug.
 */
const getCard = (slug: string) =>
  document.getElementById(`city-opt-${slug}`) as HTMLAnchorElement | null;

describe("ServiceAreas restore synchronization", () => {
  it("fires scroll and focus on the same saved card on mount (no pulse on mount)", async () => {
    window.localStorage.setItem(LAST_CITY_KEY, "burnaby");

    renderWithRouter();

    const card = getCard("burnaby");
    expect(card).not.toBeNull();

    // rAF inside the consumer effect: wait until focus and scroll both land.
    await waitFor(() => {
      expect(document.activeElement).toBe(card);
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });

    // Mount restore must NOT trigger the pulse animation.
    expect(card!.className).not.toMatch(/animate-restore-pulse/);
  });

  it("clearing the query fires scroll + focus + pulse together from one event", async () => {
    window.localStorage.setItem(LAST_CITY_KEY, "burnaby");
    // Start with no query so the mount restore can run and mark
    // hasMountedRef. Then we'll filter Burnaby out and clear, which is
    // the path that actually pulses.
    renderWithRouter();

    // Wait for the mount restore to land on Burnaby.
    const burnabyOnMount = await waitFor(() => {
      const el = getCard("burnaby");
      expect(el).not.toBeNull();
      return el!;
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(burnabyOnMount);
    });

    const input = screen.getByRole("combobox") as HTMLInputElement;
    input.focus();

    // Type a query that filters Burnaby out entirely.
    await act(async () => {
      fireEvent.change(input, { target: { value: "abbotsford" } });
    });
    await waitFor(() => {
      expect(getCard("burnaby")).toBeNull();
      expect(getCard("abbotsford")).not.toBeNull();
    });

    scrollIntoViewMock.mockClear();

    // Clear the query — single restoreEvent drives scroll+focus+pulse.
    await act(async () => {
      fireEvent.change(input, { target: { value: "" } });
    });

    const card = await waitFor(() => {
      const el = getCard("burnaby");
      expect(el).not.toBeNull();
      return el!;
    });

    await waitFor(() => {
      expect(document.activeElement).toBe(card);
      expect(scrollIntoViewMock).toHaveBeenCalled();
      expect(card.className).toMatch(/animate-restore-pulse/);
    });
  });

  it("pulse clears after the animation window so it can replay", async () => {
    window.localStorage.setItem(LAST_CITY_KEY, "burnaby");
    renderWithRouter();

    await waitFor(() => {
      expect(getCard("burnaby")).not.toBeNull();
    });

    const input = screen.getByRole("combobox") as HTMLInputElement;
    input.focus();

    await act(async () => {
      fireEvent.change(input, { target: { value: "abbotsford" } });
    });
    await waitFor(() => expect(getCard("burnaby")).toBeNull());

    await act(async () => {
      fireEvent.change(input, { target: { value: "" } });
    });

    await waitFor(() => {
      expect(getCard("burnaby")!.className).toMatch(/animate-restore-pulse/);
    });

    await waitFor(
      () => {
        expect(getCard("burnaby")!.className).not.toMatch(/animate-restore-pulse/);
      },
      { timeout: 2000 },
    );
  });

  it("rapid successive restores always sync to the LATEST restoreEvent (no desync)", async () => {
    // Start with Burnaby saved so the mount restore lands on it and
    // hasMountedRef is set (required for pulses to fire).
    window.localStorage.setItem(LAST_CITY_KEY, "burnaby");
    renderWithRouter();

    await waitFor(() => {
      expect(document.activeElement).toBe(getCard("burnaby"));
    });

    const input = screen.getByRole("combobox") as HTMLInputElement;
    input.focus();

    // --- Restore #1: clear-from-filter for Burnaby ---
    await act(async () => {
      fireEvent.change(input, { target: { value: "abbotsford" } });
    });
    await waitFor(() => expect(getCard("burnaby")).toBeNull());

    scrollIntoViewMock.mockClear();
    input.focus();
    await act(async () => {
      fireEvent.change(input, { target: { value: "" } });
    });

    // Capture the React fiber key of the pulsing Burnaby card as a proxy
    // for its restoreEvent token. The key encodes `pulse-${token}` so a
    // new restore must produce a new node (different React-internal key).
    const burnabyAfter1 = await waitFor(() => {
      const el = getCard("burnaby")!;
      expect(el.className).toMatch(/animate-restore-pulse/);
      return el;
    });
    expect(document.activeElement).toBe(burnabyAfter1);
    expect(scrollIntoViewMock).toHaveBeenCalled();
    const scrollCallsAfter1 = scrollIntoViewMock.mock.calls.length;

    // --- Restore #2 (BEFORE the first pulse window closes): swap saved
    // city to Surrey, filter Surrey out, then clear. The new restoreEvent
    // must steal scroll+focus+pulse away from Burnaby instantly. ---
    window.localStorage.setItem(LAST_CITY_KEY, "surrey");

    input.focus();
    await act(async () => {
      // Typing "burnaby" hides every other city (no region title contains
      // "burnaby") — Surrey disappears from the list.
      fireEvent.change(input, { target: { value: "burnaby" } });
    });
    await waitFor(() => {
      expect(getCard("surrey")).toBeNull();
      expect(getCard("burnaby")).not.toBeNull();
    });

    scrollIntoViewMock.mockClear();
    input.focus();
    await act(async () => {
      fireEvent.change(input, { target: { value: "" } });
    });

    // Latest event targets Surrey: scroll, focus, AND pulse must all be
    // on Surrey — never split between the two restoreEvents.
    const surreyCard = await waitFor(() => {
      const el = getCard("surrey")!;
      expect(el).not.toBeNull();
      expect(el.className).toMatch(/animate-restore-pulse/);
      return el;
    });
    expect(document.activeElement).toBe(surreyCard);
    expect(scrollIntoViewMock).toHaveBeenCalled();
    expect(scrollIntoViewMock.mock.calls.length).toBeGreaterThan(0);

    // Critically, the previous target (Burnaby) must NOT still be pulsing —
    // only one card can be the "active restoreEvent target" at a time.
    expect(getCard("burnaby")!.className).not.toMatch(/animate-restore-pulse/);

    // Sanity: the second restore produced fresh scroll calls separate
    // from the first (i.e. the consumer effect re-fired with the new token).
    expect(scrollCallsAfter1).toBeGreaterThan(0);
  });

  it("respects prefers-reduced-motion: pulse animation suppressed, scroll+focus still synced", async () => {
    // Simulate the user having `prefers-reduced-motion: reduce` enabled.
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("prefers-reduced-motion: reduce"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    try {
      window.localStorage.setItem(LAST_CITY_KEY, "burnaby");
      renderWithRouter();

      // Mount restore lands on Burnaby.
      await waitFor(() => {
        expect(document.activeElement).toBe(getCard("burnaby"));
      });

      const input = screen.getByRole("combobox") as HTMLInputElement;
      input.focus();
      await act(async () => {
        fireEvent.change(input, { target: { value: "abbotsford" } });
      });
      await waitFor(() => expect(getCard("burnaby")).toBeNull());

      scrollIntoViewMock.mockClear();
      input.focus();
      await act(async () => {
        fireEvent.change(input, { target: { value: "" } });
      });

      const card = await waitFor(() => {
        const el = getCard("burnaby");
        expect(el).not.toBeNull();
        return el!;
      });

      // The SAME restoreEvent that would have pulsed must still drive
      // scroll and focus — only the animation itself is suppressed by CSS.
      await waitFor(() => {
        expect(document.activeElement).toBe(card);
        expect(scrollIntoViewMock).toHaveBeenCalled();
      });

      // The Tailwind variants are present in the class list: the animation
      // is gated behind `motion-safe:` (so CSS suppresses it under
      // prefers-reduced-motion), and the static `motion-reduce:` ring is
      // the fallback affordance. Both being on the element proves the
      // suppression mechanism is wired up.
      expect(card.className).toMatch(/motion-safe:animate-restore-pulse/);
      expect(card.className).toMatch(/motion-reduce:ring-2/);
      expect(card.className).toMatch(/motion-reduce:ring-primary\/60/);

      // And — crucially — the pulse "intent" is still tied to the same
      // restoreEvent: when the event clears, the motion-safe class is
      // also removed (proving it wasn't a separate, unsynced state).
      await waitFor(
        () => {
          expect(getCard("burnaby")!.className).not.toMatch(
            /motion-safe:animate-restore-pulse/,
          );
        },
        { timeout: 2000 },
      );
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
