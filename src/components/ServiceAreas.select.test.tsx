import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import ServiceAreas from "./ServiceAreas";

const LAST_CITY_KEY = "service-areas:last-city";

beforeEach(() => {
  window.localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn() as unknown as Element["scrollIntoView"];
});

/**
 * Test harness that renders ServiceAreas plus a tiny "location probe" so
 * we can assert navigation happened from a key press.
 */
const LocationProbe = () => {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
};

const renderHarness = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <ServiceAreas />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

const card = (slug: string) =>
  document.getElementById(`city-opt-${slug}`) as HTMLAnchorElement | null;

describe("ServiceAreas Enter/Space selection", () => {
  it("Enter on the focused option selects it, closes the listbox, and returns focus to the combobox", async () => {
    window.localStorage.setItem(LAST_CITY_KEY, "vancouver");
    renderHarness();

    // Mount restore lands on Vancouver.
    const vancouver = await waitFor(() => {
      const el = card("vancouver");
      expect(el).not.toBeNull();
      expect(document.activeElement).toBe(el);
      return el!;
    });
    expect(vancouver.getAttribute("aria-selected")).toBe("true");

    // Move focus to Burnaby via arrows.
    await act(async () => {
      fireEvent.keyDown(vancouver, { key: "ArrowDown" });
    });
    await act(async () => {
      fireEvent.keyDown(card("west-vancouver")!, { key: "ArrowDown" });
    });
    await act(async () => {
      fireEvent.keyDown(card("north-vancouver")!, { key: "ArrowDown" });
    });
    await waitFor(() => expect(document.activeElement).toBe(card("burnaby")));
    expect(card("burnaby")!.getAttribute("aria-selected")).toBe("true");
    // Previously-active option is no longer selected.
    expect(vancouver.getAttribute("aria-selected")).toBe("false");

    // Press Enter → selects Burnaby.
    await act(async () => {
      fireEvent.keyDown(card("burnaby")!, { key: "Enter" });
    });

    // 1) Navigation happened (selection took effect).
    await waitFor(() => {
      expect(screen.getByTestId("loc").textContent).toBe("/burnaby");
    });

    // 2) localStorage records the selection.
    expect(window.localStorage.getItem(LAST_CITY_KEY)).toBe("burnaby");

    // 3) Listbox is closed (cards are no longer rendered).
    await waitFor(() => {
      expect(card("burnaby")).toBeNull();
      expect(document.querySelector('[role="listbox"]')).toBeNull();
    });

    // 4) Focus returned to the combobox.
    const combobox = screen.getByRole("combobox");
    expect(document.activeElement).toBe(combobox);
  });

  it("Space on the focused option behaves identically to Enter", async () => {
    window.localStorage.setItem(LAST_CITY_KEY, "richmond");
    renderHarness();

    const richmond = await waitFor(() => {
      const el = card("richmond");
      expect(el).not.toBeNull();
      expect(document.activeElement).toBe(el);
      return el!;
    });
    expect(richmond.getAttribute("aria-selected")).toBe("true");

    // Press Space directly on the focused (restored) option.
    await act(async () => {
      fireEvent.keyDown(richmond, { key: " " });
    });

    await waitFor(() => {
      expect(screen.getByTestId("loc").textContent).toBe("/richmond");
    });
    expect(window.localStorage.getItem(LAST_CITY_KEY)).toBe("richmond");

    await waitFor(() => {
      expect(card("richmond")).toBeNull();
      expect(document.querySelector('[role="listbox"]')).toBeNull();
    });

    expect(document.activeElement).toBe(screen.getByRole("combobox"));
  });

  it.each([
    { key: "Enter", saved: "burnaby" },
    { key: " ", saved: "richmond" },
  ])(
    "$key flips aria-expanded to false and it stays false after focus returns to the combobox",
    async ({ key, saved }) => {
      window.localStorage.setItem(LAST_CITY_KEY, saved);
      renderHarness();

      // Before selection: listbox is open → aria-expanded="true".
      const combobox = await waitFor(() => {
        const cb = screen.getByRole("combobox");
        expect(cb.getAttribute("aria-expanded")).toBe("true");
        return cb;
      });

      const focusedCard = await waitFor(() => {
        const el = card(saved);
        expect(el).not.toBeNull();
        expect(document.activeElement).toBe(el);
        return el!;
      });

      // Press the selection key on the focused option.
      await act(async () => {
        fireEvent.keyDown(focusedCard, { key });
      });

      // Wait for listbox to close.
      await waitFor(() => {
        expect(card(saved)).toBeNull();
      });

      // aria-expanded must be "false" once collapsed.
      expect(combobox.getAttribute("aria-expanded")).toBe("false");

      // Focus has returned to the combobox …
      expect(document.activeElement).toBe(combobox);
      // … and aria-expanded MUST remain "false" (no re-open on focus).
      expect(combobox.getAttribute("aria-expanded")).toBe("false");

      // Belt-and-braces: fire an explicit focus event to make sure the
      // onFocus handler doesn't flip it back open.
      await act(async () => {
        fireEvent.focus(combobox);
      });
      expect(combobox.getAttribute("aria-expanded")).toBe("false");
    },
  );

  it("Escape closes the listbox, flips aria-expanded to false, and it stays false when focus returns to the combobox", async () => {
    window.localStorage.setItem(LAST_CITY_KEY, "burnaby");
    renderHarness();

    const combobox = await waitFor(() => {
      const cb = screen.getByRole("combobox");
      // Initial state: results visible → aria-expanded="true".
      expect(cb.getAttribute("aria-expanded")).toBe("true");
      return cb;
    });

    const burnaby = await waitFor(() => {
      const el = card("burnaby");
      expect(el).not.toBeNull();
      expect(document.activeElement).toBe(el);
      return el!;
    });

    // Press Escape on the focused option.
    await act(async () => {
      fireEvent.keyDown(burnaby, { key: "Escape" });
    });

    // Listbox unmounts.
    await waitFor(() => {
      expect(card("burnaby")).toBeNull();
      expect(document.querySelector('[role="listbox"]')).toBeNull();
    });

    // aria-expanded flipped to "false".
    expect(combobox.getAttribute("aria-expanded")).toBe("false");

    // Focus has returned to the combobox.
    expect(document.activeElement).toBe(combobox);

    // aria-expanded must REMAIN "false" — the onFocus auto-expand is
    // suppressed after Escape, just like after Enter/Space selection.
    expect(combobox.getAttribute("aria-expanded")).toBe("false");

    // Belt-and-braces: re-fire focus on the combobox. Must still be closed.
    await act(async () => {
      fireEvent.focus(combobox);
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector('[role="listbox"]')).toBeNull();
  });
});
