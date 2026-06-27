import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const RADIUS = 18;
const CIRC = 2 * Math.PI * RADIUS;

export function TurnTimer({
  turnStartedAt,
  turnDuration,
  isMyTurn,
}: {
  turnStartedAt: number | null;
  turnDuration: number; // seconds
  isMyTurn: boolean;
}) {
  const [remaining, setRemaining] = useState(turnDuration);

  useEffect(() => {
    if (!turnStartedAt) return;
    function tick() {
      const elapsed = (Date.now() - turnStartedAt!) / 1000;
      const left = Math.max(0, turnDuration - elapsed);
      setRemaining(left);
    }
    tick();
    const iv = setInterval(tick, 200);
    return () => clearInterval(iv);
  }, [turnStartedAt, turnDuration]);

  const pct = remaining / turnDuration; // 1 → 0
  const urgent = remaining <= 10;
  const color = urgent
    ? "#FB5E7E"
    : remaining <= 20
    ? "#F5C451"
    : isMyTurn
    ? "#3BE3A0"
    : "#8a99ae";

  const dashOffset = CIRC * (1 - pct);

  return (
    <AnimatePresence>
      {turnStartedAt !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          className="relative flex items-center justify-center"
          title={`${Math.ceil(remaining)}s remaining`}
        >
          <svg width={44} height={44} className="-rotate-90">
            {/* track */}
            <circle
              cx={22}
              cy={22}
              r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={3.5}
            />
            {/* progress arc */}
            <motion.circle
              cx={22}
              cy={22}
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 0.2s linear, stroke 0.4s" }}
            />
          </svg>
          {/* number */}
          <motion.span
            key={Math.ceil(remaining)}
            initial={urgent ? { scale: 1.3 } : {}}
            animate={{ scale: 1 }}
            className="absolute font-pixel text-[11px]"
            style={{ color }}
          >
            {Math.ceil(remaining)}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
