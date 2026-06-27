import { useState, useEffect, useRef } from "react";
import type { GameEvent } from "../lib/game";
import { ScrollText, ChevronDown, ChevronUp } from "lucide-react";

const TYPE_COLOR: Record<string, string> = {
  advance:  "#3BE3A0",
  move:     "#8a99ae",
  block:    "#FB5E7E",
  turtle:   "#3BE3A0",
  steal:    "#8B5CF6",
  mystery:  "#8B5CF6",
  swap:     "#F5C451",
  shield:   "#34D3F5",
  sabotage: "#FF7043",
  nitro:    "#E040FB",
  tax:      "#FFB300",
  win:      "#F5C451",
  turn:     "#34D3F5",
  start:    "#F5C451",
  join:     "#8a99ae",
  draw:     "#8a99ae",
};

const PREVIEW_COUNT = 5;

export function EventLog({ events }: { events: GameEvent[] }) {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visible = expanded ? events : events.slice(-PREVIEW_COUNT);
  const hasMore = events.length > PREVIEW_COUNT;

  // Auto-scroll to bottom when new events arrive (expanded mode only)
  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [events.length, expanded]);

  return (
    <div className="panel flex flex-col overflow-hidden" style={{ maxHeight: 340 }}>
      {/* header */}
      <div className="flex items-center gap-2 border-b border-bg-600 px-4 py-3 shrink-0">
        <ScrollText size={16} className="text-mint" />
        <span className="text-sm font-bold">Race Feed</span>
        {events.length > 0 && (
          <span className="ml-auto text-xs text-ink-dim">{events.length} events</span>
        )}
      </div>

      {/* events */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-1.5 overflow-y-auto p-3 text-[13px]"
        style={{ minHeight: 0 }}
      >
        {events.length === 0 && (
          <p className="text-ink-dim">Waiting for the gates to open…</p>
        )}
        {visible.map((e) => (
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

      {/* see more / collapse */}
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center justify-center gap-1 border-t border-bg-600 py-2 text-xs text-ink-dim hover:text-ink transition-colors shrink-0"
        >
          {expanded ? (
            <><ChevronUp size={13} /> Show less</>
          ) : (
            <><ChevronDown size={13} /> See {events.length - PREVIEW_COUNT} more events</>
          )}
        </button>
      )}
    </div>
  );
}
