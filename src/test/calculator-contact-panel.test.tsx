import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlowWowBot from "../components/PlowWowBot";

afterEach(cleanup);
describe("calculator contact panel stays out of the way", () => {
 for (const path of ["/quote", "/surrey/quote", "/vancouver/quote/", "/quote/request", "/metro-vancouver-online-snow-removal-calculator"]) {
  it(`starts collapsed on ${path} and can still be opened`, () => {
   render(<MemoryRouter initialEntries={[path]}><PlowWowBot/></MemoryRouter>);
   expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
   fireEvent.click(screen.getByRole("button", { name:"Open PlowWow contact panel" }));
   expect(screen.getByRole("link", { name:"Call PlowWow at 604-761-1518" })).toBeInTheDocument();
   fireEvent.keyDown(window, {key:"Escape"});
   expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });
 }
 it("preserves the expanded panel on other service pages", () => {
  render(<MemoryRouter initialEntries={["/commercial"]}><PlowWowBot/></MemoryRouter>);
  expect(screen.getByRole("complementary")).toBeInTheDocument();
 });
});
