import { cn } from '@/lib/cn';

/** Tiny line chart for rating history. Colour follows the overall trend. */
export function Sparkline({
  values,
  width = 120,
  height = 32,
  className,
  fill = true,
  label,
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  label?: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * width,
    pad + (1 - (v - min) / span) * (height - pad * 2),
  ]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x!.toFixed(1)} ${y!.toFixed(1)}`).join(' ');
  const up = values[values.length - 1]! >= values[0]!;
  const color = up ? 'var(--color-win)' : 'var(--color-loss)';
  const gid = `spark-${values.length}-${Math.round(values[0]!)}-${Math.round(values[values.length - 1]!)}`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('block h-8 w-full overflow-visible', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.22" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d} L${width} ${height} L0 ${height} Z`} fill={`url(#${gid})`} />
        </>
      )}
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
