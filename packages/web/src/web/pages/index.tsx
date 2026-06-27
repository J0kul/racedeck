import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "motion/react";
import { setGuest, isGuest, getGuestName } from "../lib/guest";
import { HorseSprite } from "../components/horse-sprite";
import { Loader2 } from "lucide-react";

export default function IndexPage() {
  const [, navigate] = useLocation();
  const [name, setName] = useState(() => getGuestName() ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already have a guest identity, skip straight to lobby
  // (but don't auto-redirect — let them change their name first)

  function enter(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      setError("Pick a name — at least 2 characters.");
      return;
    }
    if (trimmed.length > 18) {
      setError("Keep it under 18 characters.");
      return;
    }
    setLoading(true);
    setGuest(trimmed);
    navigate("/lobby");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-900 px-4">
      {/* ambient glows */}
      <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-mint/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-violet/10 blur-3xl" />

      <div className="relative grid w-full max-w-5xl gap-10 md:grid-cols-2 md:items-center">
        {/* hero */}
        <div className="text-center md:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-bg-600 bg-bg-800 px-3 py-1 text-xs text-ink-dim"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-mint" /> Online multiplayer · 2–4 racers · No signup
          </motion.div>
          <h1 className="font-pixel text-3xl leading-relaxed text-ink md:text-4xl">
            RACE<span className="text-mint">DECK</span>
          </h1>
          <p className="mt-4 max-w-md text-ink-dim">
            A high-stakes horse race driven by cards. Play <span className="text-mint">+4</span>,{" "}
            <span className="text-rose">block</span> your rivals, unleash{" "}
            <span className="text-violet">mystery</span> turtles — and watch the clock.{" "}
            First horse to square 20 takes the purse.
          </p>
          <div className="mt-6 flex justify-center gap-3 md:justify-start">
            {["mint", "rose", "cyan", "gold"].map((c, i) => (
              <motion.div
                key={c}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className="animate-floaty"
                style={{ animationDelay: `${i * 0.3}s` }}
              >
                <HorseSprite color={c} size={48} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* entry panel */}
        <motion.form
          onSubmit={enter}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel mx-auto w-full max-w-sm p-6"
        >
          <h2 className="mb-1 font-pixel text-sm text-ink">WHO ARE YOU?</h2>
          <p className="mb-5 text-xs text-ink-dim">Pick a name. No account needed.</p>

          <input
            className="input mb-4 text-center text-lg font-semibold tracking-wide"
            placeholder="e.g. Thunderhoof"
            maxLength={18}
            value={name}
            autoFocus
            onChange={(e) => { setName(e.target.value); setError(""); }}
          />

          {error && <p className="mb-3 text-sm text-rose">{error}</p>}

          <button type="submit" disabled={loading} className="btn btn-mint w-full">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} /> Saddling up…
              </span>
            ) : (
              "Enter the paddock →"
            )}
          </button>
        </motion.form>
      </div>
    </div>
  );
}
