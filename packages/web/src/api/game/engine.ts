// Pure game logic for RaceDeck. No DB access here — operates on plain objects.

export type CardType =
  | "advance"
  | "block"
  | "mystery"
  | "swap"
  | "shield"
  | "sabotage"
  | "nitro"
  | "tax";

export interface Card {
  id: string;
  type: CardType;
}

export interface MysteryOutcome {
  kind: "turtle" | "steal";
}

export const HORSE_COLORS = [
  { key: "mint", hex: "#3BE3A0", name: "Emerald" },
  { key: "rose", hex: "#FB5E7E", name: "Crimson" },
  { key: "cyan", hex: "#34D3F5", name: "Azure" },
  { key: "gold", hex: "#F5C451", name: "Amber" },
] as const;

export const CARD_META: Record<
  CardType,
  { label: string; color: string; desc: string }
> = {
  advance: {
    label: "+2 ADVANCE",
    color: "#3BE3A0",
    desc: "Gallop 2 squares forward.",
  },
  block: {
    label: "BLOCK",
    color: "#FB5E7E",
    desc: "A rival skips their next turn.",
  },
  mystery: {
    label: "MYSTERY",
    color: "#8B5CF6",
    desc: "Turtle a rival, or steal a card.",
  },
  swap: {
    label: "SWAP",
    color: "#F5C451",
    desc: "Swap positions with any rival.",
  },
  shield: {
    label: "SHIELD",
    color: "#34D3F5",
    desc: "Block the next card played against you.",
  },
  sabotage: {
    label: "SABOTAGE",
    color: "#FF7043",
    desc: "Knock a rival back 3 squares.",
  },
  nitro: {
    label: "NITRO",
    color: "#E040FB",
    desc: "Your base step is doubled next move.",
  },
  tax: {
    label: "TAX",
    color: "#FFB300",
    desc: "All rivals discard one card from hand.",
  },
};

// Weighted deck composition for drawing.
const DRAW_WEIGHTS: { type: CardType; weight: number }[] = [
  { type: "advance", weight: 5 },
  { type: "block", weight: 3 },
  { type: "mystery", weight: 2 },
  { type: "swap", weight: 2 },
  { type: "shield", weight: 2 },
  { type: "sabotage", weight: 2 },
  { type: "nitro", weight: 2 },
  { type: "tax", weight: 1 },
];

let idCounter = 0;
export function newCardId() {
  idCounter += 1;
  return `c_${Date.now().toString(36)}_${idCounter}_${Math.floor(
    Math.random() * 1e6
  ).toString(36)}`;
}

export function drawCard(): Card {
  const total = DRAW_WEIGHTS.reduce((s, d) => s + d.weight, 0);
  let r = Math.random() * total;
  for (const d of DRAW_WEIGHTS) {
    r -= d.weight;
    if (r <= 0) return { id: newCardId(), type: d.type };
  }
  return { id: newCardId(), type: "advance" };
}

export function startingHand(): Card[] {
  return [drawCard(), drawCard(), drawCard()];
}

export function rollMystery(): MysteryOutcome {
  return Math.random() < 0.6 ? { kind: "turtle" } : { kind: "steal" };
}

// How many squares a horse advances on its base step this turn.
export function baseStepFor(opts: {
  baseStep: number;
  turtleTurns: number;
  nitroActive: boolean;
}): number {
  if (opts.turtleTurns > 0) return 0;
  return opts.nitroActive ? opts.baseStep * 2 : opts.baseStep;
}

export const TURTLE_DURATION = 2;
