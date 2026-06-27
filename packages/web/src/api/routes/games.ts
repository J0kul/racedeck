import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import {
  genId,
  genCode,
  getGame,
  getGameByCode,
  getPlayers,
  parseHand,
  parseTurnOrder,
  logEvent,
  touchGame,
  stampTurnStart,
  getEvents,
  type PlayerRow,
} from "../game/store";
import { startingHand, HORSE_COLORS } from "../game/engine";
import { resolveCard, endTurnForPlayer } from "../game/logic";
import { runBots, pickBotName } from "../game/bot";

type User = { id: string; name?: string | null; email: string };

function publicPlayer(p: PlayerRow, selfUserId: string) {
  const hand = parseHand(p);
  const isSelf = p.userId === selfUserId;
  return {
    id: p.id,
    name: p.name,
    horseColor: p.horseColor,
    seat: p.seat,
    position: p.position,
    isReady: p.isReady,
    isBot: p.isBot,
    skipNextTurn: p.skipNextTurn,
    turtleTurns: p.turtleTurns,
    finished: p.finished,
    finishRank: p.finishRank,
    isSelf,
    cardCount: hand.length,
    hand: isSelf ? hand : null,
  };
}

async function gameState(gameId: string, selfUserId: string) {
  const game = await getGame(gameId);
  if (!game) return null;
  const players = await getPlayers(gameId);
  const order = parseTurnOrder(game);
  const currentPlayerId = order[game.currentTurnIndex] ?? null;
  const evs = await getEvents(gameId);
  return {
    game: {
      id: game.id,
      code: game.code,
      status: game.status,
      hostUserId: game.hostUserId,
      maxPlayers: game.maxPlayers,
      trackLength: game.trackLength,
      baseStep: game.baseStep,
      turnOrder: order,
      currentTurnIndex: game.currentTurnIndex,
      currentPlayerId,
      turnCount: game.turnCount,
      winnerPlayerId: game.winnerPlayerId,
      turnStartedAt: game.turnStartedAt ? game.turnStartedAt.getTime() : null,
      turnDuration: 60,
    },
    players: players.map((p) => publicPlayer(p, selfUserId)),
    events: evs.slice(-40).map((e) => ({
      id: e.id,
      seq: e.seq,
      type: e.type,
      actorPlayerId: e.actorPlayerId,
      targetPlayerId: e.targetPlayerId,
      message: e.message,
      payload: e.payload,
    })),
    you: players.find((p) => p.userId === selfUserId)?.id ?? null,
  };
}

function freeColor(players: PlayerRow[], preferred?: string): string {
  const used = new Set(players.map((p) => p.horseColor));
  if (preferred && !used.has(preferred)) return preferred;
  return HORSE_COLORS.find((h) => !used.has(h.key))?.key ?? HORSE_COLORS[0].key;
}

export const games = new Hono()
  // ---- Create a room ----
  .post("/", requireAuth, async (c) => {
    const user = c.get("user") as User;
    const body = await c.req.json().catch(() => ({}));
    const maxPlayers = Math.min(4, Math.max(2, Number(body.maxPlayers) || 4));
    const horseColor = String(body.horseColor || HORSE_COLORS[0].key);

    let code = genCode();
    for (let i = 0; i < 5; i++) {
      if (!(await getGameByCode(code))) break;
      code = genCode();
    }
    const gameId = genId("g");
    await db.insert(schema.games).values({
      id: gameId,
      code,
      hostUserId: user.id,
      status: "lobby",
      maxPlayers,
      trackLength: 20,
      baseStep: 1,
    });
    const playerId = genId("p");
    await db.insert(schema.players).values({
      id: playerId,
      gameId,
      userId: user.id,
      name: user.name || user.email.split("@")[0],
      horseColor,
      seat: 0,
      hand: "[]",
      isReady: true,
    });
    await logEvent(gameId, { type: "join", actorPlayerId: playerId, message: `${user.name || "Host"} created the race.` });
    return c.json({ gameId, code }, 201);
  })

  // ---- Join a room by code ----
  .post("/join", requireAuth, async (c) => {
    const user = c.get("user") as User;
    const body = await c.req.json().catch(() => ({}));
    const code = String(body.code || "").toUpperCase().trim();
    const horseColor = String(body.horseColor || "");
    const game = await getGameByCode(code);
    if (!game) return c.json({ message: "Race not found." }, 404);
    if (game.status !== "lobby") return c.json({ message: "Race already started." }, 400);

    const players = await getPlayers(game.id);
    const already = players.find((p) => p.userId === user.id);
    if (already) return c.json({ gameId: game.id, code: game.code }, 200);
    if (players.length >= game.maxPlayers) return c.json({ message: "Race is full." }, 400);

    const color = freeColor(players, horseColor);
    const playerId = genId("p");
    await db.insert(schema.players).values({
      id: playerId,
      gameId: game.id,
      userId: user.id,
      name: user.name || user.email.split("@")[0],
      horseColor: color,
      seat: players.length,
      hand: "[]",
      isReady: true,
    });
    await logEvent(game.id, { type: "join", actorPlayerId: playerId, message: `${user.name || "A racer"} joined the paddock.` });
    await touchGame(game.id);
    return c.json({ gameId: game.id, code: game.code }, 200);
  })

  // ---- Add an AI bot (host only, lobby only) ----
  .post("/:id/add-bot", requireAuth, async (c) => {
    const user = c.get("user") as User;
    const id = c.req.param("id");
    const game = await getGame(id);
    if (!game) return c.json({ message: "Not found" }, 404);
    if (game.hostUserId !== user.id) return c.json({ message: "Only the host can add bots." }, 403);
    if (game.status !== "lobby") return c.json({ message: "Race already started." }, 400);
    const players = await getPlayers(id);
    if (players.length >= game.maxPlayers) return c.json({ message: "Race is full." }, 400);

    const usedNames = new Set(players.filter((p) => p.isBot).map((p) => p.name.replace(/ \(AI\)$/, "")));
    const botName = pickBotName(usedNames);
    const color = freeColor(players);
    const playerId = genId("p");
    await db.insert(schema.players).values({
      id: playerId,
      gameId: id,
      userId: `bot_${playerId}`,
      name: `${botName} (AI)`,
      horseColor: color,
      seat: players.length,
      hand: "[]",
      isReady: true,
      isBot: true,
    });
    await logEvent(id, { type: "join", actorPlayerId: playerId, message: `${botName} (AI) saddles up — ruthless mode. 🤖` });
    await touchGame(id);
    return c.json({ ok: true }, 200);
  })

  // ---- Remove a bot (host only, lobby only) ----
  .post("/:id/remove-bot", requireAuth, async (c) => {
    const user = c.get("user") as User;
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const botPlayerId = String(body.playerId || "");
    const game = await getGame(id);
    if (!game) return c.json({ message: "Not found" }, 404);
    if (game.hostUserId !== user.id) return c.json({ message: "Only the host can remove bots." }, 403);
    if (game.status !== "lobby") return c.json({ message: "Race already started." }, 400);
    const players = await getPlayers(id);
    const bot = players.find((p) => p.id === botPlayerId && p.isBot);
    if (!bot) return c.json({ message: "Bot not found." }, 404);
    await db.delete(schema.players).where(eq(schema.players.id, bot.id));
    // re-pack seats
    const remaining = (await getPlayers(id)).sort((a, b) => a.seat - b.seat);
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].seat !== i)
        await db.update(schema.players).set({ seat: i }).where(eq(schema.players.id, remaining[i].id));
    }
    await touchGame(id);
    return c.json({ ok: true }, 200);
  })

  // ---- Update your seat (color) in lobby ----
  .post("/:id/seat", requireAuth, async (c) => {
    const user = c.get("user") as User;
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const game = await getGame(id);
    if (!game) return c.json({ message: "Not found" }, 404);
    if (game.status !== "lobby") return c.json({ message: "Already started" }, 400);
    const players = await getPlayers(id);
    const me = players.find((p) => p.userId === user.id);
    if (!me) return c.json({ message: "Not in this race" }, 403);
    const color = String(body.horseColor || me.horseColor);
    if (color !== me.horseColor && players.some((p) => p.horseColor === color))
      return c.json({ message: "Color taken" }, 400);
    await db.update(schema.players).set({ horseColor: color }).where(eq(schema.players.id, me.id));
    await touchGame(id);
    return c.json({ ok: true }, 200);
  })

  // ---- Start the race (host only) ----
  .post("/:id/start", requireAuth, async (c) => {
    const user = c.get("user") as User;
    const id = c.req.param("id");
    const game = await getGame(id);
    if (!game) return c.json({ message: "Not found" }, 404);
    if (game.hostUserId !== user.id) return c.json({ message: "Only the host can start." }, 403);
    if (game.status !== "lobby") return c.json({ message: "Already started." }, 400);
    const players = await getPlayers(id);
    if (players.length < 2) return c.json({ message: "Need at least 2 racers (add a bot or two)." }, 400);

    for (const p of players) {
      await db.update(schema.players).set({ hand: JSON.stringify(startingHand()) }).where(eq(schema.players.id, p.id));
    }
    const order = players.map((p) => p.id);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    await db
      .update(schema.games)
      .set({ status: "playing", turnOrder: JSON.stringify(order), currentTurnIndex: 0, updatedAt: new Date() })
      .where(eq(schema.games.id, id));
    await logEvent(id, { type: "start", message: "And they're off! 🏇" });
    const firstP = players.find((p) => p.id === order[0]);
    if (firstP) await logEvent(id, { type: "turn", actorPlayerId: firstP.id, message: `${firstP.name}'s turn.` });
    await stampTurnStart(id); // start the 60s clock for the first turn

    await runBots(id); // in case a bot leads off
    return c.json({ ok: true }, 200);
  })

  // ---- Get current state (polled). Also drives bots + enforces 60s timer. ----
  .get("/:id", requireAuth, async (c) => {
    const user = c.get("user") as User;
    const id = c.req.param("id");
    const game = await getGame(id);
    if (!game) return c.json({ message: "Not found" }, 404);
    if (game.status === "playing") {
      // Auto-forfeit if a human's turn has exceeded 60s
      const TURN_LIMIT_MS = 60_000;
      const now = Date.now();
      if (game.turnStartedAt) {
        const elapsed = now - game.turnStartedAt.getTime();
        if (elapsed > TURN_LIMIT_MS) {
          const players = await getPlayers(id);
          const order = parseTurnOrder(game);
          const currentPid = order[game.currentTurnIndex];
          const currentP = players.find((p) => p.id === currentPid);
          // only auto-forfeit humans (bots are handled by runBots)
          if (currentP && !currentP.isBot && !currentP.finished) {
            await logEvent(id, {
              type: "turn",
              actorPlayerId: currentP.id,
              message: `⏱ ${currentP.name} ran out of time — turn skipped!`,
            });
            await endTurnForPlayer(id, currentP);
          }
        }
      }
      await runBots(id); // advance any pending bot turns
    }
    const st = await gameState(id, user.id);
    if (!st) return c.json({ message: "Not found" }, 404);
    return c.json(st, 200);
  })

  // ---- List your active games ----
  .get("/", requireAuth, async (c) => {
    const user = c.get("user") as User;
    const myPlayers = await db.select().from(schema.players).where(eq(schema.players.userId, user.id));
    const out = [];
    for (const p of myPlayers) {
      const g = await getGame(p.gameId);
      if (g && g.status !== "finished") out.push({ id: g.id, code: g.code, status: g.status });
    }
    return c.json({ games: out }, 200);
  })

  // ---- Play a card ----
  .post("/:id/play", requireAuth, async (c) => {
    const user = c.get("user") as User;
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const cardId = String(body.cardId || "");
    const targetPlayerId = body.targetPlayerId ? String(body.targetPlayerId) : null;

    const game = await getGame(id);
    if (!game) return c.json({ message: "Not found" }, 404);
    if (game.status !== "playing") return c.json({ message: "Race not active." }, 400);
    const players = await getPlayers(id);
    const me = players.find((p) => p.userId === user.id);
    if (!me) return c.json({ message: "Not in this race." }, 403);
    const order = parseTurnOrder(game);
    if (order[game.currentTurnIndex] !== me.id) return c.json({ message: "Not your turn." }, 400);
    if (me.finished) return c.json({ message: "You already finished." }, 400);

    const result = await resolveCard(id, me, cardId, targetPlayerId);
    if (!result.ok) return c.json({ message: result.message }, 400);
    return c.json({ ok: true }, 200);
  })

  // ---- End your turn ----
  .post("/:id/end-turn", requireAuth, async (c) => {
    const user = c.get("user") as User;
    const id = c.req.param("id");
    const game = await getGame(id);
    if (!game) return c.json({ message: "Not found" }, 404);
    if (game.status !== "playing") return c.json({ message: "Race not active." }, 400);
    const players = await getPlayers(id);
    const me = players.find((p) => p.userId === user.id);
    if (!me) return c.json({ message: "Not in this race." }, 403);
    const order = parseTurnOrder(game);
    if (order[game.currentTurnIndex] !== me.id) return c.json({ message: "Not your turn." }, 400);

    await endTurnForPlayer(id, me);
    await runBots(id); // let bots take their consecutive turns
    return c.json({ ok: true }, 200);
  });
