const zones = [
  { id: "north", name: "North Burnaby", x: 50, y: 30, hoods: "Capitol Hill, Burnaby Heights" },
  { id: "mountain", name: "Burnaby Mountain", x: 78, y: 22, hoods: "SFU, UniverCity" },
  { id: "brentwood", name: "Brentwood", x: 48, y: 50, hoods: "Brentwood, Willingdon" },
  { id: "metrotown", name: "Metrotown", x: 45, y: 72, hoods: "Metrotown, Deer Lake" },
  { id: "south", name: "South Burnaby", x: 60, y: 88, hoods: "Edmonds, Big Bend" },
  { id: "lougheed", name: "Lougheed", x: 82, y: 55, hoods: "Lougheed, Cariboo" },
];

const ServiceMap = () => (
  <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
    <h3 className="font-heading text-xl font-bold text-foreground mb-1">
      Burnaby Service Zones
    </h3>
    <p className="text-sm text-muted-foreground mb-6">
      Priority dispatch across all six zones — tap a zone to learn more.
    </p>
    <div className="relative aspect-[4/3] w-full rounded-xl bg-[hsl(var(--accent))] overflow-hidden">
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <path
          d="M15,20 L85,15 L92,55 L80,92 L25,90 L10,60 Z"
          fill="hsl(var(--primary) / 0.12)"
          stroke="hsl(var(--primary))"
          strokeWidth="0.5"
        />
        {zones.map((z) => (
          <g key={z.id}>
            <circle cx={z.x} cy={z.y} r="3" fill="hsl(var(--secondary))" stroke="white" strokeWidth="0.6" />
            <circle cx={z.x} cy={z.y} r="6" fill="hsl(var(--secondary) / 0.25)" />
          </g>
        ))}
      </svg>
      <div className="absolute inset-0 pointer-events-none">
        {zones.map((z) => (
          <div
            key={z.id}
            className="absolute -translate-x-1/2 mt-2 text-[11px] font-bold text-foreground bg-white/90 backdrop-blur px-2 py-0.5 rounded shadow-sm whitespace-nowrap"
            style={{ left: `${z.x}%`, top: `${z.y}%` }}
          >
            {z.name}
          </div>
        ))}
      </div>
    </div>
    <ul className="mt-6 grid sm:grid-cols-2 gap-2 text-sm">
      {zones.map((z) => (
        <li key={z.id} className="flex items-start gap-2">
          <span className="w-2 h-2 mt-1.5 rounded-full bg-secondary shrink-0" />
          <span>
            <span className="font-semibold text-foreground">{z.name}</span>{" "}
            <span className="text-muted-foreground">— {z.hoods}</span>
          </span>
        </li>
      ))}
    </ul>
  </div>
);

export default ServiceMap;
