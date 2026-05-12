const steps = [
  { k: "01", h: "Forecast Ingest", b: "We pull Environment Canada, NOAA, and live radar every 10 minutes." },
  { k: "02", h: "Risk Score", b: "PWIE assigns each property a 0–100 ice risk score per shift window." },
  { k: "03", h: "Auto-Dispatch", b: "Ghost Fleet trucks are routed by score, priority tier, and SLA." },
  { k: "04", h: "Proof Capture", b: "On arrival, photos + GPS + Salt-Scan readings hit the Wow-Shield Vault." },
];

const PWIEEngine = () => (
  <section
    id="pwie-engine"
    aria-labelledby="pwie-heading"
    className="py-24 bg-intel-night text-white relative overflow-hidden"
  >
    <div
      aria-hidden="true"
      className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_hsl(var(--intel-orange)/0.15),_transparent_50%)]"
    />
    <div className="container relative z-10">
      <div className="max-w-3xl">
        <p className="font-mono-tech text-xs tracking-[0.3em] text-intel-orange uppercase">
          PWIE • Ice-Fighter Formula
        </p>
        <h2 id="pwie-heading" className="font-display text-3xl md:text-5xl font-extrabold mt-3">
          The Predictive Winter <br className="hidden md:block" />
          <span className="text-intel-blue">Intelligence Engine</span>
        </h2>
        <p className="font-tech text-white/75 text-lg mt-5 max-w-2xl">
          PWIE turns four data streams into one decision: who to dispatch, where, with what salt
          load, and at what minute. It's how a strata in Metrotown gets cleared before sunrise —
          and why your invoice matches the storm record.
        </p>
      </div>
      <ol className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
        {steps.map((s) => (
          <li
            key={s.k}
            className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6"
          >
            <div className="font-mono-tech text-intel-orange text-sm">{s.k}</div>
            <h3 className="font-display text-xl font-bold mt-2">{s.h}</h3>
            <p className="font-tech text-white/70 text-sm mt-2 leading-relaxed">{s.b}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default PWIEEngine;
