import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { Route, Routes } from "react-router-dom";
import { StaticRouter } from "react-router-dom/server";
import Quote from "../pages/Quote";
import CityQuote from "../pages/CityQuote";

vi.mock("@/components/TopBar",()=>({default:()=>null}));
vi.mock("@/components/Navbar",()=>({default:()=>null}));
vi.mock("@/components/Footer",()=>({default:()=>null}));

describe("one calculator across quote entry points", () => {
 for (const path of ["/quote", "/vancouver/quote", "/burnaby/quote", "/surrey/quote"]) {
  it(`${path} presents the shared address-only calculator before any contact form`, () => {
   const html = renderToString(<StaticRouter location={path}><Routes><Route path="/quote" element={<Quote/>}/><Route path="/:citySlug/quote" element={<CityQuote/>}/></Routes></StaticRouter>);
   expect(html).toContain('src="/calculator-embed/"');
   expect(html).not.toContain('type="email"');
   expect(html).not.toContain('<select');
   expect(html).not.toContain('Postal code');
   expect(html).toContain('/videos/plowwow-snow-removal-operations.mp4');
  });
 }
 it("keeps unknown city quote URLs as not found", () => {
  const html=renderToString(<StaticRouter location="/not-a-service-city/quote"><Routes><Route path="/:citySlug/quote" element={<CityQuote/>}/></Routes></StaticRouter>);
  expect(html).not.toContain('src="/calculator-embed/"');
 });
});
