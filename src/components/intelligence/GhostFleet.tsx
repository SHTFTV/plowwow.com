const GhostFleet = () => (
  <section
    aria-labelledby="ghost-fleet-heading"
    className="py-24 bg-intel-night text-white relative overflow-hidden"
  >
    <div
      aria-hidden="true"
      className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_hsl(var(--intel-blue)/0.2),_transparent_55%)]"
    />
    <div className="container relative z-10 grid lg:grid-cols-2 gap-12 items-center">
      <div>
        <p className="font-mono-tech text-xs tracking-[0.3em] text-intel-orange uppercase">
          Ghost Fleet Dispatch
        </p>
        <h2
          id="ghost-fleet-heading"
          className="font-display text-3xl md:text-5xl font-extrabold mt-3"
        >
          Unmarked. Tracked. <span className="text-intel-blue">Always on-time.</span>
        </h2>
        <p className="font-tech text-white/75 text-lg mt-5">
          Our Ghost Fleet runs anonymous, GPS-tracked trucks dispatched by the PWIE engine. Crews
          arrive in priority order — strata first, then commercial, then residential — with zero
          dispatcher friction.
        </p>
        <dl className="grid grid-cols-3 gap-4 mt-10 font-mono-tech">
          <div>
            <dt className="text-white/50 text-xs uppercase tracking-widest">Trucks</dt>
            <dd className="text-3xl font-bold text-intel-orange mt-1">38</dd>
          </div>
          <div>
            <dt className="text-white/50 text-xs uppercase tracking-widest">Avg ETA</dt>
            <dd className="text-3xl font-bold text-intel-orange mt-1">22m</dd>
          </div>
          <div>
            <dt className="text-white/50 text-xs uppercase tracking-widest">Coverage</dt>
            <dd className="text-3xl font-bold text-intel-orange mt-1">17 cities</dd>
          </div>
        </dl>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 font-mono-tech text-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-intel-blue uppercase tracking-widest text-xs">Live Dispatch Feed</span>
          <span className="inline-block w-2 h-2 rounded-full bg-intel-orange animate-pulse" />
        </div>
        <ul className="space-y-3">
          {[
            ["GF-07", "Metrotown Strata", "ETA 03:42"],
            ["GF-12", "PoCo Industrial Lot", "ETA 04:10"],
            ["GF-21", "Kerrisdale Townhomes", "ETA 04:28"],
            ["GF-04", "Langley Strip Mall", "ETA 04:55"],
          ].map(([id, site, eta]) => (
            <li key={id} className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-intel-orange">{id}</span>
              <span className="text-white/70">{site}</span>
              <span>{eta}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);

export default GhostFleet;
