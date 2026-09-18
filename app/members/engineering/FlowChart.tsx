"use client";

import { useState } from "react";

type Bin = { start: number; end: number; created: number; shipped: number };

// Validated as a pair against the card surface (#171c26): CVD ΔE 26.8,
// both ≥ 3:1. Values and labels stay in text colours, never these.
const CREATED = "#3987e5";
const SHIPPED = "#d95926";

const W = 720;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 28, left: 32 };

function fmt(t: number) {
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export default function FlowChart({ series, daily }: { series: Bin[]; daily: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...series.flatMap((b) => [b.created, b.shipped]));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const band = plotW / series.length;
  const bar = Math.min(18, (band - 10) / 2);
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const labelEvery = Math.ceil(series.length / 7);

  return (
    <figure className="relative">
      <div className="mb-3 flex items-center gap-5 text-sm text-muted-foreground">
        <Legend color={CREATED} label="Created" />
        <Legend color={SHIPPED} label="Shipped to Live" />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Tickets created and shipped to Live over time">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="hsl(220 20% 22%)" strokeWidth={t === 0 ? 1 : 0.5} />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="hsl(40 20% 65%)">
              {t}
            </text>
          </g>
        ))}
        {series.map((b, i) => {
          const cx = PAD.left + band * i + band / 2;
          return (
            <g key={b.end} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={PAD.left + band * i} y={PAD.top} width={band} height={plotH} fill={hover === i ? "hsl(220 20% 18% / 0.6)" : "transparent"} />
              <Bar x={cx - bar - 1} w={bar} y0={y(0)} y1={y(b.created)} color={CREATED} />
              <Bar x={cx + 1} w={bar} y0={y(0)} y1={y(b.shipped)} color={SHIPPED} />
              {i % labelEvery === 0 && (
                <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fill="hsl(40 20% 65%)">
                  {fmt(daily ? b.end - 1 : b.start)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-8 rounded-md border bg-[hsl(220_25%_10%)] px-3 py-2 text-sm shadow-lg"
          style={{ left: `clamp(0px, ${((PAD.left + band * hover + band / 2) / W) * 100}% - 70px, calc(100% - 150px))` }}
        >
          <div className="text-muted-foreground">
            {daily ? fmt(series[hover].end - 1) : `${fmt(series[hover].start)} – ${fmt(series[hover].end)}`}
          </div>
          <Row color={CREATED} label="Created" value={series[hover].created} />
          <Row color={SHIPPED} label="Shipped" value={series[hover].shipped} />
        </div>
      )}
    </figure>
  );
}

function Bar({ x, w, y0, y1, color }: { x: number; w: number; y0: number; y1: number; color: string }) {
  const h = y0 - y1;
  if (h <= 0) return null;
  const r = Math.min(4, h, w / 2);
  // Rounded at the data end only; square where it meets the baseline.
  return (
    <path
      d={`M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + w - r} Q${x + w},${y1} ${x + w},${y1 + r} V${y0} Z`}
      fill={color}
    />
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

function Row({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <span className="inline-block h-2 w-2 rounded-sm" style={{ background: color }} />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto pl-4 tabular-nums">{value}</span>
    </div>
  );
}

function niceStep(max: number) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  // Tickets are whole; a 0.5 gridline would be a lie.
  return Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag);
}
