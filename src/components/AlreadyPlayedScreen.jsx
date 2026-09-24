import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// el dia de juego resetea a las 8am hora Argentina (UTC-3, sin horario de
// verano) = 11:00 UTC. mismo criterio que api/_lib/ip.js y game/dailySeed.js.
const RESET_UTC_HOUR = 11;

function msUntilNextReset() {
  const now = new Date();
  let next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), RESET_UTC_HOUR);
  if (next <= now.getTime()) next += 24 * 60 * 60 * 1000;
  return next - now.getTime();
}

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function AlreadyPlayedScreen({ onGoToLeaderboard }) {
  const [remaining, setRemaining] = useState(msUntilNextReset());

  useEffect(() => {
    const id = setInterval(() => setRemaining(msUntilNextReset()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      className="mx-auto flex max-w-md flex-col items-center gap-5 text-center"
    >
      <motion.span
        className="text-7xl"
        animate={{ rotate: [0, -6, 0, 6, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        🕵️
      </motion.span>

      <h2 className="text-3xl font-black">Case closed, detective.</h2>
      <p className="opacity-70">
        "There's no need to jump to conclusions — the truth already came out today." Your score's locked in on the
        leaderboard. Come back after the next reset for another case.
      </p>

      <div className="rounded-2xl bg-panel px-6 py-4">
        <p className="text-xs uppercase tracking-widest opacity-50">Next run in</p>
        <p className="font-mono text-3xl font-black text-violet-400">{formatCountdown(remaining)}</p>
      </div>

      <button onClick={onGoToLeaderboard} className="rounded-full bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-500">
        View leaderboard
      </button>
    </motion.div>
  );
}
