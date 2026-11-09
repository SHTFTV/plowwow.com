import { describe, it, expect, vi } from "vitest";
import { existsSync } from "node:fs";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LegacyPage from "@/pages/LegacyPage";
import SeasonalPackages from "@/components/burnaby/SeasonalPackages";
import { collectRoutes } from "../../scripts/routes";

describe("Unlimited policy delivery", () => {
  it("registers an indexable policy with the approved share artwork", () => {
    const route = collectRoutes().find(r => r.path === "/unlimited-clarification-policy");
    expect(route?.kind).toBe("legacy-page");
    expect(route?.ogImage).toContain("/images/plowwow-unlimited-policy-hero-v2.jpg");
    expect(existsSync("public/images/plowwow-unlimited-policy-hero-v2.jpg")).toBe(true);
  });
  it("renders scope, both storm triggers and the reason for the policy", () => {
    vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    render(<MemoryRouter initialEntries={["/unlimited-clarification-policy"]}><LegacyPage kind="page" /></MemoryRouter>);
    expect(screen.getByRole("heading", {level: 1, name: "Unlimited Clarification Policy"})).toBeTruthy();
    expect(screen.getByRole("heading", {name: "Why we do this"})).toBeTruthy();
    expect(screen.getByText(/Continuous snowfall lasts/)).toBeTruthy();
    expect(screen.getByText(/A snow event reaches/)).toBeTruthy();
    expect(screen.getByText(/not 40% of the full seasonal package price/)).toBeTruthy();
    expect(screen.getByRole("img", {name: /Unlimited Clarification Policy/}).getAttribute("src")).toBe("/images/plowwow-unlimited-policy-hero-v2.jpg");
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it("links the package offer to the same policy", () => {
    render(<SeasonalPackages />);
    expect(screen.getByRole("link", {name: "Read the Unlimited Clarification Policy"}).getAttribute("href")).toBe("/unlimited-clarification-policy");
    cleanup();
  });
  it("qualifies every retained legacy unlimited claim with a policy link", () => {
    const content = import.meta.glob("/src/content/legacy/**/*.md", {query: "?raw", import: "default", eager: true}) as Record<string, string>;
    for (const [file, raw] of Object.entries(content)) {
      if (!/unlimited/i.test(raw) || file.endsWith("unlimited-clarification-policy.md")) continue;
      expect(raw, file).toContain("](/unlimited-clarification-policy)");
    }
  });
});
