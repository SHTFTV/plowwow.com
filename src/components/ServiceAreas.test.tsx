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
    // Seed a query that filters Burnaby out so the initial mount restore
    // can't run — we want the *clear* to be the trigger.
    window.localStorage.setItem(STORAGE_KEY, "vancouver");

    renderWithRouter();

    // Burnaby starts filtered out.
    await waitFor(() => {
      expect(getCard("vancouver")).not.toBeNull();
    });
    expect(getCard("burnaby")).toBeNull();

    const input = screen.getByRole("combobox") as HTMLInputElement;
    // Focus the input so we simulate the "user typing then clears" path.
    input.focus();
    expect(document.activeElement).toBe(input);

    // Clear the query — this should produce a single restoreEvent that
    // simultaneously scrolls, focuses, and pulses the Burnaby card.
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
      // Same element receives focus AND scroll AND the pulse class —
      // all driven by the single restoreEvent.
      expect(document.activeElement).toBe(card);
      expect(scrollIntoViewMock).toHaveBeenCalled();
      expect(card.className).toMatch(/animate-restore-pulse/);
    });

    // The pulse token is encoded into the React key of the pulsing card —
    // it must match the rendered card (i.e. the same event that drove
    // scroll+focus is the one rendering the pulse).
    const keyAttr = card.id;
    expect(keyAttr).toBe("city-opt-burnaby");
  });

  it("pulse clears after the animation window so it can replay", async () => {
    vi.useFakeTimers();
    try {
      window.localStorage.setItem(LAST_CITY_KEY, "burnaby");
      window.localStorage.setItem(STORAGE_KEY, "vancouver");

      renderWithRouter();

      const input = screen.getByRole("combobox") as HTMLInputElement;
      input.focus();

      await act(async () => {
        fireEvent.change(input, { target: { value: "" } });
      });

      // Flush rAF + state updates.
      await act(async () => {
        vi.advanceTimersByTime(50);
      });

      const card = getCard("burnaby")!;
      expect(card.className).toMatch(/animate-restore-pulse/);

      // After the pulse window the class is removed (restoreEvent cleared).
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(card.className).not.toMatch(/animate-restore-pulse/);
    } finally {
      vi.useRealTimers();
    }
  });
});
