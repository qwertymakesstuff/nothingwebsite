'use client';

import type { ChatLine } from '@rookery/protocol';
import { MessageSquareOff, Send } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

/** Same list as the server's (apps/realtime/src/game/chatFilter.ts): one-click friendly messages. */
const PRESETS = ['Hello!', 'Good luck!', 'Have fun!', 'You too!', 'Good game!', 'Well played!', 'Thank you!', 'Rematch?'];

export function GameChat({ lines, enabled, you, names, onSend }: { lines: ChatLine[]; enabled: boolean; you: 'white' | 'black'; names: { white: string; black: string }; onSend: (text: string) => void }) {
  const [text, setText] = useState('');
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [lines.length]);

  if (!enabled) {
    return (
      <div className="flex items-center gap-2 border-t border-line px-4 py-3 text-xs text-fg-subtle">
        <MessageSquareOff className="size-4" />
        <span>
          Chat is off for you.{' '}
          <Link href="/settings?section=social" className="font-semibold text-gold-300 hover:underline">
            Chat settings
          </Link>
        </span>
      </div>
    );
  }
  const send = (t: string) => {
    const v = t.trim();
    if (!v) return;
    onSend(v.slice(0, 140));
    setText('');
  };
  return (
    <div className="border-t border-line">
      <ol ref={list} className="rk-scroll h-32 space-y-1 overflow-y-auto px-4 py-2 text-sm" aria-label="Chat" aria-live="polite">
        {lines.length === 0 && <li className="text-xs text-fg-subtle">Say hello. Be kind: chat is moderated.</li>}
        {lines.map((l) => (
          <li key={l.id} className="break-words">
            <span className={cn('font-semibold', l.from === you ? 'text-gold-300' : 'text-fg')}>{l.from === 'system' ? 'Rookery' : l.from === you ? 'You' : names[l.from]}:</span> <span className="text-fg-muted">{l.text}</span>
          </li>
        ))}
      </ol>
      <div className="flex gap-1.5 overflow-x-auto px-4 pb-2 rk-scroll">
        {PRESETS.map((p) => (
          <button key={p} type="button" onClick={() => send(p)} className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs text-fg-muted hover:border-line-strong hover:text-fg">
            {p}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2 px-4 pb-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={140}
          placeholder="Message"
          aria-label="Chat message"
          className="h-9 min-w-0 flex-1 rounded-[var(--radius-control)] border border-line bg-surface-0 px-3 text-sm outline-none focus:border-gold-500/60"
        />
        <button type="submit" aria-label="Send" className="grid size-9 place-items-center rounded-[var(--radius-control)] bg-surface-3 text-fg-muted hover:text-fg">
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
