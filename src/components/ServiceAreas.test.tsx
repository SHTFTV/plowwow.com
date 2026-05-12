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
    // Seed a query that filters Burnaby out entirely (no match on city
    // name, slug, or any region title containing "burnaby" / the query).
    // "abbotsford" only matches Abbotsford in Fraser Valley.
    window.localStorage.setItem(STORAGE_KEY, "abbotsford");

    renderWithRouter();

    await waitFor(() => {
      expect(getCard("abbotsford")).not.toBeNull();
    });
    expect(getCard("burnaby")).toBeNull();

    const input = screen.getByRole("combobox") as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);

    scrollIntoViewMock.mockClear();
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
    window.localStorage.setItem(STORAGE_KEY, "abbotsford");

    renderWithRouter();

    const input = screen.getByRole("combobox") as HTMLInputElement;
    input.focus();

    await act(async () => {
      fireEvent.change(input, { target: { value: "" } });
    });

    const card = await waitFor(() => {
      const el = getCard("burnaby");
      expect(el).not.toBeNull();
      return el!;
    });

    await waitFor(() => {
      expect(card.className).toMatch(/animate-restore-pulse/);
    });

    // restoreEvent auto-clears at 950ms.
    await waitFor(
      () => {
        expect(getCard("burnaby")!.className).not.toMatch(/animate-restore-pulse/);
      },
      { timeout: 2000 },
    );
  });
});
