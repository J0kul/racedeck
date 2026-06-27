// DB-backed helpers and serialization for game state.
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, asc } from "drizzle-orm";
import type { Card } from "./engine";

export function genId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export type PlayerRow = typeof schema.players.$inferSelect;
export type GameRow = typeof schema.games.$inferSelect;

export function parseHand(p: PlayerRow): Card[] {
  try {
    return JSON.parse(p.hand) as Card[];
  } catch {
    return [];
  }
}

export function parseTurnOrder(g: GameRow): string[] {
  try {
    return JSON.parse(g.turnOrder) as string[];
  } catch {
    return [];
  }
}

export async function getGameByCode(code: string) {
  const [g] = await db
    .select()
    .from(schema.games)
    .where(eq(schema.games.code, code.toUpperCase()));
  return g ?? null;
}

export async function getGame(id: string) {
  const [g] = await db.select().from(schema.games).where(eq(schema.games.id, id));
  return g ?? null;
}

export async function getPlayers(gameId: string) {
  return db
    .select()
    .from(schema.players)
    .where(eq(schema.players.gameId, gameId))
    .orderBy(asc(schema.players.seat));
}

export async function getEvents(gameId: string) {
  return db
    .select()
    .from(schema.gameEvents)
    .where(eq(schema.gameEvents.gameId, gameId))
    .orderBy(asc(schema.gameEvents.seq));
}

export async function nextSeq(gameId: string) {
  const evs = await getEvents(gameId);
  return evs.length ? evs[evs.length - 1].seq + 1 : 1;
}

export async function logEvent(
  gameId: string,
  ev: {
    type: string;
    actorPlayerId?: string | null;
    targetPlayerId?: string | null;
    message: string;
    payload?: unknown;
  }
) {
  const seq = await nextSeq(gameId);
  await db.insert(schema.gameEvents).values({
    gameId,
    seq,
    type: ev.type,
    actorPlayerId: ev.actorPlayerId ?? null,
    targetPlayerId: ev.targetPlayerId ?? null,
    message: ev.message,
    payload: JSON.stringify(ev.payload ?? {}),
  });
}

export async function touchGame(id: string) {
  await db
    .update(schema.games)
    .set({ updatedAt: new Date() })
    .where(eq(schema.games.id, id));
}

/** Stamp the turn clock — called whenever a new player's turn begins. */
export async function stampTurnStart(id: string) {
  await db
    .update(schema.games)
    .set({ turnStartedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.games.id, id));
}
