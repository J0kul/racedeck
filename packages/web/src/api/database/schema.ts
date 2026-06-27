import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export * from "./auth-schema";

/**
 * Game tables for RaceDeck.
 */

// A game/room. Stored state machine.
export const games = sqliteTable("games", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(), // 4-char join code
  hostUserId: text("host_user_id").notNull(),
  status: text("status").notNull().default("lobby"), // lobby | playing | finished
  maxPlayers: integer("max_players").notNull().default(4),
  trackLength: integer("track_length").notNull().default(20),
  baseStep: integer("base_step").notNull().default(1),
  turnOrder: text("turn_order").notNull().default("[]"), // JSON array of playerIds
  currentTurnIndex: integer("current_turn_index").notNull().default(0),
  turnCount: integer("turn_count").notNull().default(0),
  winnerPlayerId: text("winner_player_id"),
  turnStartedAt: integer("turn_started_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// A player seat within a game.
export const players = sqliteTable("players", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  horseColor: text("horse_color").notNull(), // hex / key
  seat: integer("seat").notNull(), // 0..3
  position: integer("position").notNull().default(0), // square on track
  hand: text("hand").notNull().default("[]"), // JSON array of card objects
  isReady: integer("is_ready", { mode: "boolean" }).notNull().default(false),
  isBot: integer("is_bot", { mode: "boolean" }).notNull().default(false),
  skipNextTurn: integer("skip_next_turn", { mode: "boolean" }).notNull().default(false),
  turtleTurns: integer("turtle_turns").notNull().default(0), // >0 = slowed
  cardsPlayedThisTurn: integer("cards_played_this_turn").notNull().default(0),
  shieldActive: integer("shield_active", { mode: "boolean" }).notNull().default(false),
  nitroActive: integer("nitro_active", { mode: "boolean" }).notNull().default(false),
  finished: integer("finished", { mode: "boolean" }).notNull().default(false),
  finishRank: integer("finish_rank"),
  connectedAt: integer("connected_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Event log for the right rail (and to drive client animations).
export const gameEvents = sqliteTable("game_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameId: text("game_id").notNull(),
  seq: integer("seq").notNull(),
  type: text("type").notNull(), // move | advance | block | turtle | steal | draw | turn | win | join | start
  actorPlayerId: text("actor_player_id"),
  targetPlayerId: text("target_player_id"),
  message: text("message").notNull(),
  payload: text("payload").notNull().default("{}"), // JSON
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
