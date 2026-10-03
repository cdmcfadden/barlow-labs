import type { Week } from "@/lib/finance/report";

// Server-rendered SVG: paired bars per week, spend in the site's primary
// orange and income in a muted tone, drawn to one shared scale.
export default function WeeklyChart({ weeks, selected }: { weeks: Week[]; selected: string[] }) {
  const W = 960;
  const H = 240;
  const pad = { l: 56, r: 12, t: 12, b: 28 };
  const max = Math.max(1, ...weeks.map((w) => Math.max(w.spend, w.income)));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const slot = innerW / weeks.length;
  const bar = Math.min(22, slot * 0.36);
  const y = (v: number) => pad.t + innerH - (v / top) * innerH;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const fmt = (v: number) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Spend and income per week">
      <defs>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="3" height="6" fill="hsl(var(--primary))" />
        </pattern>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="hsl(var(--border))" strokeWidth="1" />
          <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="hsl(var(--muted-foreground))">
            {fmt(t)}
          </text>
        </g>
      ))}
      {weeks.map((w, i) => {
        const cx = pad.l + slot * i + slot / 2;
        const isSel = selected.includes(w.start);
        return (
          <g key={w.start}>
            {isSel && (
              <rect x={pad.l + slot * i} y={pad.t} width={slot} height={innerH} fill="hsl(var(--secondary))" opacity="0.5" />
            )}
            <rect
              x={cx - bar - 2}
              y={y(w.spend)}
              width={bar}
              height={Math.max(0, innerH + pad.t - y(w.spend))}
              fill={w.partial ? "url(#hatch)" : "hsl(var(--primary))"}
              rx="2"
            >
              <title>{`Spent ${usd(w.spend)}`}</title>
            </rect>
            <rect
              x={cx + 2}
              y={y(w.income)}
              width={bar}
              height={Math.max(0, innerH + pad.t - y(w.income))}
              fill="hsl(var(--muted-foreground))"
              opacity="0.55"
              rx="2"
            >
              <title>{`Came in ${usd(w.income)}`}</title>
            </rect>
            <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill="hsl(var(--muted-foreground))">
              {w.partial ? "now" : label(w.start)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function niceStep(max: number) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}
const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const label = (key: string) =>
  new Date(key + "T12:00:00Z").toLocaleDateString("en-US", { month: "numeric", day: "numeric", timeZone: "UTC" });
