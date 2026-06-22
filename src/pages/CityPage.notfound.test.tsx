import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CityPage from "./CityPage";
import NotFound from "./NotFound";
import { cities } from "@/data/cities";

// Recharts ResponsiveContainer needs a sized parent in jsdom; stub it.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 300 }}>{children}</div>
    ),
  };
});

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div data-testid="home">HOME</div>} />
        <Route path="/:citySlug/*" element={<CityPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MemoryRouter>
  );

describe("CityPage unknown-slug handling", () => {
  const unknownPaths = [
    "/not-a-real-city",
    "/totally-fake-route",
    "/burnabyy", // typo of real city
    "/coquitlam/some-fake-neighborhood",
    "/vancouver/blocks/unknown",
  ];

  it.each(unknownPaths)("renders NotFound for %s (no redirect to home)", (path) => {
    renderAt(path);
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
    expect(screen.queryByTestId("home")).not.toBeInTheDocument();
  });

  it("still renders the city page for a real city slug", () => {
    const real = cities[0];
    renderAt(`/${real.slug}`);
    expect(screen.queryByText("404")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home")).not.toBeInTheDocument();
  });
});
