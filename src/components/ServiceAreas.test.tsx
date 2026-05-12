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
});
});
