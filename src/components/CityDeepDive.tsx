import { useEffect, useState } from "react";
import { Cloud, ExternalLink, ListChecks, Phone, Scale } from "lucide-react";
import type { LocationDeepData } from "@/data/locations";

type WeatherState = { temp: number | null; snowfall: number | null; code: number | null; loading: boolean; error: string | null };
const conditionFromCode = (code: number | null): string => {
  if (code === null) return "Conditions unavailable";
  if ([71,73,75,77,85,86].includes(code)) return "Active snowfall";
  if ([66,67].includes(code)) return "Freezing rain — ice risk";
  if ([51,53,55,61,63,65,80,81,82].includes(code)) return "Rain — refreeze possible";
  if ([45,48].includes(code)) return "Fog — icy surface risk";
  if ([1,2,3].includes(code)) return "Partly cloudy";
  if (code === 0) return "Clear";
  return "Monitor conditions";
};

const CityDeepDive = ({ data }: { data: LocationDeepData }) => {
  const [weather, setWeather] = useState<WeatherState>({ temp:null, snowfall:null, code:null, loading:true, error:null });
  useEffect(() => {
    let cancelled=false;
    (async()=>{try{const r=await fetch(data.weather_api.open_meteo_url);if(!r.ok)throw new Error(`Weather ${r.status}`);const d=await r.json();if(!cancelled)setWeather({temp:d?.current?.temperature_2m??null,snowfall:d?.current?.snowfall??null,code:d?.current?.weather_code??null,loading:false,error:null});}catch(e){if(!cancelled)setWeather(w=>({...w,loading:false,error:(e as Error).message}));}})();
    return()=>{cancelled=true;};
  },[data.weather_api.open_meteo_url]);

  return <>
    <section className="py-12 bg-gradient-to-br from-primary/5 to-secondary/5" id="weather"><div className="container max-w-4xl">
      <div className="flex items-center gap-3 mb-4"><Cloud className="w-6 h-6 text-primary"/><h2 className="text-2xl md:text-3xl font-black">Current conditions in {data.city}</h2></div>
      <div className="grid sm:grid-cols-3 gap-4 bg-card rounded-2xl border p-6">
        <div><p className="text-xs uppercase font-bold text-muted-foreground">Temperature</p><p className="text-3xl font-black mt-1">{weather.loading?"…":weather.temp!==null?`${Math.round(weather.temp)}°C`:"—"}</p></div>
        <div><p className="text-xs uppercase font-bold text-muted-foreground">Conditions</p><p className="text-lg font-bold mt-2">{weather.loading?"Loading…":conditionFromCode(weather.code)}</p></div>
        <div><p className="text-xs uppercase font-bold text-muted-foreground">Current snowfall</p><p className="text-3xl font-black mt-1">{weather.loading?"…":weather.snowfall!==null?`${weather.snowfall.toFixed(1)} cm`:"—"}</p></div>
      </div>
      <p className="text-sm text-muted-foreground mt-3">Weather data via Open-Meteo. Confirm warnings and forecasts with <a href={data.weather_api.environment_canada_url} target="_blank" rel="noopener" className="text-primary font-semibold hover:underline">Environment Canada</a>.</p>
    </div></section>

    <section className="py-14" id="booking-options"><div className="container max-w-4xl">
      <div className="flex items-center gap-3 mb-4"><ListChecks className="w-6 h-6 text-primary"/><h2 className="text-3xl font-black">How to book PlowWow in {data.city}</h2></div>
      <p className="text-muted-foreground mb-6">PlowWow uses planned snow routes. Choose the arrangement that fits how often the property needs service.</p>
      <div className="grid md:grid-cols-3 gap-4">
        <article className="rounded-2xl border bg-card p-6"><p className="text-xs uppercase font-bold text-primary">Route booking</p><h3 className="text-xl font-black mt-1 mb-3">5× Bookings</h3><p className="text-sm text-muted-foreground">Purchase five snow-service bookings to get the property onto a planned PlowWow route. Routes are built around approximately five-hour operating windows during snow events.</p></article>
        <article className="rounded-2xl border bg-card p-6"><p className="text-xs uppercase font-bold text-primary">Season coverage</p><h3 className="text-xl font-black mt-1 mb-3">One-Price Seasonal Contract</h3><p className="text-sm text-muted-foreground">Agree on one seasonal price for the contracted property and scope. The site is incorporated into PlowWow's seasonal route planning for the contract period.</p></article>
        <article className="rounded-2xl border bg-card p-6"><p className="text-xs uppercase font-bold text-primary">As needed</p><h3 className="text-xl font-black mt-1 mb-3">Single-Use Service</h3><p className="text-sm text-muted-foreground">Properties without a five-booking or seasonal arrangement can request individual snow-event service. Single-use work is paid before or during the snow event and is subject to route availability.</p></article>
      </div>
      <div className="mt-6 rounded-2xl border bg-muted/30 p-5"><p className="font-bold">Five-hour routes are the operating plan, not a universal completion guarantee.</p><p className="text-sm text-muted-foreground mt-1">Timing can vary with snowfall, ice, traffic, access, property scope and safety conditions.</p></div>
    </div></section>

    <section className="py-14 bg-muted/30" id="local-winter-information"><div className="container max-w-4xl">
      <h2 className="text-3xl font-black mb-5">{data.city} winter information</h2><div className="grid md:grid-cols-2 gap-5">
        <article className="rounded-2xl border bg-card p-6"><h3 className="font-black text-xl mb-3">Local snow-clearing rules</h3><p className="text-muted-foreground mb-3">{data.bylaw.rule}</p><p className="text-sm text-muted-foreground mb-3">{data.bylaw.authority}</p><a href={data.bylaw.link} target="_blank" rel="noopener" className="text-primary font-semibold hover:underline inline-flex items-center gap-1"><Scale className="w-4 h-4"/>Official local source <ExternalLink className="w-3 h-3"/></a></article>
        <article className="rounded-2xl border bg-card p-6"><h3 className="font-black text-xl mb-3">Property-specific planning</h3><p className="text-muted-foreground">Snow and ice service depends on entrances, sidewalks, drive aisles, parking areas, loading areas and the contracted scope. PlowWow quotes the actual property rather than publishing a made-up city-wide price table.</p></article>
      </div>
    </div></section>

    <section className="py-14" id="city-faqs"><div className="container max-w-3xl"><h2 className="text-3xl font-black mb-6">Snow service questions in {data.city}</h2><div className="space-y-4">{data.faq.map(f=><article key={f.q} className="rounded-xl border bg-card p-5"><h3 className="font-bold">{f.q}</h3><p className="text-sm text-muted-foreground mt-2">{f.a}</p></article>)}</div><div className="mt-8 rounded-2xl bg-primary text-primary-foreground p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><p className="font-black text-xl">Need snow service in {data.city}?</p><p className="text-sm opacity-90">Ask about five-booking route placement, a seasonal contract or single-use availability.</p></div><a href="tel:6047611518" className="inline-flex items-center gap-2 font-black"><Phone className="w-5 h-5"/>604-761-1518</a></div></div></section>
  </>;
};
export default CityDeepDive;
