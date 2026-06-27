import { useEffect, useRef } from "react";
import type { GameEvent } from "../lib/game";
import { ScrollText } from "lucide-react";

const TYPE_COLOR: Record<string, string> = {
  advance: "#3BE3A0",
  move: "#8a99ae",
  block: "#FB5E7E",
  turtle: "#3BE3A0",
  steal: "#8B5CF6",
  win: "#F5C451",
  turn: "#34D3F5",
  start: "#F5C451",
  join: "#8a99ae",
  draw: "#8a99ae",
};

export function EventLog({ events }: { events: GameEvent[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [events.length]);

  return (
    <div className="panel flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-bg-600 px-4 py-3">
        <ScrollText size={16} className="text-mint" />
        <span className="text-sm font-bold">Race Feed</span>
      </div>
      <div ref={ref} className="flex-1 space-y-1.5 overflow-y-auto p-3 text-[13px]">
        {events.length === 0 && (
          <p className="text-ink-dim">Waiting for the gates to open…</p>
        )}
        {events.map((e) => (
          <div
            key={e.id}
            className="rounded-lg px-2.5 py-1.5"
            style={{
              background: "rgba(255,255,255,0.02)",
              borderLeft: `3px solid ${TYPE_COLOR[e.type] ?? "#26344a"}`,
            }}
          >
            <span style={{ color: TYPE_COLOR[e.type] ?? "#e8eef6" }}>{e.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
