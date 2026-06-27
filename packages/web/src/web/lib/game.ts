export type CardType = "advance" | "block" | "mystery";
export interface Card {
  id: string;
  type: CardType;
}

export const HORSE_COLORS = [
  { key: "mint", hex: "#3BE3A0", name: "Emerald" },
  { key: "rose", hex: "#FB5E7E", name: "Crimson" },
  { key: "cyan", hex: "#34D3F5", name: "Azure" },
  { key: "gold", hex: "#F5C451", name: "Amber" },
] as const;

export function colorHex(key: string): string {
  return HORSE_COLORS.find((c) => c.key === key)?.hex ?? "#3BE3A0";
}
export function colorName(key: string): string {
  return HORSE_COLORS.find((c) => c.key === key)?.name ?? key;
}

// hue-rotate the mint sprite (base ~150deg green) toward target color.
export function spriteHue(key: string): number {
  switch (key) {
    case "mint":
      return 0;
    case "rose":
      return 200; // toward pink/red
    case "cyan":
      return 40; // toward cyan/blue
    case "gold":
      return -110; // toward amber/yellow
    default:
      return 0;
  }
}

export const CARD_META: Record<
  CardType,
  { label: string; short: string; color: string; glow: string; desc: string; needsTarget: boolean }
> = {
  advance: {
    label: "ADVANCE",
    short: "+4",
    color: "#3BE3A0",
    glow: "rgba(59,227,160,0.55)",
    desc: "Gallop 4 squares forward instantly.",
    needsTarget: false,
  },
  block: {
    label: "BLOCK",
    short: "✕",
    color: "#FB5E7E",
    glow: "rgba(251,94,126,0.55)",
    desc: "A chosen rival skips their next turn.",
    needsTarget: true,
  },
  mystery: {
    label: "MYSTERY",
    short: "?",
    color: "#8B5CF6",
    glow: "rgba(139,92,246,0.55)",
    desc: "Turtle a rival's horse, or steal one of their cards.",
    needsTarget: true,
  },
};

export interface PlayerState {
  id: string;
  name: string;
  horseColor: string;
  seat: number;
  position: number;
  isReady: boolean;
  skipNextTurn: boolean;
  turtleTurns: number;
  finished: boolean;
  finishRank: number | null;
  isSelf: boolean;
  isBot: boolean;
  cardCount: number;
  hand: Card[] | null;
}

export interface GameEvent {
  id: number;
  seq: number;
  type: string;
  actorPlayerId: string | null;
  targetPlayerId: string | null;
  message: string;
  payload: string;
}

export interface GameStateResp {
  game: {
    id: string;
    code: string;
    status: "lobby" | "playing" | "finished";
    hostUserId: string;
    maxPlayers: number;
    trackLength: number;
    baseStep: number;
    turnOrder: string[];
    currentTurnIndex: number;
    currentPlayerId: string | null;
    turnCount: number;
    winnerPlayerId: string | null;
    turnStartedAt: number | null;
    turnDuration: number; // seconds, default 60
  };
  players: PlayerState[];
  events: GameEvent[];
  you: string | null;
}
