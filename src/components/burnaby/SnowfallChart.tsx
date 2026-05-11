import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data = [
  { month: "Oct", mm: 5 },
  { month: "Nov", mm: 45 },
  { month: "Dec", mm: 135 },
  { month: "Jan", mm: 120 },
  { month: "Feb", mm: 105 },
  { month: "Mar", mm: 40 },
];

const SnowfallChart = () => (
  <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
    <h3 className="font-heading text-xl font-bold text-foreground mb-1">
      Historical Monthly Snowfall in Burnaby
    </h3>
    <p className="text-sm text-muted-foreground mb-6">
      Average accumulation (mm) — Environment Canada normals
    </p>
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} unit="mm" />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: number) => [`${v} mm`, "Snowfall"]}
          />
          <Bar dataKey="mm" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default SnowfallChart;
