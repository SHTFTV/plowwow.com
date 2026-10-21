import { describe, expect, it } from "vitest";
import { matchQuoteCity, serviceExamples } from "../lib/quoteExamples";
describe("quote service examples and regional address matching",()=>{
 it("keeps the approved house starting price and a custom scope without an invented price",()=>{expect(serviceExamples[1].price).toBe(125);expect(serviceExamples[2].price).toBeNull();});
 it("matches a municipality at the end of the address",()=>{expect(matchQuoteCity("123 Example Street, West Vancouver, BC","V7V 1A1")).toBe("West Vancouver");});
 it("does not mistake a street named Vancouver for the municipality",()=>{expect(matchQuoteCity("123 Vancouver Street, Victoria, BC","V8V 1A1")).toBeNull();});
 it("rejects an outside province and invalid postal codes",()=>{expect(matchQuoteCity("123 Example Street, Vancouver","M5V 1A1")).toBeNull();expect(matchQuoteCity("123 Example Street, Vancouver","VXX")).toBeNull();});
});
