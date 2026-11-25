import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="text-6xl" aria-hidden>
        ♜
      </p>
      <h1 className="mt-4 text-2xl font-bold">That square is empty</h1>
      <p className="mt-2 text-ink-400">The page you were looking for doesn&apos;t exist.</p>
      <Link href="/" className="mt-6 inline-block rounded-lg bg-ember-500 px-5 py-2.5 font-bold text-ink-950 hover:bg-ember-400">
        Back to the board
      </Link>
    </div>
  );
}
