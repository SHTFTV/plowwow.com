import { beforeEach, describe, expect, it } from "vitest";
import { acceptedQuoteId, readQuoteDraft, readQuoteReceipt, saveQuoteDraft, saveQuoteReceipt, type QuoteDraft } from "../lib/quoteFunnel";
const draft=():QuoteDraft=>({address:"123 Example Street, Vancouver",postal:"V5K 0A1",city:"Vancouver",service:"House & driveway",estimate:125,unit:"per visit",notes:"Beta starting estimate, before GST.",createdAt:new Date().toISOString()});
describe("quote funnel receipt and draft boundaries",()=>{
 beforeEach(()=>sessionStorage.clear());
 it("only accepts a real successful stored response",()=>{expect(acceptedQuoteId({success:true,code:"ok",id:"00000000-0000-0000-0000-000000000001"},null)).toBeTruthy();});
 it("does not treat spam responses, blocked requests or missing IDs as saved",()=>{for(const payload of [{success:true,code:"honeypot"},{success:false,code:"rate_limited"},{success:true,code:"ok"}])expect(acceptedQuoteId(payload,null)).toBeNull();});
 it("does not confirm a request when invocation failed",()=>{expect(acceptedQuoteId({success:true,code:"ok",id:"00000000-0000-0000-0000-000000000001"},new Error("network"))).toBeNull();});
 it("has no confirmation when the confirmation page is opened directly",()=>{expect(readQuoteReceipt()).toBeNull();});
 it("carries address and estimate between pages without URL parameters",()=>{const d=draft();saveQuoteDraft(d);expect(readQuoteDraft()).toEqual(d);});
 it("clears an older receipt when starting another quote",()=>{saveQuoteReceipt("00000000-0000-0000-0000-000000000001",draft());saveQuoteDraft(draft());expect(readQuoteReceipt()).toBeNull();});
 it("keeps a saved request reference for refreshes",()=>{const receipt=saveQuoteReceipt("00000000-0000-0000-0000-000000000001",draft());expect(readQuoteReceipt()).toEqual(receipt);});
 it("does not reuse expired or malformed drafts",()=>{saveQuoteDraft({...draft(),createdAt:new Date(Date.now()-25*60*60*1000).toISOString()});expect(readQuoteDraft()).toBeNull();sessionStorage.setItem('plowwow.quoteDraft.v1','bad JSON');expect(readQuoteDraft()).toBeNull();});
});
