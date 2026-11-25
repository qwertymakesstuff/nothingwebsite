import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <p className="font-[family-name:var(--font-display)] text-7xl text-gold-400" aria-hidden>
        ♜
      </p>
      <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl font-semibold">That square is empty</h1>
      <p className="mt-2 text-fg-muted">The page you were looking for doesn&apos;t exist, or has moved.</p>
      <div className="mt-8 flex justify-center gap-2">
        <ButtonLink href="/" variant="primary">
          Back to the club
        </ButtonLink>
        <ButtonLink href="/play" variant="ghost">
          Play a game
        </ButtonLink>
      </div>
    </div>
  );
}
