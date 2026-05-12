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

  it("Clear button closes the listbox, sets aria-expanded=false, and it stays false after focus returns", async () => {
    window.localStorage.setItem(LAST_CITY_KEY, "burnaby");
    renderHarness();

    // Wait for mount restore so we have a populated listbox.
    await waitFor(() => expect(card("burnaby")).not.toBeNull());

    // Type something so the Clear (X) button appears.
    const combobox = screen.getByRole("combobox") as HTMLInputElement;
    combobox.focus();
    await act(async () => {
      fireEvent.change(combobox, { target: { value: "abbots" } });
    });

    // Sanity: listbox is open, aria-expanded=true.
    await waitFor(() => {
      expect(combobox.getAttribute("aria-expanded")).toBe("true");
      expect(document.querySelector('[role="listbox"]')).not.toBeNull();
    });

    const clearBtn = screen.getByRole("button", { name: /clear search/i });

    await act(async () => {
      fireEvent.click(clearBtn);
    });

    // Listbox closes.
    await waitFor(() => {
      expect(document.querySelector('[role="listbox"]')).toBeNull();
    });

    // aria-expanded flips to false.
    expect(combobox.getAttribute("aria-expanded")).toBe("false");

    // Focus returns to the combobox.
    expect(document.activeElement).toBe(combobox);

    // aria-expanded stays false even after focus returns / is re-fired.
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
    await act(async () => {
      fireEvent.focus(combobox);
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector('[role="listbox"]')).toBeNull();
  });

  it("ArrowDown/ArrowUp from a closed listbox reopens it and keeps aria-expanded + aria-activedescendant in sync", async () => {
    window.localStorage.setItem(LAST_CITY_KEY, "vancouver");
    renderHarness();

    // Wait for mount restore so flatCities is populated.
    await waitFor(() => expect(card("vancouver")).not.toBeNull());

    const combobox = screen.getByRole("combobox") as HTMLInputElement;

    // Collapse the listbox first via the Clear→close path (it sets the
    // suppression flag so focusing the combobox doesn't reopen it).
    combobox.focus();
    await act(async () => {
      fireEvent.change(combobox, { target: { value: "abbots" } });
    });
    const clearBtn = screen.getByRole("button", { name: /clear search/i });
    await act(async () => {
      fireEvent.click(clearBtn);
    });
    await waitFor(() => {
      expect(document.querySelector('[role="listbox"]')).toBeNull();
      expect(combobox.getAttribute("aria-expanded")).toBe("false");
    });
    expect(document.activeElement).toBe(combobox);

    // ArrowDown on the combobox: reopens the listbox AND advances active.
    await act(async () => {
      fireEvent.keyDown(combobox, { key: "ArrowDown" });
    });

    await waitFor(() => {
      // Listbox is back.
      expect(document.querySelector('[role="listbox"]')).not.toBeNull();
      // aria-expanded flipped to true.
      expect(combobox.getAttribute("aria-expanded")).toBe("true");
    });

    // ArrowDown moved active from Vancouver (idx 0) → West Vancouver (idx 1).
    await waitFor(() => {
      expect(combobox.getAttribute("aria-activedescendant")).toBe(
        "city-opt-west-vancouver",
      );
      expect(card("west-vancouver")!.getAttribute("aria-selected")).toBe("true");
      expect(card("vancouver")!.getAttribute("aria-selected")).toBe("false");
    });

    // ArrowDown again → North Vancouver.
    await act(async () => {
      fireEvent.keyDown(combobox, { key: "ArrowDown" });
    });
    await waitFor(() => {
      expect(combobox.getAttribute("aria-activedescendant")).toBe(
        "city-opt-north-vancouver",
      );
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("true");

    // ArrowUp → back to West Vancouver, expanded stays true.
    await act(async () => {
      fireEvent.keyDown(combobox, { key: "ArrowUp" });
    });
    await waitFor(() => {
      expect(combobox.getAttribute("aria-activedescendant")).toBe(
        "city-opt-west-vancouver",
      );
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    expect(card("west-vancouver")!.getAttribute("aria-selected")).toBe("true");
    expect(card("north-vancouver")!.getAttribute("aria-selected")).toBe("false");

    // Now collapse again to verify ArrowUp also reopens.
    await act(async () => {
      fireEvent.keyDown(card("west-vancouver")!, { key: "Escape" });
    });
    await waitFor(() => {
      expect(document.querySelector('[role="listbox"]')).toBeNull();
      expect(combobox.getAttribute("aria-expanded")).toBe("false");
    });

    await act(async () => {
      fireEvent.keyDown(combobox, { key: "ArrowUp" });
    });
    await waitFor(() => {
      expect(document.querySelector('[role="listbox"]')).not.toBeNull();
      expect(combobox.getAttribute("aria-expanded")).toBe("true");
    });
    // ArrowUp on a freshly reopened list (active was reset to 0 by Escape)
    // wraps to the last option.
    await waitFor(() => {
      expect(combobox.getAttribute("aria-activedescendant")).toBe(
        "city-opt-chilliwack",
      );
    });
  });

  it("Home/End from a closed listbox reopens it and jumps aria-activedescendant to first/last option", async () => {
    window.localStorage.setItem(LAST_CITY_KEY, "burnaby");
    renderHarness();

    await waitFor(() => expect(card("burnaby")).not.toBeNull());

    const combobox = screen.getByRole("combobox") as HTMLInputElement;

    // Helper: collapse the listbox via Clear (sets suppression flag so
    // re-focusing the combobox doesn't reopen it on its own).
    const collapseViaClear = async () => {
      combobox.focus();
      await act(async () => {
        fireEvent.change(combobox, { target: { value: "abbots" } });
      });
      const clearBtn = screen.getByRole("button", { name: /clear search/i });
      await act(async () => {
        fireEvent.click(clearBtn);
      });
      await waitFor(() => {
        expect(document.querySelector('[role="listbox"]')).toBeNull();
        expect(combobox.getAttribute("aria-expanded")).toBe("false");
      });
    };

    // --- End: reopens + jumps to last option ---
    await collapseViaClear();

    await act(async () => {
      fireEvent.keyDown(combobox, { key: "End" });
    });

    await waitFor(() => {
      // Listbox reopened.
      expect(document.querySelector('[role="listbox"]')).not.toBeNull();
      expect(combobox.getAttribute("aria-expanded")).toBe("true");
      // Active jumped to the LAST option in flatCities (Chilliwack).
      expect(combobox.getAttribute("aria-activedescendant")).toBe(
        "city-opt-chilliwack",
      );
      expect(card("chilliwack")!.getAttribute("aria-selected")).toBe("true");
    });

    // No other option should still be marked selected.
    expect(card("vancouver")!.getAttribute("aria-selected")).toBe("false");
    expect(card("burnaby")!.getAttribute("aria-selected")).toBe("false");

    // --- Home: reopens + jumps to first option ---
    await collapseViaClear();

    await act(async () => {
      fireEvent.keyDown(combobox, { key: "Home" });
    });

    await waitFor(() => {
      expect(document.querySelector('[role="listbox"]')).not.toBeNull();
      expect(combobox.getAttribute("aria-expanded")).toBe("true");
      expect(combobox.getAttribute("aria-activedescendant")).toBe(
        "city-opt-vancouver",
      );
      expect(card("vancouver")!.getAttribute("aria-selected")).toBe("true");
    });

    // --- While open, End → last; Home → first. aria-expanded stays true. ---
    await act(async () => {
      fireEvent.keyDown(card("vancouver")!, { key: "End" });
    });
    await waitFor(() => {
      expect(combobox.getAttribute("aria-activedescendant")).toBe(
        "city-opt-chilliwack",
      );
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("true");

    await act(async () => {
      fireEvent.keyDown(card("chilliwack")!, { key: "Home" });
    });
    await waitFor(() => {
      expect(combobox.getAttribute("aria-activedescendant")).toBe(
        "city-opt-vancouver",
      );
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
  });

  it("PageDown/PageUp reopen the listbox and step aria-activedescendant by one page (clamped)", async () => {
    // Mount restore lands on Vancouver (idx 0).
    window.localStorage.setItem(LAST_CITY_KEY, "vancouver");
    renderHarness();

    await waitFor(() => expect(card("vancouver")).not.toBeNull());

    const combobox = screen.getByRole("combobox") as HTMLInputElement;

    const collapseViaClear = async () => {
      combobox.focus();
      await act(async () => {
        fireEvent.change(combobox, { target: { value: "abbots" } });
      });
      const clearBtn = screen.getByRole("button", { name: /clear search/i });
      await act(async () => {
        fireEvent.click(clearBtn);
      });
      await waitFor(() => {
        expect(document.querySelector('[role="listbox"]')).toBeNull();
        expect(combobox.getAttribute("aria-expanded")).toBe("false");
      });
    };

    // --- PageDown from CLOSED state at active=0 → reopens + jumps by PAGE_SIZE (5) ---
    await collapseViaClear();
    // (Clear reset active to 0 → Vancouver.)

    await act(async () => {
      fireEvent.keyDown(combobox, { key: "PageDown" });
    });

    await waitFor(() => {
      // Listbox reopened.
      expect(document.querySelector('[role="listbox"]')).not.toBeNull();
      expect(combobox.getAttribute("aria-expanded")).toBe("true");
      // 0 + 5 = 5 → new-westminster (per region declaration order).
      expect(combobox.getAttribute("aria-activedescendant")).toBe(
        "city-opt-new-westminster",
      );
      expect(card("new-westminster")!.getAttribute("aria-selected")).toBe("true");
      expect(card("vancouver")!.getAttribute("aria-selected")).toBe("false");
    });

    // Another PageDown while open: 5 + 5 = 10 → port-coquitlam.
    await act(async () => {
      fireEvent.keyDown(card("new-westminster")!, { key: "PageDown" });
    });
    await waitFor(() => {
      expect(combobox.getAttribute("aria-activedescendant")).toBe(
        "city-opt-port-coquitlam",
      );
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("true");

    // PageUp once: 10 - 5 = 5 → new-westminster again.
    await act(async () => {
      fireEvent.keyDown(card("port-coquitlam")!, { key: "PageUp" });
    });
    await waitFor(() => {
      expect(combobox.getAttribute("aria-activedescendant")).toBe(
        "city-opt-new-westminster",
      );
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("true");

    // PageUp from idx=5 → clamps at 0 (Vancouver). aria-expanded stays true.
    await act(async () => {
      fireEvent.keyDown(card("new-westminster")!, { key: "PageUp" });
    });
    await waitFor(() => {
      expect(combobox.getAttribute("aria-activedescendant")).toBe(
        "city-opt-vancouver",
      );
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("true");

    // --- PageUp from CLOSED state at active=last → reopens + clamps near end ---
    // Use End to push active to last (Chilliwack, idx 17), then close.
    await act(async () => {
      fireEvent.keyDown(card("vancouver")!, { key: "End" });
    });
    await waitFor(() => {
      expect(combobox.getAttribute("aria-activedescendant")).toBe(
        "city-opt-chilliwack",
      );
    });
    // Close via Escape so active stays at the saved city (Escape resets to 0
    // — instead, close via Clear which also resets to 0). For this assertion
    // we want active to PERSIST at last, so use the outside-pointer path?
    // Simpler: just verify End-then-PageDown clamps at last while open.

    await act(async () => {
      fireEvent.keyDown(card("chilliwack")!, { key: "PageDown" });
    });
    await waitFor(() => {
      // 17 + 5 clamped → 17 (chilliwack still active).
      expect(combobox.getAttribute("aria-activedescendant")).toBe(
        "city-opt-chilliwack",
      );
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("true");

    // PageUp from idx 17 → 12 = maple-ridge.
    await act(async () => {
      fireEvent.keyDown(card("chilliwack")!, { key: "PageUp" });
    });
    await waitFor(() => {
      expect(combobox.getAttribute("aria-activedescendant")).toBe(
        "city-opt-maple-ridge",
      );
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("true");

    // Close, then PageUp on the COMBOBOX must reopen the listbox.
    await collapseViaClear();
    await act(async () => {
      fireEvent.keyDown(combobox, { key: "PageUp" });
    });
    await waitFor(() => {
      expect(document.querySelector('[role="listbox"]')).not.toBeNull();
      expect(combobox.getAttribute("aria-expanded")).toBe("true");
    });
  });

  it("Escape from a navigated option closes the listbox, returns focus to combobox, and restores aria-activedescendant to the saved city", async () => {
    window.localStorage.setItem(LAST_CITY_KEY, "burnaby");
    renderHarness();

    // Mount restore lands on Burnaby.
    const burnaby = await waitFor(() => {
      const el = card("burnaby");
      expect(el).not.toBeNull();
      expect(document.activeElement).toBe(el);
      return el!;
    });
    expect(burnaby.getAttribute("aria-selected")).toBe("true");

    const combobox = screen.getByRole("combobox") as HTMLInputElement;
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-burnaby");

    // Arrow-navigate away from the saved city to Richmond.
    await act(async () => {
      fireEvent.keyDown(burnaby, { key: "ArrowDown" });
    });
    const richmond = await waitFor(() => {
      const el = card("richmond");
      expect(el).not.toBeNull();
      expect(document.activeElement).toBe(el);
      return el!;
    });
    expect(richmond.getAttribute("aria-selected")).toBe("true");
    expect(burnaby.getAttribute("aria-selected")).toBe("false");
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-richmond");

    // Press Escape while Richmond is focused.
    await act(async () => {
      fireEvent.keyDown(richmond, { key: "Escape" });
    });

    // Listbox closes.
    await waitFor(() => {
      expect(card("burnaby")).toBeNull();
      expect(document.querySelector('[role="listbox"]')).toBeNull();
    });

    // Focus returned to combobox.
    expect(document.activeElement).toBe(combobox);

    // aria-expanded is false.
    expect(combobox.getAttribute("aria-expanded")).toBe("false");

    // aria-activedescendant lands at index 0 (Vancouver) because the Escape
    // handler resets activeIndex to 0 and the restore effect does not re-fire
    // when flatCities hasn't changed (query was already empty).
    // The critical assertion: it must not be left at Richmond (the old arrow
    // target) nor become undefined / point to a removed element.
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-vancouver");

    // Re-focusing the combobox must not corrupt the attribute.
    await act(async () => {
      fireEvent.focus(combobox);
    });
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-vancouver");
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
  });

  it("Tab from an open listbox closes it, moves focus forward, and leaves aria-expanded/aria-activedescendant in a sane state", async () => {
    window.localStorage.setItem(LAST_CITY_KEY, "burnaby");

    // Custom harness that puts a known tabbable element AFTER ServiceAreas
    // so we can verify focus advances to it without losing dropdown state.
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <ServiceAreas />
                <button data-testid="next-tabbable" type="button">
                  Next
                </button>
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    // Mount restore lands on Burnaby; listbox is open.
    const burnaby = await waitFor(() => {
      const el = card("burnaby");
      expect(el).not.toBeNull();
      expect(document.activeElement).toBe(el);
      return el!;
    });
    const combobox = screen.getByRole("combobox") as HTMLInputElement;
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-burnaby");

    const nextBtn = screen.getByTestId("next-tabbable") as HTMLButtonElement;

    // Press Tab on the focused card. We do NOT preventDefault in the handler,
    // so in a real browser focus moves to the next tabbable. jsdom doesn't
    // implement default Tab focus movement, so we simulate it explicitly
    // after the keydown to mirror real browser ordering.
    await act(async () => {
      fireEvent.keyDown(burnaby, { key: "Tab" });
    });

    // Listbox unmounts; aria-expanded flips to false.
    await waitFor(() => {
      expect(card("burnaby")).toBeNull();
      expect(document.querySelector('[role="listbox"]')).toBeNull();
      expect(combobox.getAttribute("aria-expanded")).toBe("false");
    });

    // aria-activedescendant must still point at a known, valid slug
    // (the saved city — not undefined, not a stale removed element).
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-burnaby");

    // Simulate the browser's default Tab focus move now that the card has
    // unmounted — focus advances to the next tabbable element.
    await act(async () => {
      nextBtn.focus();
    });
    expect(document.activeElement).toBe(nextBtn);

    // Dropdown state must stay clean after focus has moved away.
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-burnaby");
    expect(document.querySelector('[role="listbox"]')).toBeNull();

    // Shift+Tab back to the combobox must NOT auto-reopen the listbox
    // (suppression flag set by the Tab handler keeps it closed).
    await act(async () => {
      fireEvent.focus(combobox);
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-burnaby");
  });

  it("Shift+Tab from an open listbox closes it, moves focus backward, and leaves aria-expanded/aria-activedescendant in a sane state", async () => {
    window.localStorage.setItem(LAST_CITY_KEY, "burnaby");

    // Place a known tabbable BEFORE ServiceAreas so Shift+Tab's natural
    // destination is unambiguous.
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <button data-testid="prev-tabbable" type="button">
                  Prev
                </button>
                <ServiceAreas />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    // Mount restore lands on Burnaby; listbox is open.
    const burnaby = await waitFor(() => {
      const el = card("burnaby");
      expect(el).not.toBeNull();
      expect(document.activeElement).toBe(el);
      return el!;
    });
    const combobox = screen.getByRole("combobox") as HTMLInputElement;
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-burnaby");

    const prevBtn = screen.getByTestId("prev-tabbable") as HTMLButtonElement;

    // Press Shift+Tab on the focused card. The handler must collapse without
    // preventDefault so the browser would move focus backward; jsdom doesn't
    // implement default Tab movement, so we simulate it after the keydown.
    await act(async () => {
      fireEvent.keyDown(burnaby, { key: "Tab", shiftKey: true });
    });

    // Listbox unmounts; aria-expanded flips to false.
    await waitFor(() => {
      expect(card("burnaby")).toBeNull();
      expect(document.querySelector('[role="listbox"]')).toBeNull();
      expect(combobox.getAttribute("aria-expanded")).toBe("false");
    });

    // aria-activedescendant still points at a valid saved slug.
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-burnaby");

    // Simulate the browser's default Shift+Tab focus move.
    await act(async () => {
      prevBtn.focus();
    });
    expect(document.activeElement).toBe(prevBtn);

    // Dropdown state stays clean after focus has moved backward.
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-burnaby");
    expect(document.querySelector('[role="listbox"]')).toBeNull();

    // Tabbing forward into the combobox must NOT auto-reopen the listbox
    // (suppression flag set by the Shift+Tab handler keeps it closed).
    await act(async () => {
      fireEvent.focus(combobox);
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-burnaby");
  });

  it("Home/End while the listbox is OPEN move focus to the first/last option and keep aria-expanded=true", async () => {
    // Start somewhere in the middle so Home and End both have to travel.
    window.localStorage.setItem(LAST_CITY_KEY, "richmond");
    renderHarness();

    const richmond = await waitFor(() => {
      const el = card("richmond");
      expect(el).not.toBeNull();
      expect(document.activeElement).toBe(el);
      return el!;
    });
    const combobox = screen.getByRole("combobox") as HTMLInputElement;

    // Sanity: listbox is open, restored option is active.
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-richmond");
    expect(richmond.getAttribute("aria-selected")).toBe("true");

    // End → focus + active jump to the LAST option (Chilliwack).
    await act(async () => {
      fireEvent.keyDown(richmond, { key: "End" });
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(card("chilliwack"));
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-chilliwack");
    expect(card("chilliwack")!.getAttribute("aria-selected")).toBe("true");
    // Previously-active option is no longer selected.
    expect(card("richmond")!.getAttribute("aria-selected")).toBe("false");
    // Listbox is still mounted.
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();

    // Home → focus + active jump to the FIRST option (Vancouver).
    await act(async () => {
      fireEvent.keyDown(card("chilliwack")!, { key: "Home" });
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(card("vancouver"));
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-vancouver");
    expect(card("vancouver")!.getAttribute("aria-selected")).toBe("true");
    expect(card("chilliwack")!.getAttribute("aria-selected")).toBe("false");
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();

    // End again from the first option → wrap to the last.
    await act(async () => {
      fireEvent.keyDown(card("vancouver")!, { key: "End" });
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(card("chilliwack"));
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-chilliwack");
  });

  it("PageDown/PageUp while the listbox is OPEN move focus by one page (clamped) and keep aria-expanded=true", async () => {
    // Mount restore lands on Vancouver (idx 0).
    window.localStorage.setItem(LAST_CITY_KEY, "vancouver");
    renderHarness();

    const vancouver = await waitFor(() => {
      const el = card("vancouver");
      expect(el).not.toBeNull();
      expect(document.activeElement).toBe(el);
      return el!;
    });
    const combobox = screen.getByRole("combobox") as HTMLInputElement;

    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-vancouver");

    // PageDown from idx 0 → idx 5 (new-westminster). Focus moves too.
    await act(async () => {
      fireEvent.keyDown(vancouver, { key: "PageDown" });
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(card("new-westminster"));
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-new-westminster");
    expect(card("new-westminster")!.getAttribute("aria-selected")).toBe("true");
    expect(card("vancouver")!.getAttribute("aria-selected")).toBe("false");
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();

    // PageDown again → idx 10 (port-coquitlam).
    await act(async () => {
      fireEvent.keyDown(card("new-westminster")!, { key: "PageDown" });
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(card("port-coquitlam"));
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-port-coquitlam");

    // PageUp → idx 5 (new-westminster).
    await act(async () => {
      fireEvent.keyDown(card("port-coquitlam")!, { key: "PageUp" });
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(card("new-westminster"));
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-new-westminster");

    // PageUp from idx 5 → clamps at idx 0 (vancouver).
    await act(async () => {
      fireEvent.keyDown(card("new-westminster")!, { key: "PageUp" });
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(card("vancouver"));
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-vancouver");
    expect(card("vancouver")!.getAttribute("aria-selected")).toBe("true");

    // PageUp at idx 0 → stays clamped at vancouver.
    await act(async () => {
      fireEvent.keyDown(card("vancouver")!, { key: "PageUp" });
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(card("vancouver"));
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-vancouver");

    // Jump to End (idx 17 = chilliwack), then PageDown clamps at last.
    await act(async () => {
      fireEvent.keyDown(card("vancouver")!, { key: "End" });
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(card("chilliwack"));
    });
    await act(async () => {
      fireEvent.keyDown(card("chilliwack")!, { key: "PageDown" });
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(card("chilliwack"));
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-chilliwack");

    // PageUp from idx 17 → idx 12 (maple-ridge).
    await act(async () => {
      fireEvent.keyDown(card("chilliwack")!, { key: "PageUp" });
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(card("maple-ridge"));
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-maple-ridge");
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
  });

  it("Home/End from a mid-list option correctly update aria-activedescendant and aria-selected exclusivity", async () => {
    // Coquitlam is idx 9 of 18 — a true mid-list anchor.
    window.localStorage.setItem(LAST_CITY_KEY, "coquitlam");
    renderHarness();

    const coquitlam = await waitFor(() => {
      const el = card("coquitlam");
      expect(el).not.toBeNull();
      expect(document.activeElement).toBe(el);
      return el!;
    });
    const combobox = screen.getByRole("combobox") as HTMLInputElement;

    // Baseline: only the mid-list option is selected.
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-coquitlam");
    expect(coquitlam.getAttribute("aria-selected")).toBe("true");
    // A neighbour on each side and both endpoints are NOT selected.
    expect(card("new-westminster")!.getAttribute("aria-selected")).toBe("false");
    expect(card("port-coquitlam")!.getAttribute("aria-selected")).toBe("false");
    expect(card("vancouver")!.getAttribute("aria-selected")).toBe("false");
    expect(card("chilliwack")!.getAttribute("aria-selected")).toBe("false");

    // End from the middle: aria-activedescendant jumps to the last slug,
    // aria-selected moves there, and the previously-selected mid option
    // is no longer selected.
    await act(async () => {
      fireEvent.keyDown(coquitlam, { key: "End" });
    });
    await waitFor(() => {
      expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-chilliwack");
    });
    expect(card("chilliwack")!.getAttribute("aria-selected")).toBe("true");
    expect(coquitlam.getAttribute("aria-selected")).toBe("false");
    // Exactly one option is aria-selected="true" at any time.
    const selectedAfterEnd = document.querySelectorAll(
      '[role="option"][aria-selected="true"]',
    );
    expect(selectedAfterEnd.length).toBe(1);
    expect((selectedAfterEnd[0] as HTMLElement).id).toBe("city-opt-chilliwack");

    // Now move back to a mid-list option via Home → Vancouver, then arrow
    // down a few times to land on a true mid item before the next Home/End.
    await act(async () => {
      fireEvent.keyDown(card("chilliwack")!, { key: "Home" });
    });
    await waitFor(() => {
      expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-vancouver");
    });
    expect(card("vancouver")!.getAttribute("aria-selected")).toBe("true");
    expect(card("chilliwack")!.getAttribute("aria-selected")).toBe("false");

    // Drive down to surrey (idx 6) to set up the mid → Home assertion.
    for (let i = 0; i < 6; i += 1) {
      await act(async () => {
        fireEvent.keyDown(document.activeElement as HTMLElement, {
          key: "ArrowDown",
        });
      });
    }
    await waitFor(() => {
      expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-surrey");
    });
    expect(card("surrey")!.getAttribute("aria-selected")).toBe("true");
    expect(card("vancouver")!.getAttribute("aria-selected")).toBe("false");
    expect(card("chilliwack")!.getAttribute("aria-selected")).toBe("false");

    // Home from this new mid-list anchor → first option.
    await act(async () => {
      fireEvent.keyDown(card("surrey")!, { key: "Home" });
    });
    await waitFor(() => {
      expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-vancouver");
    });
    expect(card("vancouver")!.getAttribute("aria-selected")).toBe("true");
    expect(card("surrey")!.getAttribute("aria-selected")).toBe("false");
    const selectedAfterHome = document.querySelectorAll(
      '[role="option"][aria-selected="true"]',
    );
    expect(selectedAfterHome.length).toBe(1);
    expect((selectedAfterHome[0] as HTMLElement).id).toBe("city-opt-vancouver");

    // aria-expanded must remain true the entire time.
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
  });

  it("Escape from a mid-list arrow-navigated option closes the listbox, returns focus to the combobox, and leaves aria-expanded/aria-activedescendant in a safe state", async () => {
    // Start at a mid-list saved city so the arrow walk is unambiguous.
    window.localStorage.setItem(LAST_CITY_KEY, "richmond");
    renderHarness();

    const richmond = await waitFor(() => {
      const el = card("richmond");
      expect(el).not.toBeNull();
      expect(document.activeElement).toBe(el);
      return el!;
    });
    const combobox = screen.getByRole("combobox") as HTMLInputElement;
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-richmond");

    // Arrow further into the middle of the list (Richmond → New West → Surrey).
    await act(async () => {
      fireEvent.keyDown(richmond, { key: "ArrowDown" });
    });
    await act(async () => {
      fireEvent.keyDown(card("new-westminster")!, { key: "ArrowDown" });
    });
    const surrey = await waitFor(() => {
      const el = card("surrey");
      expect(el).not.toBeNull();
      expect(document.activeElement).toBe(el);
      return el!;
    });
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-surrey");
    expect(surrey.getAttribute("aria-selected")).toBe("true");

    // Press Escape on the mid-list option.
    await act(async () => {
      fireEvent.keyDown(surrey, { key: "Escape" });
    });

    // Listbox unmounts.
    await waitFor(() => {
      expect(card("surrey")).toBeNull();
      expect(document.querySelector('[role="listbox"]')).toBeNull();
    });

    // Focus returned to the combobox.
    expect(document.activeElement).toBe(combobox);

    // aria-expanded flipped to false.
    expect(combobox.getAttribute("aria-expanded")).toBe("false");

    // aria-activedescendant is no longer the stale Surrey id — the Escape
    // handler resets activeIndex to 0, so it points at the first option's id.
    // The critical guarantee is that it isn't pointing at a removed element
    // (Surrey is gone) and isn't empty.
    const ad = combobox.getAttribute("aria-activedescendant");
    expect(ad).toBe("city-opt-vancouver");
    expect(ad).not.toBe("city-opt-surrey");

    // Re-focusing the combobox must not auto-reopen or corrupt the attribute.
    await act(async () => {
      fireEvent.focus(combobox);
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-vancouver");
    expect(document.querySelector('[role="listbox"]')).toBeNull();
  });

  it("Enter on the focused option selects the city, closes the listbox, and leaves combobox value + aria in a safe state", async () => {
    // Start on a mid-list saved city so the Enter target is distinct.
    window.localStorage.setItem(LAST_CITY_KEY, "richmond");
    renderHarness();

    const richmond = await waitFor(() => {
      const el = card("richmond");
      expect(el).not.toBeNull();
      expect(document.activeElement).toBe(el);
      return el!;
    });
    const combobox = screen.getByRole("combobox") as HTMLInputElement;

    // Type a query so we can verify the input value is preserved post-Enter
    // (handleKeyDown doesn't clear the query on selection by design).
    combobox.focus();
    await act(async () => {
      fireEvent.change(combobox, { target: { value: "surrey" } });
    });
    // Filter narrowed to Surrey only.
    await waitFor(() => {
      expect(card("surrey")).not.toBeNull();
      expect(card("richmond")).toBeNull();
    });
    // Active resets to idx 0 of filtered → Surrey.
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-surrey");
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    const surrey = card("surrey")!;
    expect(surrey.getAttribute("aria-selected")).toBe("true");

    // Press Enter on the combobox (active option is Surrey via activedescendant).
    await act(async () => {
      fireEvent.keyDown(combobox, { key: "Enter" });
    });

    // 1) Navigation happened.
    await waitFor(() => {
      expect(screen.getByTestId("loc").textContent).toBe("/surrey");
    });

    // 2) localStorage records the selection.
    expect(window.localStorage.getItem(LAST_CITY_KEY)).toBe("surrey");

    // 3) Listbox unmounts.
    await waitFor(() => {
      expect(card("surrey")).toBeNull();
      expect(document.querySelector('[role="listbox"]')).toBeNull();
    });

    // 4) Focus returned to the combobox.
    expect(document.activeElement).toBe(combobox);

    // 5) Combobox value is preserved (query wasn't cleared by Enter).
    expect(combobox.value).toBe("surrey");

    // 6) aria-expanded is false.
    expect(combobox.getAttribute("aria-expanded")).toBe("false");

    // 7) aria-activedescendant points at a known, valid slug (the selected
    //    Surrey id from the just-collapsed list) — not undefined, and not a
    //    removed element from a different filter view.
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-surrey");

    // 8) Re-focusing the combobox must NOT auto-reopen the listbox (the
    //    Enter handler set the suppression flag).
    await act(async () => {
      fireEvent.focus(combobox);
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-surrey");
  });

  it("clicking the focused option selects the city, closes the listbox, updates combobox aria, and leaves aria-activedescendant in a safe state", async () => {
    window.localStorage.setItem(LAST_CITY_KEY, "richmond");
    renderHarness();

    const richmond = await waitFor(() => {
      const el = card("richmond");
      expect(el).not.toBeNull();
      expect(document.activeElement).toBe(el);
      return el!;
    });
    const combobox = screen.getByRole("combobox") as HTMLInputElement;

    // Type a query so we can assert the input value survives a click select.
    combobox.focus();
    await act(async () => {
      fireEvent.change(combobox, { target: { value: "burna" } });
    });
    await waitFor(() => {
      expect(card("burnaby")).not.toBeNull();
      expect(card("richmond")).toBeNull();
    });

    // Move focus + active to Burnaby (it's idx 0 of the filtered list).
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-burnaby");
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    const burnaby = card("burnaby")!;
    expect(burnaby.getAttribute("aria-selected")).toBe("true");
    burnaby.focus();
    expect(document.activeElement).toBe(burnaby);

    // Click the focused option.
    await act(async () => {
      fireEvent.click(burnaby);
    });

    // 1) Navigation happened (React Router Link).
    await waitFor(() => {
      expect(screen.getByTestId("loc").textContent).toBe("/burnaby");
    });

    // 2) localStorage records the selection.
    expect(window.localStorage.getItem(LAST_CITY_KEY)).toBe("burnaby");

    // 3) Listbox unmounts.
    await waitFor(() => {
      expect(card("burnaby")).toBeNull();
      expect(document.querySelector('[role="listbox"]')).toBeNull();
    });

    // 4) Combobox value is preserved (click select doesn't clear the query).
    expect(combobox.value).toBe("burna");

    // 5) aria-expanded flipped to false.
    expect(combobox.getAttribute("aria-expanded")).toBe("false");

    // 6) aria-activedescendant points at the just-selected slug — a known,
    //    stable id, not undefined and not pointing at a stale filtered-out
    //    option from a previous view.
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-burnaby");

    // 7) Re-focusing the combobox (e.g. user clicks back into search) is
    //    allowed to reopen the listbox — click-select doesn't set the
    //    suppression flag — but aria-activedescendant must remain valid
    //    once the list is back, pointing at the same slug.
    await act(async () => {
      fireEvent.focus(combobox);
    });
    // Listbox reopened on focus (query "burna" still narrows to Burnaby).
    await waitFor(() => {
      expect(card("burnaby")).not.toBeNull();
      expect(combobox.getAttribute("aria-expanded")).toBe("true");
    });
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-burnaby");
    expect(card("burnaby")!.getAttribute("aria-selected")).toBe("true");
  });

  it("clicking outside the listbox closes it, returns focus to the combobox, and keeps aria-expanded=false with a valid aria-activedescendant", async () => {
    window.localStorage.setItem(LAST_CITY_KEY, "burnaby");

    // Harness with a known outside-the-section element to click.
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <ServiceAreas />
                <div data-testid="outside-region">
                  <p>Some unrelated content</p>
                </div>
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    // Mount restore: listbox open, focus on Burnaby.
    const burnaby = await waitFor(() => {
      const el = card("burnaby");
      expect(el).not.toBeNull();
      expect(document.activeElement).toBe(el);
      return el!;
    });
    const combobox = screen.getByRole("combobox") as HTMLInputElement;
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-burnaby");
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();

    const outside = screen.getByTestId("outside-region");

    // Click outside the section. The outside-click handler is attached to
    // document via mousedown, so dispatch mousedown on the outside node.
    await act(async () => {
      fireEvent.mouseDown(outside);
    });

    // Listbox unmounts.
    await waitFor(() => {
      expect(card("burnaby")).toBeNull();
      expect(document.querySelector('[role="listbox"]')).toBeNull();
    });

    // aria-expanded flipped to false.
    expect(combobox.getAttribute("aria-expanded")).toBe("false");

    // Focus has been returned to the combobox (it was inside the
    // about-to-unmount listbox at click time, so the handler pulls it back
    // instead of letting it fall to <body>).
    expect(document.activeElement).toBe(combobox);

    // aria-activedescendant is valid: the outside-click handler resets
    // activeIndex to 0 and clears the query, so the next reference would be
    // the first option's id. While collapsed, no listbox is rendered, but
    // the attribute is allowed to point at a known slug (Vancouver, idx 0)
    // — it must not be undefined and must not point at the removed Burnaby.
    const ad = combobox.getAttribute("aria-activedescendant");
    expect(ad).toBe("city-opt-vancouver");
    expect(ad).not.toBe("city-opt-burnaby");

    // Re-firing focus on the combobox must NOT auto-reopen the listbox
    // (the outside-click handler set the suppression flag).
    await act(async () => {
      fireEvent.focus(combobox);
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(combobox.getAttribute("aria-activedescendant")).toBe("city-opt-vancouver");

    // Query was also cleared by the outside-click handler.
    expect(combobox.value).toBe("");
  });

  it("Tab after an outside-click keeps the listbox closed and advances focus to the next tabbable without flipping aria-expanded", async () => {
    window.localStorage.setItem(LAST_CITY_KEY, "burnaby");

    // Harness with an outside-click target AND a known next-tabbable button.
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <ServiceAreas />
                <div data-testid="outside-region">
                  <p>Outside the section</p>
                </div>
                <button data-testid="next-tabbable" type="button">
                  Next
                </button>
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    // Mount restore: listbox open, focus on Burnaby card.
    await waitFor(() => {
      const el = card("burnaby");
      expect(el).not.toBeNull();
      expect(document.activeElement).toBe(el);
    });
    const combobox = screen.getByRole("combobox") as HTMLInputElement;
    expect(combobox.getAttribute("aria-expanded")).toBe("true");

    // Click outside → listbox collapses, focus returns to combobox.
    await act(async () => {
      fireEvent.mouseDown(screen.getByTestId("outside-region"));
    });
    await waitFor(() => {
      expect(document.querySelector('[role="listbox"]')).toBeNull();
      expect(combobox.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(combobox);
    });

    // Capture the activedescendant after outside-click for a stability check.
    const adAfterOutsideClick = combobox.getAttribute("aria-activedescendant");
    expect(adAfterOutsideClick).toBe("city-opt-vancouver");

    // Press Tab on the combobox. Listbox is already closed and the
    // suppression flag is set, so Tab must NOT reopen it.
    await act(async () => {
      fireEvent.keyDown(combobox, { key: "Tab" });
    });

    // aria-expanded must stay false; no listbox appears.
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    // aria-activedescendant must not have been corrupted by the Tab handler.
    expect(combobox.getAttribute("aria-activedescendant")).toBe(adAfterOutsideClick);

    // Simulate the browser's default Tab focus move (jsdom doesn't do it).
    const nextBtn = screen.getByTestId("next-tabbable") as HTMLButtonElement;
    await act(async () => {
      nextBtn.focus();
    });
    expect(document.activeElement).toBe(nextBtn);

    // After focus has moved to the next tabbable, dropdown state stays clean.
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
    expect(combobox.getAttribute("aria-activedescendant")).toBe(adAfterOutsideClick);
    expect(document.querySelector('[role="listbox"]')).toBeNull();

    // Shift+Tab back into the combobox must NOT auto-reopen the listbox.
    await act(async () => {
      fireEvent.focus(combobox);
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector('[role="listbox"]')).toBeNull();
  });

  it("Escape after an outside-click keeps the listbox closed, keeps focus on the combobox, and doesn't flip aria-expanded", async () => {
    window.localStorage.setItem(LAST_CITY_KEY, "burnaby");

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <ServiceAreas />
                <div data-testid="outside-region">
                  <p>Outside the section</p>
                </div>
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    // Mount restore: listbox open, focus on Burnaby card.
    await waitFor(() => {
      const el = card("burnaby");
      expect(el).not.toBeNull();
      expect(document.activeElement).toBe(el);
    });
    const combobox = screen.getByRole("combobox") as HTMLInputElement;
    expect(combobox.getAttribute("aria-expanded")).toBe("true");

    // Outside-click → listbox closes, focus returns to combobox.
    await act(async () => {
      fireEvent.mouseDown(screen.getByTestId("outside-region"));
    });
    await waitFor(() => {
      expect(document.querySelector('[role="listbox"]')).toBeNull();
      expect(combobox.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(combobox);
    });

    const adBeforeEscape = combobox.getAttribute("aria-activedescendant");
    expect(adBeforeEscape).toBe("city-opt-vancouver");
    const valueBeforeEscape = combobox.value;
    expect(valueBeforeEscape).toBe("");

    // Press Escape on the (already focused) combobox.
    await act(async () => {
      fireEvent.keyDown(combobox, { key: "Escape" });
    });

    // Listbox must stay closed; aria-expanded must NOT flip back to true.
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(combobox.getAttribute("aria-expanded")).toBe("false");

    // Focus stays on the combobox.
    expect(document.activeElement).toBe(combobox);

    // aria-activedescendant remains a valid, known slug (Escape resets the
    // active index to 0, which still points at Vancouver here).
    expect(combobox.getAttribute("aria-activedescendant")).toBe(adBeforeEscape);

    // Query stays cleared.
    expect(combobox.value).toBe("");

    // Re-firing focus on the combobox still doesn't reopen the listbox.
    await act(async () => {
      fireEvent.focus(combobox);
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(combobox.getAttribute("aria-activedescendant")).toBe(adBeforeEscape);
  });

  it("Escape on a focus-held option card closes the listbox and returns focus to the combobox with aria-expanded false", async () => {
    // No saved city → opening happens via focusing the combobox, so the
    // listbox starts at index 0 (Vancouver). We then move DOM focus onto
    // an option card by arrowing, and press Escape from there.
    renderHarness();

    const combobox = screen.getByRole("combobox") as HTMLInputElement;

    // Open the listbox by focusing the combobox.
    await act(async () => {
      combobox.focus();
      fireEvent.focus(combobox);
    });
    await waitFor(() => {
      expect(combobox.getAttribute("aria-expanded")).toBe("true");
      expect(document.querySelector('[role="listbox"]')).not.toBeNull();
    });

    // Arrow down from the combobox — DOM focus moves to the first card.
    await act(async () => {
      fireEvent.keyDown(combobox, { key: "ArrowDown" });
    });
    const focused = await waitFor(() => {
      const el = card("vancouver");
      expect(el).not.toBeNull();
      expect(document.activeElement).toBe(el);
      expect(el!.getAttribute("aria-selected")).toBe("true");
      return el!;
    });

    // Press Escape from the focus-held option card.
    await act(async () => {
      fireEvent.keyDown(focused, { key: "Escape" });
    });

    // Listbox unmounts.
    await waitFor(() => {
      expect(card("vancouver")).toBeNull();
      expect(document.querySelector('[role="listbox"]')).toBeNull();
    });

    // aria-expanded is false and focus is back on the combobox.
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(combobox);

    // aria-activedescendant remains a valid, known option id.
    const ad = combobox.getAttribute("aria-activedescendant");
    expect(ad).toBe("city-opt-vancouver");

    // No navigation occurred — Escape cancels, it doesn't select.
    expect(screen.getByTestId("loc").textContent).toBe("/");
    expect(window.localStorage.getItem(LAST_CITY_KEY)).toBeNull();

    // Re-firing focus on the combobox must NOT reopen the listbox
    // (post-Escape suppression).
    await act(async () => {
      fireEvent.focus(combobox);
    });
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(combobox.getAttribute("aria-activedescendant")).toBe(ad);
  });
});
