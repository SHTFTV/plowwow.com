import { ShieldCheck, Camera, MapPin, Clock } from "lucide-react";

const items = [
  { icon: Camera, h: "Before / After Photos", b: "Time-stamped, GPS-tagged image pairs for every visit." },
  { icon: MapPin, h: "Route Verification", b: "GPS breadcrumbs prove the truck was on-site, not in the next zone." },
  { icon: Clock, h: "Service Logs", b: "Minute-accurate clock-in/out records for insurance & strata audits." },
  { icon: ShieldCheck, h: "Liability-Proof", b: "Hand the Vault link to your insurer. Slip-and-fall claims, neutralized." },
];

const WowShield = () => (
  <section
    aria-labelledby="wow-shield-heading"
    className="py-24 bg-section-alt"
  >
    <div className="container">
      <div className="max-w-3xl">
        <p className="font-mono-tech text-xs tracking-[0.3em] text-intel-orange uppercase">
          Wow-Shield™ Liability Vault
        </p>
        <h2
          id="wow-shield-heading"
          className="font-display text-3xl md:text-5xl font-extrabold mt-3"
        >
          The strongest <span className="text-intel-blue">slip-and-fall defense</span> in BC snow removal.
        </h2>
        <p className="font-tech text-muted-foreground text-lg mt-5">
          Every visit produces a permanent, audit-ready record. Strata councils and property
          managers get one secure link to share with their insurer.
        </p>
      </div>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
        {items.map(({ icon: Icon, h, b }) => (
          <li key={h} className="rounded-2xl bg-card border border-border p-6 shadow-sm">
            <Icon className="w-7 h-7 text-intel-orange" aria-hidden="true" />
            <h3 className="font-display text-lg font-bold mt-3">{h}</h3>
            <p className="font-tech text-sm text-muted-foreground mt-2">{b}</p>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export default WowShield;
