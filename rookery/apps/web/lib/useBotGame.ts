'use client';

// A game against a computer opponent, entirely in the browser: rules via chess-core, moves via
// the persona's BotBrain + Stockfish in a Web Worker. The player's moves are validated here (not
// on a server) because these games are unrated.

import { BotBrain, displayRating, getOpening, type DialogueEvent, type MoveFeatures, type Persona } from '@rookery/ai';
import { getTimeControl, resignOutcome, START_FEN, timeoutOutcome, type Outcome } from '@rookery/chess-core';
import { Chess } from 'chess.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { saveBotGame } from './botHistory';
import { getEngine, resetEngine } from './engine/browserEngine';
import { BOT_DELAY_FACTOR, usePreferences } from './preferences';
import type { Side } from './types';
import { useChessClock } from './useChessClock';
import { useLocalGame } from './useLocalGame';

export interface BotGameSettings {
  persona: Persona;
  playerColor: Side;
  /** Time control id ("10+0"), or "none" for an untimed game. */
  timeControl: string;
  /** Start after these opening moves (catalogue id), or undefined for the normal start. */
  openingId?: string;
  takebacks: boolean;
}

export interface ChatEntry {
  id: number;
  from: 'bot' | 'system';
  text: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let chatSeq = 0;

export function useBotGame(settings: BotGameSettings) {
  const { prefs } = usePreferences();
  const { persona, playerColor } = settings;
  const botColor: Side = playerColor === 'white' ? 'black' : 'white';
  const game = useLocalGame();
  const tc = settings.timeControl === 'none' ? undefined : getTimeControl(settings.timeControl);

  const [ended, setEnded] = useState<Outcome | null>(null);
  const [thinking, setThinking] = useState(false);
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [lastSource, setLastSource] = useState<string | null>(null);
  const [lastEval, setLastEval] = useState<number | null>(null);

  const brain = useMemo(() => new BotBrain(persona, getEngine()), [persona]);
  const token = useRef(0); // bumping it cancels any in-flight bot move
  const saved = useRef(false);
  const started = useRef(false);

  const clock = useChessClock(tc?.initialMs ?? 0, tc?.incrementMs ?? 0, (flagged) => {
    finish(timeoutOutcome(new Chess(game.endFen), flagged));
  });

  const say = useCallback(
    (event: DialogueEvent) => {
      const r = brain.say(event);
      if (r && prefs.botChat) setChat((c) => [...c.slice(-60), { id: ++chatSeq, from: 'bot', text: r.line }]);
    },
    [brain, prefs.botChat],
  );
  const note = useCallback((text: string) => setChat((c) => [...c.slice(-60), { id: ++chatSeq, from: 'system', text }]), []);

  const boardEnd = useMemo(() => {
    const c = new Chess(game.endFen);
    return c.isGameOver() ? game.line.length : -1;
  }, [game.endFen, game.line.length]);
  const outcome: Outcome | null = ended;
  const over = outcome !== null;

  const finish = useCallback(
    (o: Outcome) => {
      token.current++;
      setThinking(false);
      clock.halt();
      setEnded((prev) => prev ?? o);
    },
    [clock],
  );

  // ── Starting a game ──────────────────────────────────────────────────────────────────
  const begin = useCallback(async () => {
    token.current++;
    saved.current = false;
    setEnded(null);
    setThinking(false);
    setEngineError(null);
    setLastEval(null);
    setChat([]);
    const opening = settings.openingId ? getOpening(settings.openingId) : undefined;
    game.start(START_FEN, opening ? opening.moves.split(' ') : []);
    clock.resetClock(tc?.initialMs ?? 0, tc?.incrementMs ?? 0);
    if (opening) note(`Starting from the ${opening.name}.`);
    try {
      await brain.newGame();
    } catch (e) {
      setEngineError(e instanceof Error ? e.message : 'The engine failed to start.');
    }
    say(started.current ? 'rematch' : 'greeting');
    started.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brain, settings.openingId, settings.timeControl]);

  useEffect(() => {
    void begin();
    return () => {
      token.current++;
    };
  }, [begin]);

  // ── Board-detected endings (checkmate, stalemate, repetition, …) ───────────────────────
  useEffect(() => {
    if (ended || boardEnd < 0) return;
    const c = new Chess(game.state.initialFen);
    for (const m of game.state.moves) c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] });
    const o = c.isCheckmate()
      ? { result: c.turn() === 'w' ? '0-1' : '1-0', termination: 'checkmate', winner: c.turn() === 'w' ? 'black' : 'white' }
      : c.isStalemate()
        ? { result: '1/2-1/2', termination: 'stalemate', winner: null }
        : c.isInsufficientMaterial()
          ? { result: '1/2-1/2', termination: 'insufficient', winner: null }
          : c.isThreefoldRepetition()
            ? { result: '1/2-1/2', termination: 'repetition', winner: null }
            : { result: '1/2-1/2', termination: 'fifty-move', winner: null };
    finish(o as Outcome);
  }, [boardEnd, ended, finish, game.state.initialFen, game.state.moves]);

  // ── Result: reaction + history (once per game) ────────────────────────────────────────
  useEffect(() => {
    if (!ended || saved.current) return;
    saved.current = true;
    if (ended.termination === 'resign') say(ended.winner === playerColor ? 'botResigns' : 'playerResigns');
    else if (ended.termination === 'agreement') {
      /* drawAccepted already said */
    } else if (!ended.winner) say('draw');
    else say(ended.winner === botColor ? 'botWins' : 'botLoses');
    if (ended.winner === botColor || ended.winner === playerColor || ended.result === '1/2-1/2') {
      saveBotGame({
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        botId: persona.id,
        botName: persona.name,
        botRating: displayRating(persona),
        playerColor,
        result: ended.result,
        termination: ended.termination,
        pgn: game.pgn,
        plies: game.line.length,
        timeControl: settings.timeControl,
        opening: settings.openingId ? getOpening(settings.openingId)?.name : undefined,
        playedAt: new Date().toISOString(),
      });
    }
  }, [ended, say, playerColor, botColor, persona, game.pgn, game.line.length, settings.timeControl, settings.openingId]);

  // ── The bot's turn ─────────────────────────────────────────────────────────────────────
  const turn: Side = new Chess(game.endFen).turn() === 'w' ? 'white' : 'black';
  const moveCount = game.state.moves.length;

  useEffect(() => {
    if (over || engineError || turn !== botColor || boardEnd >= 0) return;
    const my = ++token.current;
    setThinking(true);
    const prevEval = brain.lastEval;
    (async () => {
      try {
        const m = await brain.move({ initialFen: game.state.initialFen, moves: game.state.moves });
        if (token.current !== my) return;
        setLastEval(m.evalCp);
        if (brain.shouldResign()) {
          finish(resignOutcome(botColor));
          return;
        }
        for (const ev of brain.evalReactions(prevEval, m.evalCp)) say(ev);
        await sleep(m.thinkDelayMs * BOT_DELAY_FACTOR[prefs.botMoveSpeed]);
        if (token.current !== my) return;
        if (!game.push(m.uci)) throw new Error(`Engine proposed an illegal move (${m.uci}).`);
        setLastSource(m.source);
        if (tc) clock.moved(botColor);
        reactToMove(m.features, 'bot');
        setThinking(false);
      } catch (e) {
        if (token.current !== my) return;
        setThinking(false);
        setEngineError(e instanceof Error ? e.message : 'The engine stopped responding.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, moveCount, over, engineError, botColor, brain, boardEnd]);

  function reactToMove(f: MoveFeatures | null, who: 'bot' | 'player') {
    if (!f || f.mate) return;
    if (who === 'bot') {
      if (f.check) say('botCheck');
      else if (f.capture && f.capturedValue >= 3) say('botCapture');
    } else if (f.capture && f.capturedValue >= 3) say('playerCapture');
  }

  // ── Player actions ─────────────────────────────────────────────────────────────────────
  const canMove = !over && !engineError && turn === playerColor && game.atEnd;

  const playerMove = useCallback(
    (from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n') => {
      if (!canMove) return false;
      const fen = game.endFen;
      const ok = game.play(from, to, promotion);
      if (!ok) return false;
      if (tc) clock.moved(playerColor);
      const c = new Chess(fen);
      try {
        const m = c.move({ from, to, promotion });
        reactToMove({ uci: from + to, san: m.san, capture: !!m.captured, capturedValue: { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }[m.captured ?? 'k'] ?? 0, check: c.inCheck(), mate: c.isCheckmate(), promotion: !!m.promotion, castle: false, approach: 0, stormPawn: false, trade: false }, 'player');
      } catch {
        /* already validated */
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canMove, game, tc, clock, playerColor],
  );

  const resign = useCallback(() => finish(resignOutcome(playerColor)), [finish, playerColor]);

  const offerDraw = useCallback(() => {
    if (over) return;
    if (brain.acceptsDraw(game.line.length)) {
      say('drawAccepted');
      finish({ result: '1/2-1/2', termination: 'agreement', winner: null });
    } else {
      say('drawDeclined');
      if (!persona.dialogue.drawDeclined || !prefs.botChat) note(`${persona.name} declines the draw.`);
    }
  }, [over, brain, game.line.length, say, finish, persona, prefs.botChat, note]);

  /** Takes back the player's last move (and the bot's reply, if it has already moved). */
  const takeback = useCallback(() => {
    if (!settings.takebacks || over) return;
    if (thinking) {
      token.current++;
      setThinking(false);
      getEngine().stop();
      game.takeBack(1);
    } else {
      game.takeBack(turn === playerColor ? 2 : 1);
    }
    say('takeback');
  }, [settings.takebacks, over, thinking, game, turn, playerColor, say]);

  const retryEngine = useCallback(() => {
    resetEngine();
    window.location.reload();
  }, []);

  const canTakeback =
    settings.takebacks && !over && game.state.moves.length > 0 && (turn === playerColor ? game.state.moves.length >= 2 : thinking);

  return {
    game,
    turn,
    botColor,
    thinking,
    outcome,
    over,
    chat,
    clock: tc ? clock : null,
    engineError,
    lastSource,
    lastEval,
    canMove,
    canTakeback,
    playerMove,
    resign,
    offerDraw,
    takeback,
    restart: begin,
    retryEngine,
  };
}
