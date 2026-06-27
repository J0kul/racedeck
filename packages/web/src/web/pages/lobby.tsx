import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "motion/react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getGuestId, getGuestName, clearGuest } from "../lib/guest";
import { HORSE_COLORS } from "../lib/game";
import { HorseSprite } from "../components/horse-sprite";
import { Loader2, LogOut, Plus, DoorOpen } from "lucide-react";

export default function LobbyPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const codeParam = params.get("code")?.toUpperCase() ?? "";

  const guestId = getGuestId();
  const guestName = getGuestName();

  // If no guest identity, kick back to landing
  useEffect(() => {
    if (!guestId || !guestName) navigate("/");
  }, [guestId, guestName]);

  const [tab, setTab] = useState<"create" | "join">(codeParam ? "join" : "create");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [color, setColor] = useState("mint");
  const [code, setCode] = useState(codeParam);
  const [error, setError] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const res = await api.games.$post({ json: { maxPlayers, horseColor: color } });
      if (!res.ok) throw new Error((await res.json() as any).message || "Failed");
      return res.json();
    },
    onSuccess: (d: any) => navigate(`/game/${d.gameId}`),
    onError: (e) => setError(e.message),
  });

  const join = useMutation({
    mutationFn: async () => {
      const res = await api.games.join.$post({ json: { code: code.trim().toUpperCase(), horseColor: color } });
      if (!res.ok) throw new Error((await res.json() as any).message || "Failed");
      return res.json();
    },
    onSuccess: (d: any) => navigate(`/game/${d.gameId}`),
    onError: (e) => setError(e.message),
  });

  function logout() {
    clearGuest();
    navigate("/");
  }

  if (!guestId || !guestName) return null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg-900 px-4 py-6">
      <div className="pointer-events-none absolute -right-40 top-0 h-96 w-96 rounded-full bg-mint/10 blur-3xl" />

      {/* top bar */}
      <header className="mx-auto mb-8 flex max-w-3xl items-center justify-between">
        <h1 className="font-pixel text-lg text-ink">
          RACE<span className="text-mint">DECK</span>
        </h1>
        <button onClick={logout} className="btn btn-ghost flex items-center gap-2 text-sm">
          <LogOut size={15} /> {guestName}
        </button>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel mx-auto max-w-lg p-6"
      >
        <div className="mb-6 flex rounded-xl bg-bg-700 p-1">
          {([
            { k: "create", label: "Create race", icon: Plus },
            { k: "join", label: "Join by code", icon: DoorOpen },
          ] as const).map(({ k, label, icon: Icon }) => (
            <button
              key={k}
              onClick={() => { setTab(k); setError(""); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition"
              style={{
                background: tab === k ? "var(--color-bg-600)" : "transparent",
                color: tab === k ? "#e8eef6" : "#8a99ae",
              }}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* color picker */}
        <label className="mb-2 block text-sm font-semibold text-ink-dim">Pick your horse</label>
        <div className="mb-6 grid grid-cols-4 gap-2">
          {HORSE_COLORS.map((c) => (
            <button
              key={c.key}
              onClick={() => setColor(c.key)}
              className="panel flex flex-col items-center gap-1 py-3 transition"
              style={{
                borderColor: color === c.key ? c.hex : undefined,
                boxShadow: color === c.key ? `0 0 0 2px ${c.hex}` : undefined,
              }}
            >
              <HorseSprite color={c.key} size={40} />
              <span className="text-[11px]" style={{ color: color === c.key ? c.hex : "#8a99ae" }}>
                {c.name}
              </span>
            </button>
          ))}
        </div>

        {tab === "create" ? (
          <>
            <label className="mb-2 block text-sm font-semibold text-ink-dim">Max racers</label>
            <div className="mb-6 grid grid-cols-3 gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setMaxPlayers(n)}
                  className="btn"
                  style={{
                    background: maxPlayers === n ? "var(--color-bg-600)" : "var(--color-bg-700)",
                    border: `1px solid ${maxPlayers === n ? "var(--color-mint)" : "var(--color-bg-600)"}`,
                    color: maxPlayers === n ? "var(--color-mint)" : "#8a99ae",
                    boxShadow: "0 4px 0 rgba(0,0,0,.4)",
                  }}
                >
                  {n} players
                </button>
              ))}
            </div>
            {error && <p className="mb-3 text-sm text-rose">{error}</p>}
            <button onClick={() => create.mutate()} disabled={create.isPending} className="btn btn-mint w-full">
              {create.isPending ? <Loader2 className="mx-auto animate-spin" size={18} /> : "Open the paddock"}
            </button>
          </>
        ) : (
          <>
            <label className="mb-2 block text-sm font-semibold text-ink-dim">Enter the race code</label>
            <input
              className="input mb-2 text-center font-pixel text-2xl tracking-[0.35em] uppercase"
              placeholder="ABCD"
              maxLength={4}
              value={code}
              autoFocus={!!codeParam}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
            />
            <p className="mb-5 text-center text-xs text-ink-dim">
              Got a code from a friend? Type it above and saddle up.
            </p>
            {error && <p className="mb-3 text-sm text-rose">{error}</p>}
            <button
              onClick={() => join.mutate()}
              disabled={join.isPending || code.trim().length < 4}
              className="btn btn-gold w-full"
            >
              {join.isPending ? <Loader2 className="mx-auto animate-spin" size={18} /> : "Join the race →"}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
