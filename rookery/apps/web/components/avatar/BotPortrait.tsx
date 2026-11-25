// Original illustrated portraits for computer opponents, drawn as SVG from a small spec, so
// every bot has a distinct look with no image assets to license.

import type { PortraitSpec } from '@/lib/types';
import { cn } from '@/lib/cn';

const SIZES = { sm: 'size-10', md: 'size-14', lg: 'size-20', xl: 'size-28' };

export function BotPortrait({
  spec,
  name,
  size = 'md',
  className,
  raven,
}: {
  spec: PortraitSpec;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
  /** Draw the club raven instead of a person (Corvus). */
  raven?: boolean;
}) {
  const gid = `bp-${name.replace(/\W/g, '')}`;
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={`Portrait of ${name}`}
      className={cn(SIZES[size], 'shrink-0 rounded-[28%] ring-1 ring-inset ring-white/10', className)}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={spec.bg[0]} />
          <stop offset="1" stopColor={spec.bg[1]} />
        </linearGradient>
        <clipPath id={`${gid}-c`}>
          <rect width="64" height="64" rx="18" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${gid}-c)`}>
        <rect width="64" height="64" fill={`url(#${gid})`} />
        {/* faint chequer motif */}
        <path d="M0 0h8v8H0zM16 0h8v8h-8zM8 8h8v8H8zM56 48h8v8h-8zM48 56h8v8h-8z" fill="#fff" opacity="0.04" />
        {raven ? <Raven spec={spec} /> : <Person spec={spec} />}
      </g>
    </svg>
  );
}

function Person({ spec }: { spec: PortraitSpec }) {
  const { skin, hair, hairStyle, accessory, shirt } = spec;
  return (
    <g>
      {/* hair behind the head (long styles) */}
      {hairStyle === 'long' && <path d="M17 30c0-12 6-19 15-19s15 7 15 19v22H17z" fill={hair} />}
      {hairStyle === 'bob' && <path d="M18 31c0-11 6-18 14-18s14 7 14 18v8H18z" fill={hair} />}
      {/* shoulders + neck */}
      <path d="M10 64c1-11 9-17 22-17s21 6 22 17z" fill={shirt} />
      <path d="M27 40h10v9a5 5 0 0 1-10 0z" fill={skin} />
      <path d="M27 44c3 2 7 2 10 0v2c-3 2-7 2-10 0z" fill="#000" opacity="0.12" />
      {accessory === 'scarf' && <path d="M22 49c6 4 14 4 20 0l2 5c-8 4-16 4-24 0z" fill="#b9a36f" />}
      {/* head */}
      <ellipse cx="32" cy="30" rx="11" ry="12.5" fill={skin} />
      <ellipse cx="21.3" cy="31" rx="1.8" ry="2.6" fill={skin} />
      <ellipse cx="42.7" cy="31" rx="1.8" ry="2.6" fill={skin} />
      {/* face */}
      <circle cx="27.8" cy="31" r="1.3" fill="#1d1712" />
      <circle cx="36.2" cy="31" r="1.3" fill="#1d1712" />
      <path d="M26 27.2c1.2-.8 2.8-.8 4 0M34 27.2c1.2-.8 2.8-.8 4 0" stroke={hair} strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.8" />
      <path d="M29 36.5c1.8 1.4 4.2 1.4 6 0" stroke="#6b3a2a" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <ellipse cx="25.5" cy="34.5" rx="2" ry="1.2" fill="#d9776b" opacity="0.18" />
      <ellipse cx="38.5" cy="34.5" rx="2" ry="1.2" fill="#d9776b" opacity="0.18" />
      {/* hair on top */}
      {hairStyle === 'short' && <path d="M21 28c0-9 5-14 11-14s11 5 11 14c-3-4-6-6-11-6s-8 2-11 6z" fill={hair} />}
      {hairStyle === 'long' && <path d="M21 29c0-9 5-15 11-15s11 6 11 15c-4-5-7-7-11-7s-7 2-11 7z" fill={hair} />}
      {hairStyle === 'bob' && <path d="M20.5 30c0-10 5-15.5 11.5-15.5S43.5 20 43.5 30c-3-5-7-8-11.5-8s-8.5 3-11.5 8z" fill={hair} />}
      {hairStyle === 'bun' && (
        <>
          <circle cx="32" cy="13" r="5" fill={hair} />
          <path d="M21 28c0-8 5-13 11-13s11 5 11 13c-3-3-7-5-11-5s-8 2-11 5z" fill={hair} />
        </>
      )}
      {hairStyle === 'curly' && (
        <g fill={hair}>
          {[22, 26, 30, 34, 38, 42].map((x, i) => (
            <circle key={x} cx={x} cy={i % 2 ? 18 : 20} r="4.2" />
          ))}
          <circle cx="21" cy="24" r="3.4" />
          <circle cx="43" cy="24" r="3.4" />
        </g>
      )}
      {hairStyle === 'mohawk' && <path d="M29 22c0-6 1.5-10 3-12 1.5 2 3 6 3 12z" fill={hair} />}
      {hairStyle === 'bald' && <path d="M22 26c2-6 6-9 10-9s8 3 10 9" stroke="#fff" strokeOpacity="0.12" strokeWidth="2" fill="none" />}
      {/* accessories */}
      {accessory === 'glasses' && (
        <g stroke="#1d1712" strokeWidth="1.2" fill="#fff" fillOpacity="0.08">
          <circle cx="27.8" cy="31" r="3.6" />
          <circle cx="36.2" cy="31" r="3.6" />
          <path d="M31.4 31h1.2" />
        </g>
      )}
      {accessory === 'monocle' && (
        <g stroke="#d4b26c" strokeWidth="1.1" fill="#fff" fillOpacity="0.1">
          <circle cx="36.2" cy="31" r="3.6" />
          <path d="M39.6 32.5c1 3 0 7-1 9" fill="none" />
        </g>
      )}
      {accessory === 'beret' && <path d="M19 22c3-6 9-8 15-7 6 1 10 4 10 7-6-2-18-2-25 0z" fill="#7d2f36" />}
      {accessory === 'cap' && (
        <>
          <path d="M20.5 25c0-7 5-11.5 11.5-11.5S43.5 18 43.5 25z" fill="#3f5e8c" />
          <path d="M20 25h26c2 0 2 2.5 0 2.5H20z" fill="#2c4466" />
        </>
      )}
      {accessory === 'headphones' && (
        <g fill="#2a2a2e">
          <path d="M19 30c0-10 6-17 13-17s13 7 13 17h-2.5c0-8.5-4.5-14.5-10.5-14.5S21.5 21.5 21.5 30z" />
          <rect x="17" y="27" width="5" height="9" rx="2" />
          <rect x="42" y="27" width="5" height="9" rx="2" />
        </g>
      )}
    </g>
  );
}

function Raven({ spec }: { spec: PortraitSpec }) {
  return (
    <g>
      {/* rook pedestal */}
      <path d="M14 64v-6h36v6z" fill={spec.shirt} />
      <path d="M17 58l2-8h26l2 8z" fill={spec.shirt} opacity="0.85" />
      {/* bird */}
      <path d="M20 50c0-12 6-22 15-24l8-1c4 0 6 3 6 6l7 3-7 2c-1 6-4 10-8 12l3 2H20z" fill="#18181b" />
      <path d="M43 25c4 0 6 3 6 6l7 3-7 2" fill="#2a2a30" />
      <circle cx="43" cy="30" r="1.6" fill="#d4b26c" />
      <path d="M24 46c4-6 10-9 16-9" stroke="#3a3a42" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}
