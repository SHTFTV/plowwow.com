import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TopBar from "./TopBar";

describe("TopBar skip to main content", () => {
  it("moves focus and scroll to the current main landmark on activation", () => {
    const scroll = vi.fn();
    render(<><TopBar /><main id="main-content">Page content</main></>);
    const main = screen.getByRole("main");
    main.scrollIntoView = scroll;
    const link = screen.getByRole("link", { name: "Skip to main content", exact: true });
    link.focus();
    expect(link).toHaveAttribute("href", "#main-content");
    fireEvent.click(link);
    expect(main).toHaveFocus();
    expect(main).toHaveAttribute("tabindex", "-1");
    expect(scroll).toHaveBeenCalledWith({ block: "start" });
  });

  it("keeps an existing main focus contract without adding it to sequential Tab order", () => {
    render(<><TopBar /><main id="main-content" tabIndex={-1}>Page content</main></>);
    const main = screen.getByRole("main");
    main.scrollIntoView = vi.fn();
    fireEvent.click(screen.getByRole("link", { name: "Skip to main content", exact: true }));
    expect(main).toHaveFocus();
    expect(main.tabIndex).toBe(-1);
  });
});
