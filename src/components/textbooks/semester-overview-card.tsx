function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5 px-3 text-center">
      <p className="text-[28px] font-bold leading-none tracking-tight text-foreground">{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

export function SemesterOverviewCard({
  total,
  acquired,
  remaining,
}: {
  total: number;
  acquired: number;
  remaining: number;
}) {
  return (
    <div className="rounded-card border border-card-border bg-card px-5 py-6 shadow-card">
      <div className="flex items-stretch divide-x divide-border">
        <Stat value={total} label="Materials" />
        <Stat value={acquired} label="Acquired" />
        <Stat value={remaining} label="Remaining" />
      </div>
    </div>
  );
}
