import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * The standard board container used on every board page: optional player strips above and
 * below, an optional eval bar on the left, and an overlay slot (promotion picker, results).
 * It sizes the board to fit the viewport height on large screens and full width on phones.
 */
export function BoardFrame({
  board,
  top,
  bottom,
  evalBar,
  overlay,
  className,
}: {
  board: ReactNode;
  top?: ReactNode;
  bottom?: ReactNode;
  evalBar?: ReactNode;
  overlay?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mx-auto flex w-full flex-col gap-2',
        // leave room for the strips and page padding on desktop
        'lg:max-w-[min(100%,calc(100dvh-9.5rem))]',
        className,
      )}
    >
      {top}
      <div className="flex gap-2">
        {evalBar}
        <div className="relative min-w-0 flex-1">
          <div className="rounded-[8px] shadow-[0_24px_60px_-28px_rgb(0_0_0/0.9),0_0_0_1px_rgb(255_241_214/0.06)]">
            {board}
          </div>
          {overlay}
        </div>
      </div>
      {bottom}
    </div>
  );
}
