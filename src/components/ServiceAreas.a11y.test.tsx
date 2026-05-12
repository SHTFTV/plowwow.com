import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axe from "axe-core";
import ServiceAreas from "./ServiceAreas";

const LAST_CITY_KEY = "service-areas:last-city";

beforeEach(() => {
  window.localStorage.clear();
  // jsdom: scrollIntoView is required by the restore logic.
  Element.prototype.scrollIntoView = vi.fn() as unknown as Element["scrollIntoView"];
});

afterEach(() => {
  cleanup();
});

/**
 * Run axe against the rendered container. We constrain to WCAG 2.1 A/AA
 * tags so the report is scoped to the levels we actually commit to.
 */
const runAxe = async (container: Element) => {
  const results = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    // Color contrast can't be measured reliably in jsdom (no real layout/colors).
    rules: { "color-contrast": { enabled: false } },
    resultTypes: ["violations"],
  });
  return results.violations;
};

const renderInRouter = () => {
  const utils = render(
    <MemoryRouter>
      <ServiceAreas />
    </MemoryRouter>,
  );
  return utils;
};

describe("ServiceAreas a11y — restore + reduced-motion", () => {
  it("has no axe violations on the initial restored view", async () => {
    window.localStorage.setItem(LAST_CITY_KEY, "burnaby");
    const { container } = renderInRouter();

    // Wait for the mount restore to land — this is the state users see
    // when they return to the section.
    await waitFor(() => {
      expect(document.activeElement).toBe(
        document.getElementById("city-opt-burnaby"),
      );
    });

    const violations = await runAxe(container);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

  it("has no axe violations after a clear-driven restore (focus/scroll active)", async () => {
    window.localStorage.setItem(LAST_CITY_KEY, "burnaby");
    const { container } = renderInRouter();

    await waitFor(() =>
      expect(document.getElementById("city-opt-burnaby")).not.toBeNull(),
    );

    const input = screen.getByRole("combobox") as HTMLInputElement;
    input.focus();
    await act(async () => {
      fireEvent.change(input, { target: { value: "abbotsford" } });
    });
    await waitFor(() =>
      expect(document.getElementById("city-opt-burnaby")).toBeNull(),
    );

    input.focus();
    await act(async () => {
      fireEvent.change(input, { target: { value: "" } });
    });

    await waitFor(() => {
      const card = document.getElementById("city-opt-burnaby");
      expect(card).not.toBeNull();
      expect(document.activeElement).toBe(card);
    });

    const violations = await runAxe(container);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

  it("has no axe violations under prefers-reduced-motion (animation suppressed)", async () => {
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
      const { container } = renderInRouter();

      await waitFor(() =>
        expect(document.getElementById("city-opt-burnaby")).not.toBeNull(),
      );

      const input = screen.getByRole("combobox") as HTMLInputElement;
      input.focus();
      await act(async () => {
        fireEvent.change(input, { target: { value: "abbotsford" } });
      });
      await waitFor(() =>
        expect(document.getElementById("city-opt-burnaby")).toBeNull(),
      );

      input.focus();
      await act(async () => {
        fireEvent.change(input, { target: { value: "" } });
      });

      const card = await waitFor(() => {
        const el = document.getElementById("city-opt-burnaby");
        expect(el).not.toBeNull();
        return el!;
      });

      // Focus management is identical under reduced motion — WCAG 2.4.3
      // (Focus Order) and 2.4.7 (Focus Visible) still satisfied.
      expect(document.activeElement).toBe(card);

      // The active card has aria-selected=true (single source for SR users),
      // matching WCAG 4.1.2 Name/Role/Value expectations for listbox options.
      expect(card.getAttribute("aria-selected")).toBe("true");
      expect(card.getAttribute("role")).toBe("option");

      const violations = await runAxe(container);
      expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
