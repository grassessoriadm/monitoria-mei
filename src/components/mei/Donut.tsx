export function Donut({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? done / total : 0;
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const color = pct === 1 ? "var(--ok)" : pct === 0 ? "var(--bad)" : "var(--warn)";

  return (
    <div className="relative grid size-[132px] shrink-0 place-items-center">
      <svg width="132" height="132" viewBox="0 0 132 132" className="-rotate-90">
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--muted)" strokeWidth="12" />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset .5s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold tracking-tight">{Math.round(pct * 100)}%</div>
        <div className="text-xs text-muted-foreground">
          {done}/{total}
        </div>
      </div>
    </div>
  );
}

export function MiniProgress({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? (done / total) * 100 : 0;
  const color = pct === 100 ? "var(--ok)" : pct === 0 ? "var(--bad)" : "var(--warn)";
  return (
    <div className="h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}