import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { AnimatePresence, motion } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getGuestId } from "../lib/guest";
import {
  CARD_META,
  colorHex,
  type GameStateResp,
  type PlayerState,
} from "../lib/game";
import { Track } from "../components/track";
import { EventLog } from "../components/event-log";
import { GameCard } from "../components/game-card";
import { PlayerChips } from "../components/player-chips";
import { HorseSprite } from "../components/horse-sprite";
import { BeatBanner } from "../components/beat-banner";
import { TurnTimer } from "../components/turn-timer";
import { useRaceRhythm } from "../lib/use-race-rhythm";
import { Copy, Loader2, Trophy, Crown, Home, X, Bot, Link2 } from "lucide-react";

export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const guestId = getGuestId();
  const qc = useQueryClient();

  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState("");

  const state = useQuery({
    queryKey: ["game", id],
    queryFn: async () => {
      const res = await api.games[":id"].$get({ param: { id } });
      if (!res.ok) throw new Error("not found");
      return (await res.json()) as GameStateResp;
    },
    refetchInterval: 1000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["game", id] });

  const startMut = useMutation({
    mutationFn: async () => {
      const res = await api.games[":id"].start.$post({ param: { id } });
      if (!res.ok) throw new Error((await res.json() as any).message);
    },
    onError: (e) => setActionError(e.message),
    onSuccess: invalidate,
  });

  const playMut = useMutation({
    mutationFn: async (vars: { cardId: string; targetPlayerId?: string }) => {
      const res = await api.games[":id"].play.$post({ param: { id }, json: vars });
      if (!res.ok) throw new Error((await res.json() as any).message);
    },
    onError: (e) => { setActionError(e.message); setShake(true); setTimeout(() => setShake(false), 400); },
    onSuccess: () => { setSelectedCard(null); invalidate(); },
  });

  const endTurnMut = useMutation({
    mutationFn: async () => {
      const r = await api.games[":id"]["end-turn"].$post({ param: { id } });
      if (!r.ok) throw new Error((await r.json() as any).message);
    },
    onError: (e) => setActionError(e.message),
    onSuccess: () => { setSelectedCard(null); invalidate(); },
  });

  const addBotMut = useMutation({
    mutationFn: async () => {
      const r = await api.games[":id"]["add-bot"].$post({ param: { id } });
      if (!r.ok) throw new Error((await r.json() as any).message);
    },
    onError: (e) => setActionError(e.message),
    onSuccess: invalidate,
  });

  const removeBotMut = useMutation({
    mutationFn: async (playerId: string) => {
      const r = await api.games[":id"]["remove-bot"].$post({ param: { id }, json: { playerId } });
      if (!r.ok) throw new Error((await r.json() as any).message);
    },
    onError: (e) => setActionError(e.message),
    onSuccess: invalidate,
  });

  useEffect(() => { setActionError(""); }, [selectedCard]);

  const data = state.data;
  const rhythm = useRaceRhythm(data);
  const me = useMemo<PlayerState | undefined>(
    () => data?.players.find((p) => p.isSelf),
    [data]
  );
  // gate input on whose turn it truly is AND that the replay has caught up
  const isMyTurn =
    data?.game.currentPlayerId === me?.id &&
    data?.game.status === "playing" &&
    !rhythm.busy;
  const isHost = !!guestId && data?.game.hostUserId === guestId;

  if (state.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-900">
        <Loader2 className="animate-spin text-mint" size={32} />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-bg-900">
        <p className="text-ink-dim">Race not found.</p>
        <button onClick={() => navigate("/lobby")} className="btn btn-mint">Back to lobby</button>
      </div>
    );
  }

  // ---------- WAITING ROOM ----------
  if (data.game.status === "lobby") {
    return (
      <div className="min-h-screen bg-bg-900 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-1 text-center font-pixel text-lg text-ink">PADDOCK</h1>
          <p className="mb-6 text-center text-ink-dim">Waiting for racers to saddle up…</p>

          <div className="panel mb-6 flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-ink-dim">Share this code</p>
              <p className="font-pixel text-2xl tracking-widest text-mint">{data.game.code}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(data.game.code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="btn btn-ghost flex items-center gap-2 text-sm"
                title="Copy code"
              >
                <Copy size={15} /> {copied ? "Copied!" : "Code"}
              </button>
              <button
                onClick={() => {
                  const link = `${window.location.origin}/lobby?code=${data.game.code}`;
                  navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="btn btn-ghost flex items-center gap-2 text-sm"
                title="Copy invite link"
              >
                <Link2 size={15} /> Link
              </button>
            </div>
          </div>

          <div className="mb-6 space-y-2">
            {data.players.map((p) => (
              <div key={p.id} className="panel flex items-center gap-3 p-3">
                <HorseSprite color={p.horseColor} size={40} />
                <span className="font-semibold" style={{ color: colorHex(p.horseColor) }}>{p.name}</span>
                {p.id === data.players[0]?.id && <Crown size={15} className="text-gold" />}
                {p.isSelf && <span className="text-[10px] text-mint">YOU</span>}
                {p.isBot && <span className="rounded bg-bg-700 px-1.5 py-0.5 text-[10px] font-semibold text-rose">AI</span>}
                {isHost && p.isBot && (
                  <button
                    onClick={() => removeBotMut.mutate(p.id)}
                    disabled={removeBotMut.isPending}
                    className="ml-auto rounded-full p-1 text-ink-dim hover:bg-bg-700 hover:text-rose"
                    title="Remove bot"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            ))}
            {Array.from({ length: data.game.maxPlayers - data.players.length }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-dashed border-bg-600 p-3 text-ink-dim">
                <div className="h-10 w-10 rounded-full border border-dashed border-bg-600" />
                <span>Empty stall…</span>
                {isHost && (
                  <button
                    onClick={() => addBotMut.mutate()}
                    disabled={addBotMut.isPending}
                    className="ml-auto flex items-center gap-1 rounded-lg border border-bg-600 px-2 py-1 text-xs font-semibold text-mint hover:bg-bg-700"
                  >
                    <Bot size={14} /> Add AI
                  </button>
                )}
              </div>
            ))}
          </div>

          {actionError && <p className="mb-3 text-center text-sm text-rose">{actionError}</p>}

          {isHost ? (
            <button
              onClick={() => startMut.mutate()}
              disabled={startMut.isPending || data.players.length < 2}
              className="btn btn-mint w-full"
            >
              {startMut.isPending ? <Loader2 className="mx-auto animate-spin" size={18} /> :
                data.players.length < 2 ? "Need at least 2 racers" : "Start the race 🏇"}
            </button>
          ) : (
            <p className="text-center text-ink-dim">Waiting for the host to start…</p>
          )}
          <button onClick={() => navigate("/lobby")} className="btn btn-ghost mt-3 w-full text-sm">Leave</button>
        </div>
      </div>
    );
  }

  // ---------- GAME TABLE ----------
  const selected = me?.hand?.find((c) => c.id === selectedCard);
  const needsTarget = selected ? CARD_META[selected.type].needsTarget : false;
  const targetable = new Set(
    data.players.filter((p) => !p.isSelf && !p.finished).map((p) => p.id)
  );

  function tryPlay(targetPlayerId?: string) {
    if (!selectedCard) return;
    playMut.mutate({ cardId: selectedCard, targetPlayerId });
  }

  const winner = data.players.find((p) => p.id === data.game.winnerPlayerId);
  // the board uses the rhythm-paced display players so moves land beat by beat
  const boardPlayers = rhythm.players.length ? rhythm.players : data.players;
  const spotlightId = rhythm.spotlightId;
  // only reveal the win overlay once the replay has actually shown the crossing
  const replayedWinner = boardPlayers.find((p) => p.id === data.game.winnerPlayerId);
  const showWin =
    data.game.status === "finished" &&
    !!winner &&
    !rhythm.busy &&
    !!replayedWinner?.finished;

  return (
    <div className={`min-h-screen bg-bg-900 ${shake ? "animate-shake" : ""}`}>
      <BeatBanner beat={rhythm.beat} players={boardPlayers} />
      <div className="mx-auto max-w-6xl px-4 py-4">
        {/* HUD top */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-pixel text-sm text-ink">RACE<span className="text-mint">DECK</span></span>
            <span className="rounded-lg bg-bg-700 px-2.5 py-1 font-pixel text-[10px] tracking-widest text-mint">{data.game.code}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors"
              style={{ background: isMyTurn ? "rgba(59,227,160,.12)" : "var(--color-bg-800)", color: isMyTurn ? "#3BE3A0" : "#8a99ae", border: "1px solid var(--color-bg-600)" }}>
              {data.game.status === "finished" && !rhythm.busy
                ? "Race over"
                : rhythm.busy
                  ? `▶ ${boardPlayers.find((p) => p.id === spotlightId)?.name ?? "Playing"}…`
                  : isMyTurn
                    ? "● Your turn"
                    : `${data.players.find((p) => p.id === data.game.currentPlayerId)?.name ?? ""}'s turn`}
            </div>
            {data.game.status === "playing" && !rhythm.busy && (
              <TurnTimer
                turnStartedAt={data.game.turnStartedAt}
                turnDuration={data.game.turnDuration}
                isMyTurn={isMyTurn}
              />
            )}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
          {/* main column */}
          <div className="space-y-3">
            <Track players={boardPlayers} trackLength={data.game.trackLength} currentPlayerId={spotlightId} />

            {/* opponents / targets */}
            <PlayerChips
              players={boardPlayers}
              currentPlayerId={spotlightId}
              selectableIds={isMyTurn && needsTarget && selectedCard ? targetable : undefined}
              onSelect={(tid) => tryPlay(tid)}
              targetingLabel={needsTarget ? "TARGET" : undefined}
            />
          </div>

          {/* event log */}
          <div className="h-[340px] lg:h-auto">
            <EventLog events={data.events} />
          </div>
        </div>

        {/* hand dock */}
        <div className="mt-2">
          {actionError && <p className="mb-1 text-center text-sm text-rose">{actionError}</p>}
          {needsTarget && selectedCard && isMyTurn && (
            <p className="mb-1 text-center text-sm text-gold">Pick a rival above to {selected?.type === "block" ? "block" : "hit with the mystery"} →</p>
          )}
          <div className="flex min-h-[150px] items-end justify-center gap-1 pt-6">
            <AnimatePresence>
              {(me?.hand ?? []).map((card, i) => (
                <GameCard
                  key={card.id}
                  type={card.type}
                  index={i}
                  total={me?.hand?.length ?? 1}
                  selected={selectedCard === card.id}
                  disabled={!isMyTurn || playMut.isPending}
                  onClick={() => {
                    if (!isMyTurn) return;
                    if (CARD_META[card.type].needsTarget) {
                      setSelectedCard(selectedCard === card.id ? null : card.id);
                    } else {
                      // advance: play immediately
                      setSelectedCard(card.id);
                      playMut.mutate({ cardId: card.id });
                    }
                  }}
                />
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={() => endTurnMut.mutate()}
              disabled={!isMyTurn || endTurnMut.isPending || playMut.isPending}
              className="btn btn-mint"
            >
              {endTurnMut.isPending ? <Loader2 className="animate-spin" size={16} /> : "End turn → move +"}
            </button>
            {selectedCard && (
              <button onClick={() => setSelectedCard(null)} className="btn btn-ghost text-sm">Cancel</button>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-ink-dim">
            Tip: cards are bonus actions. Ending your turn moves your horse <b>+{data.game.baseStep}</b> (turtled horses stay put).
          </p>
        </div>
      </div>

      {/* WIN OVERLAY */}
      <AnimatePresence>
        {showWin && winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 18 }}
              className="panel w-full max-w-md p-8 text-center"
            >
              <Trophy size={48} className="mx-auto mb-3 text-gold" />
              <p className="font-pixel text-sm text-gold">WINNER</p>
              <div className="my-4 flex justify-center"><HorseSprite color={winner.horseColor} size={80} /></div>
              <h2 className="text-2xl font-extrabold" style={{ color: colorHex(winner.horseColor) }}>{winner.name}</h2>
              <p className="mt-1 text-ink-dim">crosses the line first!</p>
              <div className="mt-6 flex gap-3">
                <button onClick={() => navigate("/lobby")} className="btn btn-mint flex-1 inline-flex items-center justify-center gap-2">
                  <Home size={16} /> New race
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
