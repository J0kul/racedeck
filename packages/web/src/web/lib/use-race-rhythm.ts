import { useEffect, useRef, useState } from "react";
import type { GameStateResp, GameEvent, PlayerState } from "./game";

/**
 * Turns the snap-to-latest polled game state into a paced, beat-by-beat replay.
 *
 * The server resolves whole turns (and chains of bot turns) between polls, so a
 * naive UI just teleports horses to their final spots. This hook instead walks
 * through any *new* events one at a time, mutating a local "display" copy of the
 * players so each move / block / turtle / steal / win lands on its own beat with
 * a readable banner.
 */

export interface Beat {
  event: GameEvent;
  /** player highlighted by this beat (actor), for spotlight effects */
  actorId: string | null;
  targetId: string | null;
  kind: string;
}

export interface RhythmState {
  /** players with positions/turtle reflecting the replay cursor, not the future */
  players: PlayerState[];
  /** the currently-announced beat (for the center banner), or null when idle */
  beat: Beat | null;
  /** true while we're stepping through a backlog of events */
  busy: boolean;
  /** id of the player currently in the spotlight (active actor or whose turn) */
  spotlightId: string | null;
}

// how long each kind of beat lingers before the next one (ms)
const BEAT_MS: Record<string, number> = {
  turn: 650,
  advance: 950,
  move: 850,
  block: 1000,
  turtle: 1050,
  steal: 1000,
  win: 1400,
  start: 700,
  join: 400,
  draw: 250,
  default: 800,
};

// events that don't deserve their own banner beat (too noisy) — applied silently
const SILENT = new Set(["join", "draw"]);

function clonePlayers(players: PlayerState[]): PlayerState[] {
  return players.map((p) => ({ ...p, hand: p.hand ? [...p.hand] : p.hand }));
}

/** apply a single event's *visible* side-effects onto a display players array */
function applyEvent(players: PlayerState[], e: GameEvent): PlayerState[] {
  let payload: any = {};
  try {
    payload = e.payload ? JSON.parse(e.payload) : {};
  } catch {
    payload = {};
  }
  return players.map((p) => {
    // position-changing events carry payload.to for the actor
    if ((e.type === "advance" || e.type === "move") && p.id === e.actorPlayerId && typeof payload.to === "number") {
      return { ...p, position: payload.to };
    }
    if (e.type === "turtle") {
      // turtle-as-effect targets a rival; turtle-as-no-move is the actor standing still
      if (e.targetPlayerId && p.id === e.targetPlayerId && payload.effect === "turtle") {
        return { ...p, turtleTurns: payload.turns ?? p.turtleTurns };
      }
      if (p.id === e.actorPlayerId && typeof payload.to === "number") {
        return { ...p, position: payload.to };
      }
    }
    if (e.type === "block" && e.targetPlayerId && p.id === e.targetPlayerId) {
      return { ...p, skipNextTurn: true };
    }
    if (e.type === "win" && p.id === e.actorPlayerId) {
      return { ...p, finished: true };
    }
    return p;
  });
}

export function useRaceRhythm(data: GameStateResp | undefined): RhythmState {
  // the display players we hand back to the UI
  const [display, setDisplay] = useState<PlayerState[]>(() => data?.players ?? []);
  const [beat, setBeat] = useState<Beat | null>(null);
  const [busy, setBusy] = useState(false);

  // bookkeeping refs
  const cursorRef = useRef<number>(-1); // highest event seq we've already played
  const seededRef = useRef(false);
  const queueRef = useRef<GameEvent[]>([]);
  const runningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playersRef = useRef<PlayerState[]>(display);
  const latestRef = useRef<GameStateResp | undefined>(data);

  latestRef.current = data;

  // keep a live ref of display for the stepper closure
  useEffect(() => {
    playersRef.current = display;
  }, [display]);

  useEffect(() => {
    if (!data) return;
    const events = data.events ?? [];

    // First time we see state: seed instantly, no replay (avoids replaying history on join/refresh).
    if (!seededRef.current) {
      seededRef.current = true;
      const maxSeq = events.length ? Math.max(...events.map((e) => e.seq)) : -1;
      cursorRef.current = maxSeq;
      setDisplay(clonePlayers(data.players));
      return;
    }

    // queue any events newer than our cursor
    const fresh = events
      .filter((e) => e.seq > cursorRef.current)
      .sort((a, b) => a.seq - b.seq);

    if (fresh.length) {
      // dedupe against what's already queued
      const queuedSeqs = new Set(queueRef.current.map((e) => e.seq));
      for (const e of fresh) {
        if (!queuedSeqs.has(e.seq)) queueRef.current.push(e);
      }
      cursorRef.current = Math.max(cursorRef.current, ...fresh.map((e) => e.seq));
      if (!runningRef.current) pump();
    } else if (!runningRef.current) {
      // no new beats — gently reconcile any non-event drift (hands, cardCount, etc.)
      reconcile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.events?.length, data?.game.status]);

  // merge non-positional fields (hand, cardCount, isSelf, finishRank...) from truth
  // without disturbing the replayed position/turtle of horses still mid-flight.
  function reconcile() {
    const truth = latestRef.current;
    if (!truth) return;
    setDisplay((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]));
      return truth.players.map((tp) => {
        const dp = byId.get(tp.id);
        if (!dp) return tp; // new player
        return {
          ...tp,
          // preserve replayed visuals while idle-reconciled fields catch up
          position: dp.position,
          turtleTurns: dp.turtleTurns,
          skipNextTurn: dp.skipNextTurn,
          finished: dp.finished || tp.finished,
        };
      });
    });
  }

  function finishUp() {
    runningRef.current = false;
    setBusy(false);
    setBeat(null);
    // snap to truth once the backlog is drained
    const truth = latestRef.current;
    if (truth) setDisplay(clonePlayers(truth.players));
  }

  function pump() {
    runningRef.current = true;
    setBusy(true);

    const stepNext = () => {
      const next = queueRef.current.shift();
      if (!next) {
        finishUp();
        return;
      }

      // apply the visible mutation
      const updated = applyEvent(playersRef.current, next);
      playersRef.current = updated;
      setDisplay(updated);

      const kind = next.type;
      if (!SILENT.has(kind)) {
        setBeat({
          event: next,
          actorId: next.actorPlayerId,
          targetId: next.targetPlayerId,
          kind,
        });
      }

      const dur = SILENT.has(kind) ? 60 : BEAT_MS[kind] ?? BEAT_MS.default;
      timerRef.current = setTimeout(stepNext, dur);
    };

    stepNext();
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // spotlight: actor of the current beat, else whose turn it is (from truth)
  const spotlightId =
    beat?.actorId ?? latestRef.current?.game.currentPlayerId ?? null;

  return { players: display, beat, busy, spotlightId };
}
