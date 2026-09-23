import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CATEGORIES, ROUNDS_PER_CATEGORY } from "../game/categories";
import { submitScore, AlreadyPlayedTodayError } from "../services/leaderboardService";
import { playFinale } from "../game/sounds";

const MAX_SCORE = CATEGORIES.length * ROUNDS_PER_CATEGORY;

export default function ResultsScreen({ score, user, onSaved, onPlayAgain, onGoToLeaderboard }) {
  const [saveState, setSaveState] = useState("saving"); // saving | saved | already-played | error
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
        You scored {score}/{MAX_SCORE}
      </motion.h2>

      {user ? (
        <p className="text-sm opacity-70">
          {saveState === "saving" && "Saving score..."}
          {saveState === "saved" && "Score saved to your account ✅"}
          {saveState === "already-played" && "You already played today — come back tomorrow for another try!"}
          {saveState === "error" && "Couldn't save your score, but the game still counts for fun 🙂"}
        </p>
      ) : (
        <p className="text-sm opacity-70">Sign in with Google so this score counts on the leaderboard.</p>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-wrap justify-center gap-3"
      >
        <button onClick={onPlayAgain} className="rounded-full bg-violet-600 px-5 py-2 font-bold text-white hover:bg-violet-500">
          Play again
        </button>
        <button onClick={onGoToLeaderboard} className="rounded-full bg-panel px-5 py-2 font-bold hover:bg-panel-border">
          View leaderboard
        </button>
      </motion.div>
    </motion.div>
  );
}
