import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] font-semibold ' +
  'transition-[background-color,color,box-shadow,transform] duration-150 ease-[var(--ease-out)] ' +
  'active:translate-y-px disabled:pointer-events-none disabled:opacity-45 select-none';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-b from-gold-400 to-gold-500 text-fg-inverse shadow-[0_1px_0_rgb(255_255_255/0.25)_inset,0_6px_18px_-8px_rgb(193_154_82/0.7)] hover:from-gold-300 hover:to-gold-400',
  secondary: 'bg-surface-3 text-fg hover:bg-surface-4 shadow-[0_1px_0_rgb(255_241_214/0.05)_inset]',
  ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg',
  outline: 'border border-line-strong text-fg hover:border-gold-500/60 hover:bg-surface-2',
  danger: 'bg-loss/15 text-loss hover:bg-loss/25',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-[15px]',
  xl: 'h-14 px-7 text-base tracking-[0.01em]',
};

interface Common {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  block?: boolean;
  className?: string;
  children?: ReactNode;
}

export function buttonClass({ variant = 'secondary', size = 'md', block, className }: Omit<Common, 'icon' | 'iconRight' | 'children'>) {
  return cn(base, variants[variant], sizes[size], block && 'w-full', className);
}

export function Button({
  variant,
  size,
  icon,
  iconRight,
  block,
  className,
  children,
  type = 'button',
  ...rest
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={buttonClass({ variant, size, block, className })} {...rest}>
      {icon}
      {children}
      {iconRight}
    </button>
  );
}

/** A link styled as a button (internal routes use Next's client-side navigation). */
export function ButtonLink({
  variant,
  size,
  icon,
  iconRight,
  block,
  className,
  children,
  ...rest
}: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass({ variant, size, block, className })} {...rest}>
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}

/** Square icon-only button. Always give it an aria-label. */
export function IconButton({
  className,
  size = 'md',
  variant = 'ghost',
  children,
  type = 'button',
  ...rest
}: { size?: 'sm' | 'md'; variant?: ButtonVariant } & ButtonHTMLAttributes<HTMLButtonElement> & { 'aria-label': string }) {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], size === 'sm' ? 'size-8' : 'size-10', 'p-0', className)}
      {...rest}
    >
      {children}
    </button>
  );
}
