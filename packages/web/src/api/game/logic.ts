// Shared turn-resolution logic used by both human routes and the bot driver.
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import {
  getGame,
  getPlayers,
  parseHand,
  parseTurnOrder,
  logEvent,
  touchGame,
  stampTurnStart,
  type PlayerRow,
} from "./store";
import {
  drawCard,
  rollMystery,
  baseStepFor,
  TURTLE_DURATION,
  type Card,
} from "./engine";

export type PlayResult = { ok: true } | { ok: false; message: string };

// Resolve a single card play for a given player (already validated to be their turn).
export async function resolveCard(
  gameId: string,
  player: PlayerRow,
  cardId: string,
  targetPlayerId: string | null
): Promise<PlayResult> {
  const game = await getGame(gameId);
  if (!game) return { ok: false, message: "Not found" };
  const players = await getPlayers(gameId);
  const me = players.find((p) => p.id === player.id);
  if (!me) return { ok: false, message: "Not in this race." };

  const hand = parseHand(me);
  const card = hand.find((x) => x.id === cardId);
  if (!card) return { ok: false, message: "Card not in hand." };
  if (me.cardsPlayedThisTurn >= 2) return { ok: false, message: "Max 2 cards per turn." };

  let stolenCard: Card | undefined;

  // Helper: check if a target has shield and consume it
  async function checkShield(targetId: string): Promise<boolean> {
    const target = players.find((p) => p.id === targetId);
    if (!target || !target.shieldActive) return false;
    await db.update(schema.players).set({ shieldActive: false }).where(eq(schema.players.id, targetId));
    await logEvent(gameId, {
      type: "shield",
      actorPlayerId: targetId,
      message: `🛡️ ${target.name}'s SHIELD absorbs the attack!`,
    });
    return true;
  }

  if (card.type === "advance") {
    const newPos = Math.min(me.position + 2, game.trackLength);
    await db.update(schema.players).set({ position: newPos }).where(eq(schema.players.id, me.id));
    await logEvent(gameId, {
      type: "advance",
      actorPlayerId: me.id,
      message: `${me.name} plays +2 ADVANCE and surges to square ${newPos}!`,
      payload: { to: newPos },
    });

  } else if (card.type === "block") {
    const target = players.find((p) => p.id === targetPlayerId);
    if (!target || target.id === me.id || target.finished)
      return { ok: false, message: "Pick a valid rival to block." };
    const blocked = await checkShield(target.id);
    if (!blocked) {
      await db.update(schema.players).set({ skipNextTurn: true }).where(eq(schema.players.id, target.id));
      await logEvent(gameId, {
        type: "block",
        actorPlayerId: me.id,
        targetPlayerId: target.id,
        message: `${me.name} BLOCKS ${target.name} — their next turn is gone!`,
      });
    }

  } else if (card.type === "mystery") {
    const outcome = rollMystery();
    if (outcome.kind === "turtle") {
      const target = players.find((p) => p.id === targetPlayerId);
      if (!target || target.id === me.id || target.finished)
        return { ok: false, message: "Pick a valid rival for the mystery." };
      const blocked = await checkShield(target.id);
      if (!blocked) {
        await db.update(schema.players).set({ turtleTurns: TURTLE_DURATION }).where(eq(schema.players.id, target.id));
        await logEvent(gameId, {
          type: "turtle",
          actorPlayerId: me.id,
          targetPlayerId: target.id,
          message: `🐢 MYSTERY! ${me.name} turns ${target.name}'s horse into a turtle for ${TURTLE_DURATION} turns!`,
          payload: { effect: "turtle", turns: TURTLE_DURATION },
        });
      }
    } else {
      let target = players.find((p) => p.id === targetPlayerId && p.id !== me.id);
      const candidates = players.filter((p) => p.id !== me.id && parseHand(p).length > 0);
      if (!target || parseHand(target).length === 0) {
        target = candidates[Math.floor(Math.random() * candidates.length)];
      }
      if (target) {
        const tHand = parseHand(target);
        const stolenIdx = Math.floor(Math.random() * tHand.length);
        const [stolen] = tHand.splice(stolenIdx, 1);
        await db.update(schema.players).set({ hand: JSON.stringify(tHand) }).where(eq(schema.players.id, target.id));
        await logEvent(gameId, {
          type: "steal",
          actorPlayerId: me.id,
          targetPlayerId: target.id,
          message: `🃏 MYSTERY! ${me.name} steals a card from ${target.name}!`,
          payload: { effect: "steal", stolen: stolen?.type },
        });
        stolenCard = stolen;
      } else {
        await logEvent(gameId, {
          type: "steal",
          actorPlayerId: me.id,
          message: `🃏 MYSTERY fizzles — no cards to steal.`,
        });
      }
    }

  } else if (card.type === "swap") {
    const target = players.find((p) => p.id === targetPlayerId);
    if (!target || target.id === me.id || target.finished)
      return { ok: false, message: "Pick a valid rival to swap with." };
    const myPos = me.position;
    const theirPos = target.position;
    await db.update(schema.players).set({ position: theirPos }).where(eq(schema.players.id, me.id));
    await db.update(schema.players).set({ position: myPos }).where(eq(schema.players.id, target.id));
    await logEvent(gameId, {
      type: "swap",
      actorPlayerId: me.id,
      targetPlayerId: target.id,
      message: `🔀 SWAP! ${me.name} and ${target.name} swap positions on the track!`,
      payload: { myPos: theirPos, theirPos: myPos },
    });

  } else if (card.type === "shield") {
    await db.update(schema.players).set({ shieldActive: true }).where(eq(schema.players.id, me.id));
    await logEvent(gameId, {
      type: "shield",
      actorPlayerId: me.id,
      message: `🛡️ ${me.name} raises a SHIELD — the next attack against them is blocked!`,
    });

  } else if (card.type === "sabotage") {
    const target = players.find((p) => p.id === targetPlayerId);
    if (!target || target.id === me.id || target.finished)
      return { ok: false, message: "Pick a valid rival to sabotage." };
    const blocked = await checkShield(target.id);
    if (!blocked) {
      const newPos = Math.max(0, target.position - 3);
      await db.update(schema.players).set({ position: newPos }).where(eq(schema.players.id, target.id));
      await logEvent(gameId, {
        type: "sabotage",
        actorPlayerId: me.id,
        targetPlayerId: target.id,
        message: `💥 SABOTAGE! ${me.name} knocks ${target.name} back 3 squares to ${newPos}!`,
        payload: { to: newPos },
      });
    }

  } else if (card.type === "nitro") {
    await db.update(schema.players).set({ nitroActive: true }).where(eq(schema.players.id, me.id));
    await logEvent(gameId, {
      type: "nitro",
      actorPlayerId: me.id,
      message: `⚡ NITRO! ${me.name}'s next move will be double speed!`,
    });

  } else if (card.type === "tax") {
    const rivals = players.filter((p) => p.id !== me.id && !p.finished);
    let taxed = 0;
    for (const rival of rivals) {
      const rHand = parseHand(rival);
      if (rHand.length === 0) continue;
      // shield absorbs tax too
      if (rival.shieldActive) {
        await db.update(schema.players).set({ shieldActive: false }).where(eq(schema.players.id, rival.id));
        await logEvent(gameId, {
          type: "shield",
          actorPlayerId: rival.id,
          message: `🛡️ ${rival.name}'s SHIELD deflects the TAX!`,
        });
        continue;
      }
      rHand.splice(Math.floor(Math.random() * rHand.length), 1);
      await db.update(schema.players).set({ hand: JSON.stringify(rHand) }).where(eq(schema.players.id, rival.id));
      taxed++;
    }
    await logEvent(gameId, {
      type: "tax",
      actorPlayerId: me.id,
      message: `💸 TAX COLLECTOR! ${me.name} forces ${taxed} rival${taxed !== 1 ? "s" : ""} to discard a card!`,
    });
  }

  // remove played card, add stolen, draw replacement; track cards played this turn
  const freshMe = (await getPlayers(gameId)).find((p) => p.id === me.id)!;
  const newHand = parseHand(freshMe).filter((x) => x.id !== cardId);
  if (stolenCard) newHand.push(stolenCard);
  newHand.push(drawCard());
  await db.update(schema.players)
    .set({ hand: JSON.stringify(newHand), cardsPlayedThisTurn: freshMe.cardsPlayedThisTurn + 1 })
    .where(eq(schema.players.id, me.id));

  const meAfter = (await getPlayers(gameId)).find((p) => p.id === me.id)!;
  await checkWin(gameId, meAfter);
  await touchGame(gameId);
  return { ok: true };
}

export async function checkWin(gameId: string, player: PlayerRow) {
  const game = await getGame(gameId);
  if (!game) return false;
  const fresh = (await getPlayers(gameId)).find((p) => p.id === player.id);
  if (!fresh) return false;
  if (fresh.position >= game.trackLength && !fresh.finished) {
    const finishedCount = (await getPlayers(gameId)).filter((p) => p.finished).length;
    await db
      .update(schema.players)
      .set({ finished: true, finishRank: finishedCount + 1 })
      .where(eq(schema.players.id, player.id));
    await logEvent(gameId, {
      type: "win",
      actorPlayerId: player.id,
      message: `${player.name} crosses the finish line! 🏆`,
    });
    if (!game.winnerPlayerId) {
      await db
        .update(schema.games)
        .set({ status: "finished", winnerPlayerId: player.id, updatedAt: new Date() })
        .where(eq(schema.games.id, gameId));
    }
    return true;
  }
  return false;
}

export async function applyBaseStep(gameId: string, player: PlayerRow) {
  const game = await getGame(gameId);
  if (!game) return;
  let turtleTurns = player.turtleTurns;
  const step = baseStepFor({ baseStep: game.baseStep, turtleTurns, nitroActive: player.nitroActive });
  const newPos = Math.min(player.position + step, game.trackLength);
  if (turtleTurns > 0) turtleTurns -= 1;

  await db
    .update(schema.players)
    .set({ position: newPos, turtleTurns, nitroActive: false }) // consume nitro
    .where(eq(schema.players.id, player.id));

  if (step > 0) {
    const boosted = player.nitroActive;
    await logEvent(gameId, {
      type: "move",
      actorPlayerId: player.id,
      message: boosted
        ? `${player.name} NITRO-BOOSTS ${step} squares to ${newPos}! ⚡`
        : `${player.name} trots ${step} forward to ${newPos}.`,
      payload: { to: newPos },
    });
  } else if (player.turtleTurns > 0) {
    await logEvent(gameId, {
      type: "turtle",
      actorPlayerId: player.id,
      message: `${player.name} is a turtle — no ground gained.`,
      payload: { to: newPos },
    });
  }
}

export async function advanceTurn(gameId: string) {
  const game = await getGame(gameId);
  if (!game) return;
  const players = await getPlayers(gameId);
  const order = parseTurnOrder(game);
  if (order.length === 0) return;

  let idx = game.currentTurnIndex;
  let guard = 0;
  while (guard < order.length * 2 + 2) {
    guard++;
    idx = (idx + 1) % order.length;
    const pid = order[idx];
    const p = players.find((x) => x.id === pid);
    if (!p) continue;
    if (p.finished) continue;
    if (p.skipNextTurn) {
      await db.update(schema.players).set({ skipNextTurn: false }).where(eq(schema.players.id, p.id));
      await logEvent(gameId, {
        type: "block",
        targetPlayerId: p.id,
        message: `${p.name} is blocked and skips this turn.`,
      });
      continue;
    }
    break;
  }
  await db
    .update(schema.games)
    .set({ currentTurnIndex: idx, turnCount: game.turnCount + 1, updatedAt: new Date() })
    .where(eq(schema.games.id, gameId));
  const nextPid = order[idx];
  const np = (await getPlayers(gameId)).find((x) => x.id === nextPid);
  if (np) {
    // reset card-play counter and shield for the incoming player's turn
    await db.update(schema.players)
      .set({ cardsPlayedThisTurn: 0 })
      .where(eq(schema.players.id, np.id));
    await logEvent(gameId, { type: "turn", actorPlayerId: np.id, message: `${np.name}'s turn.` });
  }
  await stampTurnStart(gameId);
}

// Full end-turn for a player: base step + win check + advance pointer.
export async function endTurnForPlayer(gameId: string, player: PlayerRow) {
  const game = await getGame(gameId);
  if (!game || game.status !== "playing") return;
  if (!player.finished) {
    await applyBaseStep(gameId, player);
    const after = (await getPlayers(gameId)).find((p) => p.id === player.id)!;
    await checkWin(gameId, after);
  }
  const g2 = await getGame(gameId);
  if (g2 && g2.status !== "finished") await advanceTurn(gameId);
  await touchGame(gameId);
}
