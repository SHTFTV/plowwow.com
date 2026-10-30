/** A repeated-prose backstop, not a substitute for editorial judgement. */
export function editorialParagraphs(raw: string): string[] {
  const body = raw.split(/Markdown Content:\s*\n/)[1] || raw;
  return body.split(/\n\s*\n/).map(p => p.trim()).filter(p => {
    if (/^(?:#|!\[|\*|\-|Title:|URL Source:|Published:|Updated:|Description:)/.test(p)) return false;
    if (/^(?:Historical event:|Hero and share artwork:|Sources? reviewed|Photo credit:|Image credit:)/i.test(p)) return false;
    return p.split(/\s+/).length >= 35;
  }).map(p => p.toLowerCase().replace(/https?:\/\/\S+/g, '')
    .replace(/\b(?:greater vancouver|new westminster|port moody|abbotsford|aldergrove|coquitlam|langley|surrey|burnaby|vancouver|richmond)\b/g, 'location')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim());
}
function shingles(p: string): Set<string> {
  const w = p.split(' '); return new Set(w.slice(0, -4).map((_, i) => w.slice(i, i + 5).join(' ')));
}
export function repeatedProse(a: string, b: string) {
  const ap = editorialParagraphs(a), bp = editorialParagraphs(b);
  const matches = ap.filter(p => {const ps=shingles(p);return bp.some(q=>{const qs=shingles(q);const overlap=[...ps].filter(x=>qs.has(x)).length;return overlap/Math.max(1,Math.min(ps.size,qs.size))>=0.78;});});
  const words=matches.reduce((n,p)=>n+p.split(' ').length,0);
  const total=ap.reduce((n,p)=>n+p.split(' ').length,0);
  return {matchedParagraphs:matches.length,matchedWords:words,coverage:words/Math.max(1,total),flagged:matches.length>=3&&words>=180&&words/Math.max(1,total)>=0.35};
}
export function collectChangedMarkdown(run: (command: string)=>string, base='origin/main'): string[] {
  let committed='';
  try {const atHead=run(`git rev-parse ${base}`).trim()===run('git rev-parse HEAD').trim();committed=run(`git diff --name-only ${atHead?'HEAD^':base}...HEAD -- src/content/legacy/blog`);} catch { /* initial checkout can still have working changes */ }
  return [...new Set([committed,run('git diff --name-only HEAD -- src/content/legacy/blog'),run('git ls-files --others --exclude-standard -- src/content/legacy/blog')].join('\n').split('\n').map(x=>x.trim()).filter(x=>x.endsWith('.md')).map(x=>x.split('/').pop()!))];
}
