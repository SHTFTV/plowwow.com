import { describe, expect, it, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import LegacyPage from "@/pages/LegacyPage";

const metaProp = (p: string) =>
  (document.head.querySelector(`meta[property="${p}"]`) as HTMLMetaElement | null)?.content ?? "";
const canonicalHref = () =>
  (document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null)?.href ?? "";

describe("prefixed blog URL aliases", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.title = "";
  });

  it("renders /blog/:slug with the blog post and canonicalizes to the root slug", async () => {
    render(
      <MemoryRouter initialEntries={["/blog/tsawwassen-snow-removal"]}>
        <Routes>
          <Route path="/blog/:slug" element={<LegacyPage kind="blog" />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(document.title).toMatch(/Tsawwassen/i));

    expect(canonicalHref()).toBe("http://localhost:3000/tsawwassen-snow-removal/");
    expect(metaProp("og:url")).toBe("http://localhost:3000/tsawwassen-snow-removal/");
    expect(document.body.textContent).toMatch(/Tsawwassen/i);
    expect(document.body.textContent).not.toMatch(/Oops! Page not found/i);
  });
});