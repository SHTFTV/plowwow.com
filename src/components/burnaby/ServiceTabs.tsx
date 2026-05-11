import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check } from "lucide-react";

const residential = [
  "Driveway & walkway plowing",
  "Front step & entryway salting",
  "Roof-edge ice dam prevention",
  "Per-visit or seasonal billing",
  "Photo-documented service",
];

const commercial = [
  "24/7 parking lot plowing",
  "ASTM-rated salt & sand application with logs",
  "Snow stacking & off-site relocation",
  "Strata & property management reporting",
  "Pre-storm site visits & risk assessment",
];

const Item = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-2 text-sm">
    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
    <span className="text-muted-foreground">{children}</span>
  </li>
);

const ServiceTabs = () => (
  <section className="py-20 bg-section-alt" id="services-detail">
    <div className="container">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
          Residential & Commercial Services
        </h2>
        <p className="text-muted-foreground">
          Pick the service track that fits your property.
        </p>
      </div>
      <Tabs defaultValue="residential" className="max-w-3xl mx-auto">
        <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto">
          <TabsTrigger value="residential">Residential</TabsTrigger>
          <TabsTrigger value="commercial">Commercial & Strata</TabsTrigger>
        </TabsList>
        <TabsContent value="residential" className="mt-8">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
            <h3 className="font-heading font-bold text-xl text-foreground mb-4">
              Home plowing & salting
            </h3>
            <ul className="space-y-2">
              {residential.map((r) => <Item key={r}>{r}</Item>)}
            </ul>
          </div>
        </TabsContent>
        <TabsContent value="commercial" className="mt-8">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
            <h3 className="font-heading font-bold text-xl text-foreground mb-4">
              Commercial, strata & high-density
            </h3>
            <ul className="space-y-2">
              {commercial.map((r) => <Item key={r}>{r}</Item>)}
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  </section>
);

export default ServiceTabs;
