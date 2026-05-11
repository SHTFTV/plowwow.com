// Fetches current Burnaby weather from Environment Canada citypage XML feed.
// Burnaby shares the Metro Vancouver citypage: s0000141 (Vancouver) is the
// closest official EC city page. We expose a small JSON shape for the UI.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EC_URL =
  "https://dd.weather.gc.ca/citypage_weather/xml/BC/s0000141_e.xml";

function pick(xml: string, tag: string, attrs = ""): string | null {
  const re = new RegExp(
    `<${tag}${attrs ? `[^>]*${attrs}[^>]*` : "[^>]*"}>([\\s\\S]*?)</${tag}>`,
    "i",
  );
  const m = xml.match(re);
  if (!m) return null;
  return m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim();
}

function pickBlock(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  return xml.match(re)?.[1] ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const res = await fetch(EC_URL, {
      headers: { "User-Agent": "PlowWow-Burnaby/1.0 (weather widget)" },
    });
    if (!res.ok) throw new Error(`EC returned ${res.status}`);
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
    const observedAt = pick(current, "dateTime", `name="observation"`)
      ? pick(
          pickBlock(current, `dateTime name="observation"[^>]*`) ?? "",
          "textSummary",
        )
      : null;
    const stationObs = (() => {
      const dtBlocks = current.match(
        /<dateTime[^>]*name="observation"[^>]*>[\s\S]*?<\/dateTime>/i,
      );
      if (!dtBlocks) return null;
      return pick(dtBlocks[0], "textSummary");
    })();

    const forecastPeriod = (() => {
      const m = firstForecast.match(/<period[^>]*textForecastName="([^"]+)"/i);
      return m?.[1] ?? null;
    })();
    const forecastSummary = pick(firstForecast, "textSummary");
    const snowAmount =
      pick(pickBlock(firstForecast, "precipitation") ?? "", "accumulation") ??
      null;

    const data = {
      source: "Environment Canada",
      stationUrl: "https://weather.gc.ca/city/pages/bc-74_metric_e.html",
      observedAt: stationObs,
      current: {
        temperatureC: temperature ? Number(temperature) : null,
        condition,
        windKph: windSpeed && windSpeed !== "calm" ? Number(windSpeed) : 0,
        windDirection: windDir,
        humidity: humidity ? Number(humidity) : null,
      },
      forecast: {
        period: forecastPeriod,
        summary: forecastSummary,
        snowAccumulation: snowAmount,
      },
    };

    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=600",
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
