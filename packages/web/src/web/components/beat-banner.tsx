import { AnimatePresence, motion } from "motion/react";
import { Zap, Ban, Shield, Sparkles, Flag, ArrowRight } from "lucide-react";
import type { Beat } from "../lib/use-race-rhythm";
import type { PlayerState } from "../lib/game";
import { colorHex } from "../lib/game";

const STYLE: Record<
  string,
  { label: string; icon: any; color: string; bg: string }
> = {
  turn: { label: "ON THE GATE", icon: ArrowRight, color: "#34D3F5", bg: "rgba(52,211,245,0.14)" },
  advance: { label: "+4 ADVANCE", icon: Zap, color: "#3BE3A0", bg: "rgba(59,227,160,0.16)" },
  move: { label: "TROTS FORWARD", icon: ArrowRight, color: "#8a99ae", bg: "rgba(138,153,174,0.14)" },
  block: { label: "BLOCKED", icon: Ban, color: "#FB5E7E", bg: "rgba(251,94,126,0.16)" },
  turtle: { label: "TURTLED", icon: Shield, color: "#3BE3A0", bg: "rgba(59,227,160,0.16)" },
  steal: { label: "CARD STOLEN", icon: Sparkles, color: "#8B5CF6", bg: "rgba(139,92,246,0.18)" },
  win: { label: "FINISH!", icon: Flag, color: "#F5C451", bg: "rgba(245,196,81,0.18)" },
  start: { label: "AND THEY'RE OFF", icon: Flag, color: "#F5C451", bg: "rgba(245,196,81,0.16)" },
};

export function BeatBanner({
  beat,
  players,
}: {
  beat: Beat | null;
  players: PlayerState[];
}) {
  const s = beat ? STYLE[beat.kind] ?? STYLE.move : null;
  const actor = beat ? players.find((p) => p.id === beat.actorId) : undefined;
  const accent = actor ? colorHex(actor.horseColor) : s?.color ?? "#3BE3A0";
  const Icon = s?.icon ?? ArrowRight;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[14%] z-40 flex justify-center px-4">
      <AnimatePresence mode="wait">
        {beat && s && (
          <motion.div
            key={beat.event.id}
            initial={{ opacity: 0, y: -14, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 360, damping: 24 }}
            className="flex max-w-[92vw] items-center gap-3 rounded-2xl border px-5 py-3 backdrop-blur-md"
            style={{
              background: s.bg,
              borderColor: `${s.color}55`,
              boxShadow: `0 8px 40px ${s.color}33, inset 0 0 0 1px rgba(255,255,255,0.04)`,
            }}
          >
            <motion.span
              initial={{ rotate: -12, scale: 0.6 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 16 }}
              className="grid h-9 w-9 place-items-center rounded-xl"
              style={{ background: `${s.color}22`, color: s.color }}
            >
              <Icon size={18} />
            </motion.span>
            <div className="min-w-0">
              <p
                className="font-pixel text-[10px] tracking-widest"
                style={{ color: s.color }}
              >
                {s.label}
              </p>
              <p className="truncate text-sm font-semibold text-ink" style={{ maxWidth: "64vw" }}>
                {stripEmoji(beat.event.message)}
              </p>
            </div>
            {actor && (
              <span
                className="ml-1 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function stripEmoji(s: string): string {
  return s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
}
