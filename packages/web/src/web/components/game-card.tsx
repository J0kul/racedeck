import { motion } from "motion/react";
import { CARD_META, type CardType } from "../lib/game";
import { Zap, Ban, Sparkles } from "lucide-react";

function Icon({ type }: { type: CardType }) {
  if (type === "advance") return <Zap size={26} strokeWidth={2.5} />;
  if (type === "block") return <Ban size={26} strokeWidth={2.5} />;
  return <Sparkles size={26} strokeWidth={2.5} />;
}

export function GameCard({
  type,
  selected,
  disabled,
  onClick,
  index = 0,
  total = 1,
}: {
  type: CardType;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  index?: number;
  total?: number;
}) {
  const meta = CARD_META[type];
  // fan layout: rotate cards based on position relative to center
  const mid = (total - 1) / 2;
  const rot = (index - mid) * 4;
  const lift = -Math.abs(index - mid) * 6;

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      initial={{ y: 80, opacity: 0, rotate: rot }}
      animate={{
        y: selected ? -42 + lift : lift,
        opacity: disabled ? 0.55 : 1,
        rotate: selected ? 0 : rot,
        scale: selected ? 1.06 : 1,
      }}
      whileHover={disabled ? {} : { y: -28 + lift, rotate: 0, scale: 1.05, zIndex: 50 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="card-shadow relative shrink-0 rounded-2xl"
      style={{
        width: 132,
        height: 188,
        marginLeft: index === 0 ? 0 : -22,
        cursor: disabled ? "not-allowed" : "pointer",
        zIndex: selected ? 60 : 10 + index,
        background: `linear-gradient(165deg, ${meta.color}22 0%, #0f141d 60%)`,
        border: `2px solid ${selected ? meta.color : "#26344a"}`,
        boxShadow: selected
          ? `0 0 0 3px ${meta.glow}, 0 10px 0 rgba(0,0,0,.55), 0 24px 40px -10px ${meta.glow}`
          : undefined,
      }}
    >
      {/* corner value */}
      <div className="absolute left-2 top-2 flex flex-col items-center leading-none">
        <span className="font-pixel text-[15px]" style={{ color: meta.color }}>
          {meta.short}
        </span>
      </div>
      <div className="absolute right-2 top-2.5" style={{ color: meta.color }}>
        <Icon type={type} />
      </div>

      {/* center emblem */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
        <div
          className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background: `${meta.color}1f`,
            border: `2px solid ${meta.color}55`,
            color: meta.color,
          }}
        >
          <div style={{ transform: "scale(1.5)" }}>
            <Icon type={type} />
          </div>
        </div>
        <div
          className="font-pixel text-[9px] leading-relaxed"
          style={{ color: meta.color }}
        >
          {meta.label}
        </div>
      </div>

      {/* bottom desc */}
      <div className="absolute inset-x-2 bottom-2 text-[9px] leading-snug text-ink-dim">
        {meta.desc}
      </div>
    </motion.button>
  );
}
