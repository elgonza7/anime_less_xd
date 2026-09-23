import { useEffect, useState } from "react";
import { motion } from "framer-motion";

function msUntilNextUTCDay() {
  const now = new Date();
  const nextMidnightUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return nextMidnightUTC - now.getTime();
}

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function AlreadyPlayedScreen({ onGoToLeaderboard }) {
  const [remaining, setRemaining] = useState(msUntilNextUTCDay());

  useEffect(() => {
    const id = setInterval(() => setRemaining(msUntilNextUTCDay()), 1000);
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
        animate={{ x: [0, 14, 0, -14, 0] }}
        transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
      >
        🏃
      </motion.span>

      <h2 className="text-3xl font-black">You already played today!</h2>
      <p className="opacity-70">Your score for today is locked in on the leaderboard. Come back tomorrow for another run.</p>

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
