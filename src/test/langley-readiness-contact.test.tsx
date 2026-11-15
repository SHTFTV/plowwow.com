import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlowWowBot from "../components/PlowWowBot";

afterEach(cleanup);

describe("Langley readiness article contact access", () => {
  for (const path of [
    "/langley-cold-nights-contract-salt-supply-november-2026",
    "/langley-cold-nights-contract-salt-supply-november-2026/",
  ]) {
    it(`keeps ${path} unobstructed until contact is requested`, () => {
      render(<MemoryRouter initialEntries={[path]}><PlowWowBot /></MemoryRouter>);
      expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Open PlowWow contact panel" })).not.toHaveClass("fixed");
      fireEvent.click(screen.getByRole("button", { name: "Open PlowWow contact panel" }));
      expect(screen.getByRole("link", { name: "Call PlowWow at 604-761-1518" })).toHaveAttribute("href", "tel:+16047611518");
      expect(screen.getByRole("link", { name: "Text PlowWow at 604-761-1518" })).toHaveAttribute("href", "sms:+16047611518");
      expect(screen.getByRole("link", { name: "Email PlowWow at wow@plowwow.com" })).toHaveAttribute("href", "mailto:wow@plowwow.com");
      fireEvent.click(screen.getByRole("button", { name: "Hide PlowWow contact panel" }));
      expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Open PlowWow contact panel" }));
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    });
  }

  it("preserves the existing contact state on the separate Langley service page", () => {
    render(<MemoryRouter initialEntries={["/langley"]}><PlowWowBot /></MemoryRouter>);
    expect(screen.getByRole("complementary")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hide PlowWow contact panel" }));
    expect(screen.getByRole("button", { name: "Open PlowWow contact panel" })).toHaveClass("fixed");
  });
});
