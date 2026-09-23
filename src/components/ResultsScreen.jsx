import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CATEGORIES, ROUNDS_PER_CATEGORY } from "../game/categories";
import { submitScore, AlreadyPlayedTodayError } from "../services/leaderboardService";
import { playFinale } from "../game/sounds";

const MAX_SCORE = CATEGORIES.length * ROUNDS_PER_CATEGORY;
const AUTO_REDIRECT_MS = 3500;

export default function ResultsScreen({ score, user, onSaved, onGoToLeaderboard }) {
  const [saveState, setSaveState] = useState(user ? "saving" : "no-account");
  const alreadySubmitted = useRef(false);

  useEffect(() => {
    playFinale();
  }, []);

  useEffect(() => {
    if (!user || alreadySubmitted.current) return;
    alreadySubmitted.current = true;
    submitScore(user, score)
      .then(() => {
        setSaveState("saved");
        onSaved?.();
      })
      .catch((err) => {
        if (err instanceof AlreadyPlayedTodayError) {
          setSaveState("already-played");
          onSaved?.();
        } else {
          console.error("couldn't save score:", err);
          setSaveState("error");
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, score]);

  // apenas termina de guardar (o falla), directo al leaderboard. no hay
  // "jugar de nuevo": es un intento por dia, no tiene sentido ofrecerlo.
  useEffect(() => {
    if (saveState === "saving") return;
    const timer = setTimeout(onGoToLeaderboard, AUTO_REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [saveState, onGoToLeaderboard]);

  const pct = Math.round((score / MAX_SCORE) * 100);
  const emoji = pct >= 80 ? "🔥" : pct >= 50 ? "🙂" : "💀";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      className="mx-auto flex max-w-md flex-col items-center gap-5 text-center"
    >
      <motion.p
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 14 }}
        className="text-7xl"
      >
        {emoji}
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-3xl font-bold"
      >
        Thanks for playing AnimeLess!
      </motion.h2>
      <p className="text-xl font-semibold opacity-90">
        You scored {score}/{MAX_SCORE}
      </p>

      {user ? (
        <p className="text-sm opacity-70">
          {saveState === "saving" && "Saving score..."}
          {saveState === "saved" && "Score saved to today's leaderboard ✅"}
          {saveState === "already-played" && "You already played today — this run doesn't count, come back tomorrow!"}
          {saveState === "error" && "Couldn't save your score, but thanks for playing anyway 🙂"}
        </p>
      ) : (
        <p className="text-sm opacity-70">Sign in with Google next time so your score counts on the leaderboard.</p>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <button onClick={onGoToLeaderboard} className="rounded-full bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-500">
          View leaderboard →
        </button>
      </motion.div>
    </motion.div>
  );
}
