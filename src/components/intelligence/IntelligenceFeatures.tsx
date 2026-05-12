import { Activity, CloudSnow, Shield, Truck, FileBarChart, Sparkles } from "lucide-react";

const features = [
  { icon: Activity, title: "PWIE Engine", body: "Our proprietary Predictive Winter Intelligence Engine assigns crews before flakes hit the ground." },
  { icon: CloudSnow, title: "Weather Brain", body: "Hyper-local Environment Canada + radar fusion forecasts down to your postal code." },
  { icon: Sparkles, title: "Salt-Scan AI", body: "Computer vision (Nano Banana 2) measures ice depth so we apply the exact salt load — never over, never under." },
  { icon: Shield, title: "Wow-Shield™ Vault", body: "Time-stamped before/after photos, GPS pins, and service logs stored for liability defense." },
  { icon: Truck, title: "Ghost Fleet Dispatch", body: "Anonymous, GPS-tracked trucks routed by AI for fastest priority response across Metro Vancouver." },
  { icon: FileBarChart, title: "Progress Billing", body: "Transparent per-event invoices that match the storm record. No padding, no surprises." },
];

const IntelligenceFeatures = () => (
  <section
    aria-labelledby="intel-features-heading"
    className="py-20 bg-section-alt"
  >
    <div className="container">
      <div className="max-w-2xl mx-auto text-center mb-14">
        <p className="font-mono-tech text-xs tracking-[0.3em] text-intel-orange uppercase">
          Proof of Work
        </p>
        <h2
          id="intel-features-heading"
          className="font-display text-3xl md:text-5xl font-extrabold mt-3"
        >
          Six Systems. <span className="text-intel-blue">One Storm-Proof Service.</span>
        </h2>
      </div>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map(({ icon: Icon, title, body }) => (
          <li
            key={title}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-lg transition-shadow"
          >
            <div className="w-12 h-12 rounded-xl bg-intel-orange/10 flex items-center justify-center text-intel-orange mb-4">
              <Icon className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">{title}</h3>
            <p className="font-tech text-muted-foreground text-sm leading-relaxed">{body}</p>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export default IntelligenceFeatures;
