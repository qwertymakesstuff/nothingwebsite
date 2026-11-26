'use client';

import { Flag } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormMessage } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { fileReport, type ReportReason } from '@/lib/platform';

const REASONS: { value: ReportReason; label: string; hint: string }[] = [
  { value: 'cheating', label: 'Cheating', hint: 'Using an engine or outside help' },
  { value: 'abuse', label: 'Abuse or harassment', hint: 'Insults, threats, hateful chat' },
  { value: 'sandbagging', label: 'Sandbagging', hint: 'Losing on purpose to lower their rating' },
  { value: 'spam', label: 'Spam', hint: 'Repeated challenges or messages' },
  { value: 'inappropriate_profile', label: 'Inappropriate profile', hint: 'Username, avatar or bio' },
  { value: 'other', label: 'Something else', hint: 'Tell us below' },
];

/** "Report" button + dialog. Reports go to the moderators; the reporter sees the outcome. */
export function ReportButton({ targetId, username, gameId, className, size = 'sm' }: { targetId: string; username: string; gameId?: string | null; className?: string; size?: 'sm' | 'md' }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason) return setError('Choose a reason.');
    if (reason === 'other' && details.trim().length < 5) return setError('Tell us a little more.');
    setState('sending');
    setError(null);
    try {
      await fileReport(targetId, reason, details.trim(), gameId);
      setState('sent');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the report.');
      setState('idle');
    }
  };

  return (
    <>
      <Button size={size} variant="ghost" icon={<Flag className="size-4" />} className={className} onClick={() => setOpen(true)}>
        Report
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={state === 'sent' ? 'Report sent' : `Report ${username}`}
        description={state === 'sent' ? 'Thank you. A moderator will look at it, and you’ll get a notification when it’s handled.' : gameId ? 'About this game. Moderators can see the moves and the chat.' : 'Moderators review every report.'}
        size="sm"
        footer={
          state === 'sent' ? (
            <Button variant="primary" onClick={() => setOpen(false)}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" icon={<Flag className="size-4" />} disabled={state === 'sending'} onClick={() => void submit()}>
                {state === 'sending' ? 'Sending…' : 'Send report'}
              </Button>
            </>
          )
        }
      >
        {state !== 'sent' && (
          <div className="space-y-3">
            {error && <FormMessage tone="error">{error}</FormMessage>}
            <div className="grid gap-2" role="radiogroup" aria-label="Reason">
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={reason === r.value}
                  onClick={() => setReason(r.value)}
                  className={cn('rounded-[10px] border px-3 py-2 text-left', reason === r.value ? 'border-gold-500/60 bg-gold-500/10' : 'border-line hover:border-line-strong')}
                >
                  <span className="block text-sm font-semibold">{r.label}</span>
                  <span className="block text-xs text-fg-subtle">{r.hint}</span>
                </button>
              ))}
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Details (optional)</span>
              <textarea
                value={details}
                maxLength={1000}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                className="w-full rounded-[var(--radius-control)] border border-line bg-surface-0 px-3 py-2 text-sm outline-none focus:border-gold-500/60"
              />
            </label>
          </div>
        )}
      </Modal>
    </>
  );
}
