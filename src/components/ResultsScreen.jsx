import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CATEGORIES, ROUNDS_PER_CATEGORY } from "../game/categories";
import {
  submitScore,
  markPlayedAnonymously,
  getTopScores,
  getUserRank,
  AlreadyPlayedTodayError,
} from "../services/leaderboardService";
import { playFinale } from "../game/sounds";
import RankReveal from "./RankReveal";

const MAX_SCORE = CATEGORIES.length * ROUNDS_PER_CATEGORY;

export default function ResultsScreen({ score, user, onSaved, onGoToLeaderboard }) {
  const [saveState, setSaveState] = useState(user ? "saving" : "no-account");
  const [errorDetail, setErrorDetail] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null); // { top, myRank } | null
  const alreadySubmitted = useRef(false);

  useEffect(() => {
    playFinale();
  }, []);

  useEffect(() => {
    if (alreadySubmitted.current) return;
    alreadySubmitted.current = true;

    if (!user) {
      markPlayedAnonymously();
      return;
    }

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
          setErrorDetail(err.message);
          setSaveState("error");
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, score]);

  // apenas se sabe que el puntaje de hoy quedo guardado (esta corrida o una
  // anterior), traemos el leaderboard para mostrarlo aca mismo -- ya no hay
  // que ir a otra pantalla a verlo.
  useEffect(() => {
    if (!user || saveState === "saving") return;
    let alive = true;
    Promise.all([getTopScores(5), getUserRank(user.uid)]).then(([top, myRank]) => {
      if (alive && myRank) setLeaderboard({ top, myRank });
    });
    return () => {
      alive = false;
    };
  }, [user, saveState]);

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
      ) : null}

      {saveState === "error" && errorDetail && (
        <p className="max-w-xs text-xs text-red-400/80">{errorDetail}</p>
      )}

      {!user && (
        <p className="text-sm opacity-70">Sign in with Google next time so your score counts on the leaderboard.</p>
      )}

      {user && leaderboard ? (
        <RankReveal myRank={leaderboard.myRank} top={leaderboard.top} myUid={user.uid} />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <button
            onClick={onGoToLeaderboard}
            className="rounded-full bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-500"
          >
            View leaderboard →
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
