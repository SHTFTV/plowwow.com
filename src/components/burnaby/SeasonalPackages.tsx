import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

const rows = [
  { label: "Priority dispatch", oncall: false, seasonal: true },
  { label: "Unlimited visits Nov–Mar", oncall: false, seasonal: true },
  { label: "Pre-storm salting", oncall: false, seasonal: true },
  { label: "Photo & GPS service log", oncall: true, seasonal: true },
  { label: "Per-visit billing", oncall: true, seasonal: false },
  { label: "Fixed seasonal price", oncall: false, seasonal: true },
];

const Cell = ({ ok }: { ok: boolean }) =>
  ok ? <Check className="w-5 h-5 text-primary" /> : <X className="w-5 h-5 text-muted-foreground/50" />;

const SeasonalPackages = () => (
  <section className="py-20" id="packages">
    <div className="container">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
          Seasonal Packages
        </h2>
        <p className="text-muted-foreground">
          Choose On-Call flexibility, or lock in Seasonal Unlimited before the first storm.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">On-Call</p>
          <h3 className="font-heading font-black text-3xl text-foreground mt-1 mb-4">Pay per visit</h3>
          <p className="text-muted-foreground mb-6 text-sm">
            Flexible service for properties that only need help during major events.
          </p>
          <Button asChild variant="outline" className="rounded-full font-bold">
            <a href="#burnaby-quote">Request On-Call Quote</a>
          </Button>
        </div>
        <div className="bg-card border-2 border-secondary rounded-2xl p-8 shadow-xl relative">
          <span className="absolute -top-3 right-6 bg-secondary text-secondary-foreground text-xs font-bold px-3 py-1 rounded-full shadow">
            Most popular
          </span>
          <p className="text-sm font-semibold text-secondary uppercase tracking-wide">Seasonal Unlimited</p>
          <h3 className="font-heading font-black text-3xl text-foreground mt-1 mb-4">Fixed price · Nov–Mar</h3>
          <p className="text-muted-foreground mb-6 text-sm">
            Priority dispatch, unlimited visits, predictable budgeting — ideal for strata & commercial.
          </p>
          <Button asChild className="rounded-full font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground">
            <a href="#burnaby-quote">Lock In Seasonal Rate</a>
          </Button>
        </div>
      </div>

      <div className="mt-10 max-w-3xl mx-auto bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-section-alt">
            <tr>
              <th className="text-left p-4 font-heading font-bold text-foreground">Feature</th>
              <th className="p-4 font-heading font-bold text-foreground">On-Call</th>
              <th className="p-4 font-heading font-bold text-foreground">Seasonal Unlimited</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-border">
                <td className="p-4 text-muted-foreground">{r.label}</td>
                <td className="p-4 text-center"><div className="inline-flex"><Cell ok={r.oncall} /></div></td>
                <td className="p-4 text-center"><div className="inline-flex"><Cell ok={r.seasonal} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </section>
);

export default SeasonalPackages;
