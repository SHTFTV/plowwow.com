import { CloudSnow, Eye } from "lucide-react";

const WeatherBrain = () => (
  <section aria-labelledby="weather-brain-heading" className="py-24 bg-background">
    <div className="container grid lg:grid-cols-2 gap-12 items-center">
      <div>
        <p className="font-mono-tech text-xs tracking-[0.3em] text-intel-orange uppercase">
          Weather Brain + Salt-Scan
        </p>
        <h2
          id="weather-brain-heading"
          className="font-display text-3xl md:text-5xl font-extrabold mt-3"
        >
          Hyper-local forecasting meets <span className="text-intel-blue">computer vision.</span>
        </h2>
        <p className="font-tech text-muted-foreground text-lg mt-5">
          Weather Brain fuses Environment Canada feeds with on-the-ground sensor data to forecast
          ice and snow accumulation by neighbourhood — not by region. Salt-Scan, powered by Nano
          Banana 2 vision AI, then reads each lot to apply the correct salt load.
        </p>
        <ul className="mt-8 space-y-4">
          <li className="flex gap-4">
            <CloudSnow className="w-6 h-6 text-intel-orange shrink-0 mt-1" aria-hidden="true" />
            <div>
              <h3 className="font-display text-lg font-bold">Postal-code accuracy</h3>
              <p className="font-tech text-sm text-muted-foreground">
                Burnaby Mountain gets a different forecast than Metrotown — and a different crew.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <Eye className="w-6 h-6 text-intel-orange shrink-0 mt-1" aria-hidden="true" />
            <div>
              <h3 className="font-display text-lg font-bold">Vision-verified salting</h3>
              <p className="font-tech text-sm text-muted-foreground">
                Salt-Scan photographs the surface and recommends grams per m². Less waste, fewer slips.
              </p>
            </div>
          </li>
        </ul>
      </div>
      <div className="rounded-3xl bg-intel-night text-white p-8 shadow-2xl">
        <div className="font-mono-tech text-xs text-intel-blue uppercase tracking-widest">
          Live Sample • Burnaby V5H
        </div>
        <div className="mt-4 space-y-3 font-mono-tech text-sm">
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/60">Risk Score</span>
            <span className="text-intel-orange font-bold">82 / 100</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/60">Forecast Accumulation</span>
            <span>4.2 cm by 06:00</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-white/60">Salt-Scan Recommendation</span>
            <span>22 g/m²</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Dispatch ETA</span>
            <span className="text-intel-blue font-bold">04:15</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default WeatherBrain;
