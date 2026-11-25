'use client';

import { ChessBoard } from './ChessBoard';

/** Small view-only board for cards and tables. */
export function MiniBoard({
  fen,
  lastMove,
  orientation = 'white',
  className,
  label,
}: {
  fen: string;
  lastMove?: [string, string];
  orientation?: 'white' | 'black';
  className?: string;
  label?: string;
}) {
  return (
    <div className={className}>
      <ChessBoard fen={fen} lastMove={lastMove} orientation={orientation} coordinates={false} viewOnly label={label ?? 'Position'} />
    </div>
  );
}
