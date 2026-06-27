// Pure game logic for RaceDeck. No DB access here — operates on plain objects.

export type CardType = "advance" | "block" | "mystery";

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
    label: "+4 ADVANCE",
    color: "#3BE3A0",
    desc: "Gallop 4 squares forward.",
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
};

// Weighted deck composition for drawing.
const DRAW_WEIGHTS: { type: CardType; weight: number }[] = [
  { type: "advance", weight: 5 },
  { type: "block", weight: 3 },
  { type: "mystery", weight: 3 },
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
// Turtle slows you to 0 progress for the base move (you "plod").
export function baseStepFor(opts: {
  baseStep: number;
  turtleTurns: number;
}): number {
  if (opts.turtleTurns > 0) return 0; // turtled = no forward base move this turn
  return opts.baseStep;
}

export const TURTLE_DURATION = 2; // turns the target stays turtled
