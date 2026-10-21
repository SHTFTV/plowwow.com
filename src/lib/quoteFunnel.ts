export type QuoteDraft = {
 address: string; postal: string; city: string; service: string;
 estimate: number | null; unit: string; notes: string; createdAt: string;
};
export type QuoteReceipt = { id: string; submittedAt: string; draft: QuoteDraft };
const DRAFT_KEY="plowwow.quoteDraft.v1";
const RECEIPT_KEY="plowwow.quoteReceipt.v1";
const MAX_AGE=24*60*60*1000;
export function isQuoteDraft(value:unknown):value is QuoteDraft {
 if(!value||typeof value!=="object")return false;
 const d=value as QuoteDraft;
 return [d.address,d.postal,d.city,d.service,d.unit,d.notes,d.createdAt].every(v=>typeof v==="string")&&d.address.length>=8&&d.address.length<=200&&d.notes.length<=1000&&(d.estimate===null||(Number.isFinite(d.estimate)&&d.estimate>=0))&&Date.now()-Date.parse(d.createdAt)>=0&&Date.now()-Date.parse(d.createdAt)<MAX_AGE;
}
export function isQuoteReceipt(value:unknown):value is QuoteReceipt {
 if(!value||typeof value!=="object")return false;
 const r=value as QuoteReceipt;
 return typeof r.id==="string"&&r.id.length>=8&&isQuoteDraft(r.draft)&&Date.now()-Date.parse(r.submittedAt)>=0&&Date.now()-Date.parse(r.submittedAt)<MAX_AGE;
}
function read(key:string):unknown {try{return JSON.parse(sessionStorage.getItem(key)||"null");}catch{return null;}}
export function readQuoteDraft():QuoteDraft|null {const value=read(DRAFT_KEY);return isQuoteDraft(value)?value:null;}
export function readQuoteReceipt():QuoteReceipt|null {const value=read(RECEIPT_KEY);return isQuoteReceipt(value)?value:null;}
export function saveQuoteDraft(draft:QuoteDraft){try{sessionStorage.setItem(DRAFT_KEY,JSON.stringify(draft));sessionStorage.removeItem(RECEIPT_KEY);}catch{/* Route state provides an in-memory fallback. */}}
export function saveQuoteReceipt(id:string,draft:QuoteDraft):QuoteReceipt {const receipt={id,draft,submittedAt:new Date().toISOString()};try{sessionStorage.setItem(RECEIPT_KEY,JSON.stringify(receipt));}catch{/* Route state provides an in-memory fallback. */}return receipt;}
export function acceptedQuoteId(payload:unknown,error:unknown):string|null {
 if(error||!payload||typeof payload!=="object")return null;
 const p=payload as {success?:boolean;code?:string;id?:unknown};
 return p.success===true&&p.code==="ok"&&typeof p.id==="string"&&p.id.length>=8?p.id:null;
}
