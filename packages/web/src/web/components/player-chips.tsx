import { colorHex, type PlayerState } from "../lib/game";
import { HorseSprite } from "./horse-sprite";
import { Layers } from "lucide-react";

export function PlayerChips({
  players,
  currentPlayerId,
  selectableIds,
  onSelect,
  targetingLabel,
}: {
  players: PlayerState[];
  currentPlayerId: string | null;
  selectableIds?: Set<string>;
  onSelect?: (id: string) => void;
  targetingLabel?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {players.map((p) => {
        const active = p.id === currentPlayerId;
        const selectable = selectableIds?.has(p.id);
        return (
          <button
            key={p.id}
            type="button"
            disabled={!selectable}
            onClick={() => selectable && onSelect?.(p.id)}
            className="panel flex items-center gap-2.5 px-3 py-2 text-left transition"
            style={{
              borderColor: active ? colorHex(p.horseColor) : undefined,
              boxShadow: active
                ? `0 0 0 2px ${colorHex(p.horseColor)}, 0 12px 24px -12px ${colorHex(
                    p.horseColor
                  )}`
                : undefined,
              cursor: selectable ? "pointer" : "default",
              outline: selectable ? `2px dashed ${colorHex(p.horseColor)}` : "none",
              outlineOffset: 2,
              opacity: selectableIds && !selectable && !p.isSelf ? 0.6 : 1,
            }}
          >
            <div className="h-9 w-9 overflow-hidden">
              <HorseSprite color={p.horseColor} turtled={p.turtleTurns > 0} size={34} />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5 text-sm font-bold">
                <span style={{ color: active ? colorHex(p.horseColor) : "#e8eef6" }}>
                  {p.name}
                </span>
                {p.isSelf && <span className="text-[10px] text-mint">YOU</span>}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-ink-dim">
                <span className="inline-flex items-center gap-1">
                  <Layers size={11} /> {p.cardCount}
                </span>
                <span>· sq {p.position}</span>
                {p.skipNextTurn && <span className="text-rose">blocked</span>}
                {p.turtleTurns > 0 && <span className="text-mint">🐢{p.turtleTurns}</span>}
              </div>
            </div>
            {selectable && targetingLabel && (
              <span className="ml-1 font-pixel text-[8px] text-gold">{targetingLabel}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
