// Fetches current Burnaby/Vancouver weather from Environment Canada citypage XML.
// EC dd.weather.gc.ca now publishes hourly timestamped files:
//   https://dd.weather.gc.ca/today/citypage_weather/BC/{HH}/{TS}_MSC_CitypageWeather_s0000141_en.xml
// We resolve the latest file then parse the fields the UI needs.
// Site s0000141 = Vancouver (closest EC city page for Burnaby).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE = "s0000141"; // Vancouver / Metro Vancouver
const BASE = "https://dd.weather.gc.ca/today/citypage_weather/BC";

async function findLatestUrl(): Promise<string> {
  for (let offset = 0; offset < 4; offset++) {
    const hour = String((new Date().getUTCHours() - offset + 24) % 24).padStart(2, "0");
    const listingRes = await fetch(`${BASE}/${hour}/`, {
      headers: { "User-Agent": "PlowWow-Burnaby/1.0" },
    });
    if (!listingRes.ok) continue;
    const html = await listingRes.text();
    const matches = [
      ...html.matchAll(
        new RegExp(`href="([^"]*_MSC_CitypageWeather_${SITE}_en\\.xml)"`, "g"),
      ),
    ].map((m) => m[1]);
    if (matches.length === 0) continue;
    matches.sort();
    return `${BASE}/${hour}/${matches[matches.length - 1]}`;
  }
  throw new Error("No EC file found in last 4 hours");
}

function pick(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!m) return null;
  return m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim();
}

function pickBlock(xml: string, tag: string): string | null {
  return xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"))?.[1] ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = await findLatestUrl();
    const res = await fetch(url, { headers: { "User-Agent": "PlowWow-Burnaby/1.0" } });
    if (!res.ok) throw new Error(`EC fetch ${res.status}`);
    const xml = await res.text();

    const current = pickBlock(xml, "currentConditions") ?? "";
    const forecastGroup = pickBlock(xml, "forecastGroup") ?? "";
    const firstForecast = pickBlock(forecastGroup, "forecast") ?? "";

    const temperature = pick(current, "temperature");
    const condition = pick(current, "condition");
    const windBlock = pickBlock(current, "wind") ?? "";
    const windSpeed = pick(windBlock, "speed");
    const windDir = pick(windBlock, "direction");
    const humidity = pick(current, "relativeHumidity");

    // observation timestamp (the dateTime block with name="observation")
    const obsBlock = current.match(
      /<dateTime[^>]*name="observation"[^>]*UTCOffset="[^"]*"[^>]*>[\s\S]*?<\/dateTime>/i,
    )?.[0] ?? current.match(
      /<dateTime[^>]*name="observation"[^>]*>[\s\S]*?<\/dateTime>/i,
    )?.[0] ?? "";
    const observedAt = pick(obsBlock, "textSummary");

    const periodMatch = firstForecast.match(/<period[^>]*textForecastName="([^"]+)"/i);
    const forecastPeriod = periodMatch?.[1] ?? null;
    const forecastSummary = pick(firstForecast, "textSummary");
    const precipBlock = pickBlock(firstForecast, "precipitation") ?? "";
    const snowAccum = pick(precipBlock, "accumulation");

    return new Response(
      JSON.stringify({
        source: "Environment Canada",
        station: "Vancouver (s0000141)",
        sourceUrl: url,
        observedAt,
        current: {
          temperatureC: temperature !== null ? Number(temperature) : null,
          condition,
          windKph: windSpeed && windSpeed !== "calm" ? Number(windSpeed) : 0,
          windDirection: windDir,
          humidity: humidity ? Number(humidity) : null,
        },
        forecast: {
          period: forecastPeriod,
          summary: forecastSummary,
          snowAccumulation: snowAccum,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=600",
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
