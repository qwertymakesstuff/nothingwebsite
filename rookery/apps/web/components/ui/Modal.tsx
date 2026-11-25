'use client';

// Modal built on the native <dialog> element: focus trapping, Esc to close and the backdrop
// come from the browser, so it is accessible without extra code.

import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { IconButton } from './Button';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // Click on the backdrop (the dialog element itself, outside the panel) closes it.
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-[18px] border border-line-strong bg-surface-1 p-0 text-fg shadow-[var(--shadow-pop)]',
        'backdrop:bg-black/60 backdrop:backdrop-blur-[2px] open:animate-pop-in',
        size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-md',
      )}
    >
      <div className="flex items-start gap-4 px-6 pt-5">
        <div className="min-w-0 flex-1">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
        </div>
        <IconButton aria-label="Close" size="sm" onClick={onClose} className="-mr-2">
          <X className="size-4" />
        </IconButton>
      </div>
      {children && <div className="px-6 py-4">{children}</div>}
      {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      {!children && !footer && <div className="h-5" />}
    </dialog>
  );
}
