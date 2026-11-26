import { ArrowRight, Bot, Code2, Globe2, HeartHandshake, Microscope, Puzzle, ShieldCheck, Swords } from 'lucide-react';
import Link from 'next/link';
import { displayRating } from '@rookery/ai';
import { BotPortrait } from '@/components/avatar/BotPortrait';
import { HeroBoard } from '@/components/home/HeroBoard';
import { ComingSoon } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getBots } from '@/lib/data';

export default function HomePage() {
  const { data } = getBots();
  const featured = ['pip', 'rosa', 'kofi', 'lucien', 'corvus'].map((id) => data.bots.find((b) => b.id === id)!);

  return (
    <div className="space-y-20 overflow-x-clip pb-6 lg:space-y-28">
      {/* ── Hero ── */}
      <section className="grid items-center gap-12 pt-4 lg:grid-cols-[1fr_minmax(0,560px)] lg:gap-16 lg:pt-10">
        <div className="max-w-xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold-500/25 bg-gold-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-gold-300">
            Free forever · Open source · No ads
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-[44px] leading-[1.04] font-semibold tracking-[-0.02em] text-fg sm:text-[60px]">
            The chess club
            <br />
            that never <em className="font-medium text-gold-300 italic">closes</em>.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-fg-muted">
            Play rated games against people around the world, spar with computer opponents who each have their
            own style, sharpen your tactics with daily puzzles, and study every game afterwards.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/play" variant="primary" size="xl" icon={<Swords className="size-5" />}>
              Play now
            </ButtonLink>
            <ButtonLink href="/puzzles" variant="outline" size="xl" icon={<Puzzle className="size-5" />}>
              Solve a puzzle
            </ButtonLink>
          </div>
          <Link href="/bots" className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-fg-muted hover:text-fg">
            <span className="flex -space-x-2">
              {featured.slice(0, 3).map((b) => (
                <BotPortrait key={b.id} spec={b.portrait} name={b.name} size="sm" className="ring-2 ring-surface-0" />
              ))}
            </span>
            Or warm up against a computer opponent
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="mx-auto w-full max-w-[560px]">
          <HeroBoard />
        </div>
      </section>

      {/* ── Ways to play ── */}
      <section aria-labelledby="ways">
        <SectionTitle id="ways" eyebrow="Everything in one place" title="Four ways to get better" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Feature href="/play" icon={<Globe2 />} title="Play online">
            Bullet to classical. Fair pairings by rating, and clocks that run on our servers.
          </Feature>
          <Feature href="/bots" icon={<Bot />} title="Computer opponents">
            {data.bots.length} characters from total beginner to full Stockfish strength, each with a playing style.
          </Feature>
          <Feature href="/puzzles" icon={<Puzzle />} title="Puzzles" stage={6}>
            A new daily puzzle, rated training that adapts to you, and themes to drill weaknesses.
          </Feature>
          <Feature href="/analysis" icon={<Microscope />} title="Analysis board">
            Load any PGN or position, step through the moves and explore your own ideas.
          </Feature>
        </div>
      </section>

      {/* ── Meet the regulars ── */}
      <section aria-labelledby="regulars">
        <Card className="overflow-hidden">
          <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-400">Meet the regulars</p>
              <h2 id="regulars" className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-[-0.01em]">
                Opponents with personality
              </h2>
              <p className="mt-3 leading-relaxed text-fg-muted">
                From Pip, who just learned how the knight moves, to Corvus, the club&apos;s raven at full engine
                strength. Each opponent plays in a recognisable style, so every game teaches you something.
              </p>
              <ButtonLink href="/bots" variant="secondary" className="mt-6" iconRight={<ArrowRight className="size-4" />}>
                See all opponents
              </ButtonLink>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {featured.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/bots?bot=${b.id}`}
                    className="group flex flex-col items-center rounded-[var(--radius-card)] border border-line bg-surface-2/60 p-4 text-center transition-colors hover:border-gold-500/40"
                  >
                    <BotPortrait spec={b.portrait} name={b.name} size="lg" />
                    <span className="mt-3 text-sm font-semibold text-fg">{b.name}</span>
                    <span className="tabular text-xs text-fg-subtle">{displayRating(b)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </section>

      {/* ── Principles ── */}
      <section aria-labelledby="principles">
        <SectionTitle id="principles" eyebrow="How the club is run" title="Built to be fair, and to stay free" />
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          <Principle icon={<ShieldCheck />} title="Fair by design">
            Every online move is checked by our server and the clocks are kept there, not in your browser.
          </Principle>
          <Principle icon={<HeartHandshake />} title="Free for everyone">
            No paywalls on games, puzzles or analysis, and no advertising.
          </Principle>
          <Principle icon={<Code2 />} title="Open source">
            The whole site is GPL-licensed, and its code is public on GitHub.
          </Principle>
          <Principle icon={<Swords />} title="Friendly, not toxic">
            Chat is for players aged 13 and over, with reporting and moderation built in.
          </Principle>
        </div>
      </section>

      {/* ── Closing call to action ── */}
      <section className="relative overflow-hidden rounded-[22px] border border-gold-500/20 bg-[linear-gradient(135deg,rgb(193_154_82/0.16),rgb(193_154_82/0.03)_60%)] px-6 py-12 text-center sm:px-12">
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-[-0.01em] sm:text-4xl">Your move.</h2>
        <p className="mx-auto mt-3 max-w-md text-fg-muted">Play the computer or a friend in seconds. Create a free account to keep your games, ratings and achievements.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/play" variant="primary" size="lg">
            Start a game
          </ButtonLink>
          <ButtonLink href="/signup" variant="ghost" size="lg">
            Create a free account
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div className="mb-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-400">{eyebrow}</p>
      <h2 id={id} className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-[-0.01em] sm:text-[34px]">
        {title}
      </h2>
    </div>
  );
}

function Feature({ href, icon, title, stage, children }: { href: string; icon: React.ReactNode; title: string; stage?: number; children: React.ReactNode }) {
  return (
    <Link href={href} className="group">
      <Card interactive className="h-full p-6">
        <div className="mb-5 flex items-center justify-between">
          <span className="grid size-11 place-items-center rounded-[12px] bg-gold-500/12 text-gold-300 [&>svg]:size-5">{icon}</span>
          {stage && <ComingSoon stage={stage} />}
        </div>
        <h3 className="text-[17px] font-semibold text-fg">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">{children}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gold-300 opacity-80 group-hover:opacity-100">
          Open <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Card>
    </Link>
  );
}

function Principle({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-4 grid size-10 place-items-center rounded-full border border-gold-500/25 text-gold-300 [&>svg]:size-[18px]">{icon}</span>
      <h3 className="font-semibold text-fg">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{children}</p>
    </div>
  );
}
