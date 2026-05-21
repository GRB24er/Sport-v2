"use client";

// Tiny dependency-free SVG sparkline. Renders a smooth line + optional
// area fill from an array of numbers, scaled to fit width/height.

function buildPath(values, w, h, padding = 2) {
  if (!values?.length) return { line: "", area: "" };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerW = w - padding * 2;
  const innerH = h - padding * 2;

  const points = values.map((v, i) => {
    const x = padding + (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
    const y = padding + innerH - ((v - min) / range) * innerH;
    return [x, y];
  });

  // Smooth bezier between points
  const line = points.reduce((acc, [x, y], i) => {
    if (i === 0) return `M ${x} ${y}`;
    const [px, py] = points[i - 1];
    const cx = (px + x) / 2;
    return `${acc} Q ${px} ${py}, ${cx} ${(py + y) / 2} T ${x} ${y}`;
  }, "");

  const area = `${line} L ${points[points.length - 1][0]} ${h - padding} L ${points[0][0]} ${h - padding} Z`;
  return { line, area, lastPoint: points[points.length - 1], firstPoint: points[0] };
}

export default function Sparkline({
  data = [],
  width = 140,
  height = 44,
  color = "#0B9635",
  fill = true,
  showLastDot = true,
  strokeWidth = 1.75,
  ariaLabel,
}) {
  if (!data?.length) {
    return (
      <svg width={width} height={height} role="img" aria-label={ariaLabel || "No data"}>
        <line x1={2} y1={height / 2} x2={width - 2} y2={height / 2} stroke="#1E2028" strokeDasharray="2 3" />
      </svg>
    );
  }

  const { line, area, lastPoint } = buildPath(data, width, height);
  const gradId = `spark-${color.replace("#", "")}-${Math.round(data[0] * 100)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel || "sparkline"}>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${gradId})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      {showLastDot && lastPoint && (
        <circle cx={lastPoint[0]} cy={lastPoint[1]} r={2.5} fill={color} />
      )}
    </svg>
  );
}

// Renders a percentage trend label e.g. "+18% vs prev period"
export function TrendDelta({ current, previous, color }) {
  if (previous === 0 && current === 0) return <span style={{ fontSize: 10, color: "#444" }}>—</span>;
  if (previous === 0) return <span style={{ fontSize: 10, color: color || "#0B9635", fontWeight: 700 }}>NEW</span>;
  const delta = ((current - previous) / previous) * 100;
  const positive = delta >= 0;
  return (
    <span style={{ fontSize: 10, color: positive ? "#0B9635" : "#E31725", fontWeight: 700 }}>
      {positive ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
    </span>
  );
}
