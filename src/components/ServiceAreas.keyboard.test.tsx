import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ServiceAreas from "./ServiceAreas";

const LAST_CITY_KEY = "service-areas:last-city";

beforeEach(() => {
  window.localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn() as unknown as Element["scrollIntoView"];
});

const renderWithRouter = () =>
  render(
    <MemoryRouter>
      <ServiceAreas />
    </MemoryRouter>,
  );

const card = (slug: string) =>
  document.getElementById(`city-opt-${slug}`) as HTMLAnchorElement | null;

/**
 * The order of flatCities is the order regions/cities are declared in
 * ServiceAreas.tsx, so we can predict neighbours for arrow navigation:
 *   vancouver → west-vancouver → north-vancouver → burnaby → richmond → …
 */
describe("ServiceAreas keyboard navigation", () => {
  it("ArrowDown / ArrowUp / Home / End move focus between options", async () => {
    window.localStorage.setItem(LAST_CITY_KEY, "vancouver");
    renderWithRouter();

    // Mount restore lands on Vancouver.
    await waitFor(() => {
      expect(document.activeElement).toBe(card("vancouver"));
    });

    // ArrowDown → West Vancouver
    await act(async () => {
      fireEvent.keyDown(card("vancouver")!, { key: "ArrowDown" });
    });
    await waitFor(() => expect(document.activeElement).toBe(card("west-vancouver")));
    expect(card("west-vancouver")!.getAttribute("aria-selected")).toBe("true");

    // ArrowDown → North Vancouver
    await act(async () => {
      fireEvent.keyDown(card("west-vancouver")!, { key: "ArrowDown" });
    });
    await waitFor(() => expect(document.activeElement).toBe(card("north-vancouver")));

    // ArrowUp → back to West Vancouver
    await act(async () => {
      fireEvent.keyDown(card("north-vancouver")!, { key: "ArrowUp" });
    });
    await waitFor(() => expect(document.activeElement).toBe(card("west-vancouver")));

    // End → last city (Chilliwack — last region's last entry).
    await act(async () => {
      fireEvent.keyDown(card("west-vancouver")!, { key: "End" });
    });
    await waitFor(() => expect(document.activeElement).toBe(card("chilliwack")));

    // Home → first city (Vancouver).
    await act(async () => {
      fireEvent.keyDown(card("chilliwack")!, { key: "Home" });
    });
    await waitFor(() => expect(document.activeElement).toBe(card("vancouver")));
  });

  it("arrow nav after a restoreEvent: focus follows arrows, pulse stays on the latest restoreEvent target", async () => {
    window.localStorage.setItem(LAST_CITY_KEY, "burnaby");
    renderWithRouter();

    // Mount restore on Burnaby (no pulse on mount — by design).
    await waitFor(() => expect(document.activeElement).toBe(card("burnaby")));

    // Trigger a clear-driven restoreEvent (pulse + scroll + focus on Burnaby).
    const input = screen.getByRole("combobox") as HTMLInputElement;
    input.focus();
    await act(async () => {
      fireEvent.change(input, { target: { value: "abbotsford" } });
    });
    await waitFor(() => expect(card("burnaby")).toBeNull());
    input.focus();
    await act(async () => {
      fireEvent.change(input, { target: { value: "" } });
    });

    const burnaby = await waitFor(() => {
      const el = card("burnaby");
      expect(el).not.toBeNull();
      expect(el!.className).toMatch(/animate-restore-pulse/);
      return el!;
    });
    expect(document.activeElement).toBe(burnaby);

    // Now ArrowDown — focus must move to Richmond and NOT get yanked
    // back to Burnaby by a stale restoreEvent.
    await act(async () => {
      fireEvent.keyDown(burnaby, { key: "ArrowDown" });
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(card("richmond"));
    });
    // Active selection moved with focus.
    expect(card("richmond")!.getAttribute("aria-selected")).toBe("true");
    expect(burnaby.getAttribute("aria-selected")).toBe("false");

    // The pulse still marks the latest restoreEvent's target (Burnaby) —
    // keyboard nav must NOT mutate the restoreEvent.
    expect(burnaby.className).toMatch(/animate-restore-pulse/);
    expect(card("richmond")!.className).not.toMatch(/animate-restore-pulse/);

    // Move again — focus continues to follow arrows.
    await act(async () => {
      fireEvent.keyDown(card("richmond")!, { key: "ArrowDown" });
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(card("new-westminster"));
    });
  });

  it("a NEW restoreEvent re-syncs focus + pulse away from the keyboard-focused card", async () => {
    window.localStorage.setItem(LAST_CITY_KEY, "burnaby");
    renderWithRouter();
    await waitFor(() => expect(document.activeElement).toBe(card("burnaby")));

    // Arrow-navigate away from Burnaby first.
    await act(async () => {
      fireEvent.keyDown(card("burnaby")!, { key: "ArrowDown" });
    });
    await waitFor(() => expect(document.activeElement).toBe(card("richmond")));

    // Now flip saved city + trigger a clear-driven restore for Surrey.
    window.localStorage.setItem(LAST_CITY_KEY, "surrey");
    const input = screen.getByRole("combobox") as HTMLInputElement;
    input.focus();
    await act(async () => {
      // "burnaby" hides Surrey (no region title matches).
      fireEvent.change(input, { target: { value: "burnaby" } });
    });
    await waitFor(() => expect(card("surrey")).toBeNull());
    input.focus();
    await act(async () => {
      fireEvent.change(input, { target: { value: "" } });
    });

    // Latest restoreEvent target = Surrey: focus + pulse both jump there.
    const surrey = await waitFor(() => {
      const el = card("surrey");
      expect(el).not.toBeNull();
      expect(el!.className).toMatch(/animate-restore-pulse/);
      return el!;
    });
    expect(document.activeElement).toBe(surrey);

    // Previous keyboard target (Richmond) is no longer focused or pulsing.
    expect(document.activeElement).not.toBe(card("richmond"));
    expect(card("richmond")!.className).not.toMatch(/animate-restore-pulse/);
  });
});
