export type CardType = "advance" | "block" | "mystery" | "swap" | "shield" | "sabotage" | "nitro" | "tax";
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

export function spriteHue(key: string): number {
  switch (key) {
    case "mint": return 0;
    case "rose": return 200;
    case "cyan": return 40;
    case "gold": return -110;
    default: return 0;
  }
}

export const CARD_META: Record<
  CardType,
  { label: string; short: string; color: string; glow: string; desc: string; needsTarget: boolean }
> = {
  advance: {
    label: "ADVANCE",
    short: "+2",
    color: "#3BE3A0",
    glow: "rgba(59,227,160,0.55)",
    desc: "Gallop 2 squares forward instantly.",
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
  swap: {
    label: "SWAP",
    short: "⇄",
    color: "#F5C451",
    glow: "rgba(245,196,81,0.55)",
    desc: "Swap track positions with any rival.",
    needsTarget: true,
  },
  shield: {
    label: "SHIELD",
    short: "🛡",
    color: "#34D3F5",
    glow: "rgba(52,211,245,0.55)",
    desc: "Block the next card played against you.",
    needsTarget: false,
  },
  sabotage: {
    label: "SABOTAGE",
    short: "-3",
    color: "#FF7043",
    glow: "rgba(255,112,67,0.55)",
    desc: "Knock a rival back 3 squares.",
    needsTarget: true,
  },
  nitro: {
    label: "NITRO",
    short: "⚡",
    color: "#E040FB",
    glow: "rgba(224,64,251,0.55)",
    desc: "Your base step is doubled this turn.",
    needsTarget: false,
  },
  tax: {
    label: "TAX",
    short: "💸",
    color: "#FFB300",
    glow: "rgba(255,179,0,0.55)",
    desc: "All rivals discard one card from hand.",
    needsTarget: false,
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
  shieldActive: boolean;
  nitroActive: boolean;
  cardsPlayedThisTurn: number;
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
    turnDuration: number;
  };
  players: PlayerState[];
  events: GameEvent[];
  you: string | null;
}
