import type { SVGProps } from 'react';

/**
 * Hand-drawn claw hammer, in the same 24×24 stroke style as the lucide icons used elsewhere
 * (drawn upright, then turned 45°): striking face on the left, curved claw on the right.
 */
export function HammerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <g transform="rotate(45 12 12)">
        <path d="M12 9.2V20.6" strokeWidth={2.8} />
        <path d="M6.2 3.8H13c2.9 0 5.4 1.1 6.6 3.3-2.1-.7-4.2-.5-6.1.6V9.2H6.2a1.2 1.2 0 0 1-1.2-1.2V5a1.2 1.2 0 0 1 1.2-1.2z" />
        <path d="M8 3.8v5.4" strokeWidth={1.5} />
      </g>
    </svg>
  );
}
