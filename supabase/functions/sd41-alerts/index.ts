// Fetches latest news items from Burnaby School District 41 RSS feed.
// Highlights snow/closure-related alerts so the UI can surface them first.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FEED_URL = "https://burnabyschools.ca/feed/";
const NEWS_URL = "https://burnabyschools.ca/category/recent-news/";

const CLOSURE_RE =
  /\b(closure|closed|snow ?day|snow|weather|cancell?ed|delay|delayed start|inclement|storm)\b/i;

function pick(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!m) return null;
  return m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim();
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "’")
    .replace(/&#8230;/g, "…")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const res = await fetch(FEED_URL, {
      headers: { "User-Agent": "PlowWow-Burnaby/1.0" },
    });
    if (!res.ok) throw new Error(`SD41 feed ${res.status}`);
    const xml = await res.text();

    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      .map((m) => m[1])
      .slice(0, 12)
      .map((block) => {
        const title = stripHtml(pick(block, "title") ?? "");
        const link = pick(block, "link") ?? "";
        const pubDate = pick(block, "pubDate") ?? "";
        const description = stripHtml(pick(block, "description") ?? "").slice(0, 200);
        const text = `${title} ${description}`;
        const isClosure = CLOSURE_RE.test(text);
        return { title, link, pubDate, description, isClosure };
      });

    // Closure-related first, then chronological.
    items.sort((a, b) => {
      if (a.isClosure !== b.isClosure) return a.isClosure ? -1 : 1;
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    });

    return new Response(
      JSON.stringify({
        source: "Burnaby School District 41",
        feedUrl: FEED_URL,
        newsUrl: NEWS_URL,
        fetchedAt: new Date().toISOString(),
        items: items.slice(0, 5),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=900",
        },
      },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
