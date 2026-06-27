// Ruthless AI driver. Runs any bots whose turn it currently is, in sequence,
// until the active player is a human or the game ends.
import { getGame, getPlayers, parseHand, parseTurnOrder } from "./store";
import { resolveCard, endTurnForPlayer } from "./logic";
import type { PlayerRow } from "./store";

const BOT_NAMES = ["Maverick", "Nitro", "Vega", "Razor", "Comet"];

export function pickBotName(used: Set<string>): string {
  const free = BOT_NAMES.filter((n) => !used.has(n));
  const pool = free.length ? free : BOT_NAMES;
  return pool[Math.floor(Math.random() * pool.length)];
}

// The leader = the non-finished rival closest to the finish (ties broken randomly).
function leaderOf(players: PlayerRow[], selfId: string): PlayerRow | null {
  const rivals = players.filter((p) => p.id !== selfId && !p.finished);
  if (rivals.length === 0) return null;
  let best = rivals[0];
  for (const r of rivals) if (r.position > best.position) best = r;
  return best;
}

// Decide and play cards for one bot's turn, then end the turn.
async function runOneBotTurn(gameId: string, botId: string) {
  // A bot may play multiple cards in a turn (e.g. block the leader AND +4 itself).
  // Ruthless: keep playing while it has impactful cards, cap to avoid loops.
  for (let i = 0; i < 6; i++) {
    const game = await getGame(gameId);
    if (!game || game.status !== "playing") return;
    const players = await getPlayers(gameId);
    const me = players.find((p) => p.id === botId);
    if (!me || me.finished) break;

    const order = parseTurnOrder(game);
    if (order[game.currentTurnIndex] !== botId) return; // not our turn anymore

    const hand = parseHand(me);
    if (hand.length === 0) break;

    const leader = leaderOf(players, botId);
    const distToFinish = game.trackLength - me.position;
    const leaderAhead = leader ? leader.position >= me.position : false;

    // Priority 1: if +4 wins or closes the gap meaningfully, take it.
    const advance = hand.find((c) => c.type === "advance");
    if (advance && (distToFinish <= 4 || !leaderAhead || i === 0)) {
      const r = await resolveCard(gameId, me, advance.id, null);
      if (r.ok) {
        const g = await getGame(gameId);
        if (g && g.status === "finished") return;
        continue;
      }
    }

    // Priority 2: sabotage the leader. Block if leader is about to win or clearly ahead.
    const block = hand.find((c) => c.type === "block");
    if (block && leader && leaderAhead) {
      const r = await resolveCard(gameId, me, block.id, leader.id);
      if (r.ok) continue;
    }

    // Priority 3: mystery on the leader (turtle them or steal).
    const mystery = hand.find((c) => c.type === "mystery");
    if (mystery && leader) {
      const r = await resolveCard(gameId, me, mystery.id, leader.id);
      if (r.ok) continue;
    }

    // Priority 4: leftover advance even if leading, to extend the lead.
    if (advance) {
      const r = await resolveCard(gameId, me, advance.id, null);
      if (r.ok) {
        const g = await getGame(gameId);
        if (g && g.status === "finished") return;
        continue;
      }
    }

    // Nothing impactful left this turn.
    break;
  }

  // End the bot's turn (applies base step + advances pointer).
  const players = await getPlayers(gameId);
  const me = players.find((p) => p.id === botId);
  if (me) await endTurnForPlayer(gameId, me);
}

// Drive all consecutive bot turns. Returns when a human is up or game ends.
export async function runBots(gameId: string) {
  for (let guard = 0; guard < 30; guard++) {
    const game = await getGame(gameId);
    if (!game || game.status !== "playing") return;
    const players = await getPlayers(gameId);
    const order = parseTurnOrder(game);
    const currentId = order[game.currentTurnIndex];
    const current = players.find((p) => p.id === currentId);
    if (!current) return;
    if (!current.isBot) return; // human's turn — stop
    if (current.finished) {
      // shouldn't happen (advanceTurn skips finished), safety net
      await endTurnForPlayer(gameId, current);
      continue;
    }
    await runOneBotTurn(gameId, currentId);
  }
}
