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

function leaderOf(players: PlayerRow[], selfId: string): PlayerRow | null {
  const rivals = players.filter((p) => p.id !== selfId && !p.finished);
  if (rivals.length === 0) return null;
  let best = rivals[0];
  for (const r of rivals) if (r.position > best.position) best = r;
  return best;
}

async function runOneBotTurn(gameId: string, botId: string) {
  for (let i = 0; i < 2; i++) {
    const game = await getGame(gameId);
    if (!game || game.status !== "playing") return;
    const players = await getPlayers(gameId);
    const me = players.find((p) => p.id === botId);
    if (!me || me.finished) break;

    const order = parseTurnOrder(game);
    if (order[game.currentTurnIndex] !== botId) return;

    const hand = parseHand(me);
    if (hand.length === 0) break;

    const leader = leaderOf(players, botId);
    const distToFinish = game.trackLength - me.position;
    const leaderAhead = leader ? leader.position >= me.position : false;

    // Priority 1: nitro if close to finish or leading
    const nitro = hand.find((c) => c.type === "nitro");
    if (nitro && (distToFinish <= 3 || !leaderAhead)) {
      const r = await resolveCard(gameId, me, nitro.id, null);
      if (r.ok) continue;
    }

    // Priority 2: +2 advance wins or is very useful
    const advance = hand.find((c) => c.type === "advance");
    if (advance && (distToFinish <= 2 || !leaderAhead || i === 0)) {
      const r = await resolveCard(gameId, me, advance.id, null);
      if (r.ok) {
        const g = await getGame(gameId);
        if (g && g.status === "finished") return;
        continue;
      }
    }

    // Priority 3: sabotage the leader (hits harder than block)
    const sabotage = hand.find((c) => c.type === "sabotage");
    if (sabotage && leader && leaderAhead) {
      const r = await resolveCard(gameId, me, sabotage.id, leader.id);
      if (r.ok) continue;
    }

    // Priority 4: block the leader
    const block = hand.find((c) => c.type === "block");
    if (block && leader && leaderAhead) {
      const r = await resolveCard(gameId, me, block.id, leader.id);
      if (r.ok) continue;
    }

    // Priority 5: swap if leader is well ahead and swap helps
    const swap = hand.find((c) => c.type === "swap");
    if (swap && leader && leader.position - me.position >= 4) {
      const r = await resolveCard(gameId, me, swap.id, leader.id);
      if (r.ok) continue;
    }

    // Priority 6: tax (AoE — always good)
    const tax = hand.find((c) => c.type === "tax");
    if (tax) {
      const r = await resolveCard(gameId, me, tax.id, null);
      if (r.ok) continue;
    }

    // Priority 7: mystery on leader
    const mystery = hand.find((c) => c.type === "mystery");
    if (mystery && leader) {
      const r = await resolveCard(gameId, me, mystery.id, leader.id);
      if (r.ok) continue;
    }

    // Priority 8: shield if in the lead (protect the position)
    const shield = hand.find((c) => c.type === "shield");
    if (shield && !leaderAhead) {
      const r = await resolveCard(gameId, me, shield.id, null);
      if (r.ok) continue;
    }

    // Priority 9: leftover advance
    if (advance) {
      const r = await resolveCard(gameId, me, advance.id, null);
      if (r.ok) {
        const g = await getGame(gameId);
        if (g && g.status === "finished") return;
        continue;
      }
    }

    break;
  }

  const players = await getPlayers(gameId);
  const me = players.find((p) => p.id === botId);
  if (me) await endTurnForPlayer(gameId, me);
}

export async function runBots(gameId: string) {
  for (let guard = 0; guard < 30; guard++) {
    const game = await getGame(gameId);
    if (!game || game.status !== "playing") return;
    const players = await getPlayers(gameId);
    const order = parseTurnOrder(game);
    const currentId = order[game.currentTurnIndex];
    const current = players.find((p) => p.id === currentId);
    if (!current) return;
    if (!current.isBot) return;
    if (current.finished) {
      await endTurnForPlayer(gameId, current);
      continue;
    }
    await runOneBotTurn(gameId, currentId);
  }
}
