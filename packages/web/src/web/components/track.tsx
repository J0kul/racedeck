import { motion } from "motion/react";
import { colorHex, type PlayerState } from "../lib/game";
import { HorseSprite } from "./horse-sprite";
import { Flag } from "lucide-react";

export function Track({
  players,
  trackLength,
  currentPlayerId,
}: {
  players: PlayerState[];
  trackLength: number;
  currentPlayerId: string | null;
}) {
  const lanes = [...players].sort((a, b) => a.seat - b.seat);

  return (
    <div className="felt vignette relative overflow-hidden rounded-3xl border border-bg-600 p-5 pb-3">
      {/* finish flag */}
      <div className="pointer-events-none absolute right-4 top-3 z-20 flex items-center gap-1.5 text-gold">
        <Flag size={16} />
        <span className="font-pixel text-[9px]">FINISH</span>
      </div>

      <div className="relative flex flex-col gap-2.5">
        {lanes.map((p) => {
          const pct = Math.min(p.position / trackLength, 1) * 100;
          const active = p.id === currentPlayerId;
          return (
            <div key={p.id} className="relative">
              {/* lane label */}
              <div className="mb-1 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    background: colorHex(p.horseColor),
                    boxShadow: active ? `0 0 8px ${colorHex(p.horseColor)}` : undefined,
                  }}
                />
                <span
                  className="text-xs font-semibold"
                  style={{ color: active ? colorHex(p.horseColor) : "#8a99ae" }}
                >
                  {p.name}
                  {p.turtleTurns > 0 && <span className="ml-1 text-mint">🐢 slowed</span>}
                  {p.finished && <span className="ml-1 text-gold">🏆 #{p.finishRank}</span>}
                </span>
                <span className="ml-auto font-pixel text-[9px] text-ink-dim">
                  {p.position}/{trackLength}
                </span>
              </div>

              {/* lane track */}
              <div
                className="relative h-12 rounded-xl border border-white/5"
                style={{
                  background:
                    "repeating-linear-gradient(90deg, rgba(255,255,255,.04) 0 2px, transparent 2px calc(100%/20))",
                  backgroundSize: `calc(100%/${trackLength}) 100%`,
                }}
              >
                {/* progress glow */}
                <div
                  className="absolute inset-y-0 left-0 rounded-xl"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, transparent, ${colorHex(
                      p.horseColor
                    )}22)`,
                  }}
                />
                {/* finish line */}
                <div
                  className="absolute inset-y-0 right-0 w-2 rounded-r-xl opacity-70"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(45deg, #fff 0 4px, #000 4px 8px)",
                  }}
                />
                {/* horse */}
                <motion.div
                  className="absolute top-1/2 z-10"
                  animate={{ left: `calc(${pct}% - 26px)` }}
                  transition={{ type: "spring", stiffness: 120, damping: 18 }}
                  style={{ translateY: "-58%" }}
                >
                  <HorseSprite
                    color={p.horseColor}
                    turtled={p.turtleTurns > 0}
                    size={46}
                    running={active}
                  />
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
