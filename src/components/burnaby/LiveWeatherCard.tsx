import { useEffect, useState } from "react";
import { Thermometer, Wind, Droplets, CloudSnow, ExternalLink, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

type WeatherData = {
  source: string;
  station: string;
  observedAt: string | null;
  current: {
    temperatureC: number | null;
    condition: string | null;
    windKph: number;
    windDirection: string | null;
    humidity: number | null;
  };
  forecast: {
    period: string | null;
    summary: string | null;
    snowAccumulation: string | null;
  };
};

const LiveWeatherCard = () => {
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke<WeatherData>("burnaby-weather");
      if (error) throw error;
      if (!data) throw new Error("No data");
      setData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load weather");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 10 * 60 * 1000); // refresh every 10 min
    return () => clearInterval(id);
  }, []);

  return (
    <div className="group relative rounded-2xl p-6 border border-white/40 bg-white/60 backdrop-blur-xl shadow-lg">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 to-white/10 pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Thermometer className="w-6 h-6" />
          </div>
          <button
            onClick={load}
            disabled={loading}
            aria-label="Refresh weather"
            className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <h3 className="font-heading font-bold text-lg text-foreground mb-1">
          Burnaby Live Weather
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Environment Canada · {data?.station ?? "Metro Vancouver"}
        </p>

        {loading && !data && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}

        {error && !data && (
          <p className="text-sm text-destructive">Couldn't load live data: {error}</p>
        )}

        {data && (
          <>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-4xl font-black text-foreground">
                {data.current.temperatureC !== null ? `${data.current.temperatureC}°` : "—"}
              </span>
              <span className="text-sm text-muted-foreground">
                {data.current.condition ?? "—"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4">
              <div className="flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5" />
                {data.current.windKph
                  ? `${data.current.windDirection ?? ""} ${data.current.windKph} km/h`.trim()
                  : "Calm"}
              </div>
              <div className="flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5" />
                {data.current.humidity !== null ? `${data.current.humidity}% RH` : "—"}
              </div>
              {data.forecast.snowAccumulation && (
                <div className="col-span-2 flex items-center gap-1.5 text-primary font-semibold">
                  <CloudSnow className="w-3.5 h-3.5" />
                  Snow expected: {data.forecast.snowAccumulation}
                </div>
              )}
            </div>

            {data.forecast.summary && (
              <p className="text-xs text-foreground/80 leading-relaxed mb-3">
                <span className="font-semibold">{data.forecast.period}:</span>{" "}
                {data.forecast.summary}
              </p>
            )}

            {data.observedAt && (
              <p className="text-[10px] text-muted-foreground mb-3">
                Observed {data.observedAt}
              </p>
            )}
          </>
        )}

        <a
          href="https://weather.gc.ca/city/pages/bc-74_metric_e.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          Full EC forecast <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};

export default LiveWeatherCard;
