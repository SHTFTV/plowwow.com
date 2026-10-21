import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { saveQuoteDraft } from "../lib/quoteFunnel";
import QuoteRequest from "../pages/QuoteRequest";
import QuoteReceived from "../pages/QuoteReceived";
vi.mock("@/components/TopBar",()=>({default:()=>null}));
vi.mock("@/components/Navbar",()=>({default:()=>null}));
vi.mock("@/components/Footer",()=>({default:()=>null}));
vi.mock("@/components/ContactForm",()=>({default:({onAccepted}:{onAccepted:(id:string)=>void})=><button onClick={()=>onAccepted("00000000-0000-0000-0000-000000000001")}>Simulate saved response</button>}));
function pages(path:string){return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/quote/request" element={<QuoteRequest/>}/><Route path="/quote/received" element={<QuoteReceived/>}/></Routes></MemoryRouter>);}
describe("B to C follow-up flow with a mocked saved response",()=>{
 beforeEach(()=>sessionStorage.clear());afterEach(cleanup);
 it("shows safe guidance on direct confirmation visits without a receipt",()=>{pages("/quote/received");expect(screen.getByText(/no confirmed submission/i)).toBeInTheDocument();expect(screen.queryByText(/Request reference:/i)).not.toBeInTheDocument();});
 it("carries the draft to review and redirects after an accepted request",()=>{saveQuoteDraft({address:"123 Example Street, Vancouver",postal:"V5K 0A1",city:"Vancouver",service:"House & driveway",estimate:125,unit:"per visit",notes:"Review required",createdAt:new Date().toISOString()});pages("/quote/request");expect(screen.getByText("House & driveway")).toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:"Simulate saved response"}));expect(screen.getByRole("heading",{name:/Your request is in/})).toBeInTheDocument();expect(screen.getByText(/Request reference:/)).toBeInTheDocument();});
});
