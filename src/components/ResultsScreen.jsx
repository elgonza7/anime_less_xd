import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CATEGORIES, ROUNDS_PER_CATEGORY } from "../game/categories";
import {
  submitScore,
  markPlayedAnonymously,
  getTopScores,
  getUserRank,
  getHypotheticalRank,
  AlreadyPlayedTodayError,
} from "../services/leaderboardService";
import { signInWithGoogle } from "../services/authService";
import { playFinale } from "../game/sounds";
import { markLastResultSaved } from "../game/dailyResult";
import RankReveal from "./RankReveal";

const MAX_SCORE = CATEGORIES.length * ROUNDS_PER_CATEGORY;

export default function ResultsScreen({ score, totalTimeMs, user, onSaved, onGoToLeaderboard }) {
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

    submitScore(user, score, totalTimeMs)
      .then(() => {
        markLastResultSaved();
        setSaveState("saved");
        onSaved?.();
      })
      .catch((err) => {
        if (err instanceof AlreadyPlayedTodayError) {
          markLastResultSaved(); // ya hay un puntaje de hoy guardado (esta cuenta u otra corrida), no hay nada pendiente
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

  const retrySave = () => {
    setSaveState("saving");
    setErrorDetail(null);
    submitScore(user, score, totalTimeMs)
      .then(() => {
        markLastResultSaved();
        setSaveState("saved");
        onSaved?.();
      })
      .catch((err) => {
        if (err instanceof AlreadyPlayedTodayError) {
          markLastResultSaved();
          setSaveState("already-played");
          onSaved?.();
        } else {
          console.error("couldn't save score (retry):", err);
          setErrorDetail(err.message);
          setSaveState("error");
        }
      });
  };

  // apenas se sabe que el puntaje de hoy quedo guardado (esta corrida o una
  // anterior), traemos el leaderboard para mostrarlo aca mismo -- ya no hay
  // que ir a otra pantalla a verlo. si todavia no te logueaste, igual
  // mostramos el top con una fila fantasma ("You'd be here"): el leaderboard
  // es publico, no hace falta cuenta para verlo.
  useEffect(() => {
    if (saveState === "saving") return;
    let alive = true;
    if (user) {
      Promise.all([getTopScores(5), getUserRank(user.uid)]).then(([top, myRank]) => {
        if (alive && myRank) setLeaderboard({ top, myRank });
      });
    } else {
      Promise.all([getTopScores(5), getHypotheticalRank(score, totalTimeMs)]).then(([top, myRank]) => {
        if (alive) setLeaderboard({ top, myRank });
      });
    }
    return () => {
      alive = false;
    };
  }, [user, saveState, score, totalTimeMs]);

  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState(null);

  const handleSignInAndSave = async () => {
    setSigningIn(true);
    setSignInError(null);
    try {
      const loggedInUser = await signInWithGoogle();
      if (!loggedInUser) return; // cayo al fallback de redirect, la pagina se recarga sola
      setSaveState("saving");
      await submitScore(loggedInUser, score, totalTimeMs);
      markLastResultSaved();
      setSaveState("saved");
      onSaved?.();
    } catch (err) {
      if (err instanceof AlreadyPlayedTodayError) {
        markLastResultSaved();
        setSaveState("already-played");
        onSaved?.();
      } else {
        console.error("couldn't sign in / save score:", err);
        setSignInError(err.message || "Something went wrong, try again.");
        setSaveState("no-account");
      }
    } finally {
      setSigningIn(false);
    }
  };

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

      {saveState === "error" && (
        <div className="flex flex-col items-center gap-2">
          {errorDetail && <p className="max-w-xs text-xs text-red-400/80">{errorDetail}</p>}
          <button onClick={retrySave} className="rounded-full bg-panel px-5 py-2 text-sm font-bold hover:bg-panel-border">
            Retry saving score
          </button>
        </div>
      )}

      {leaderboard ? (
        <RankReveal myRank={leaderboard.myRank} top={leaderboard.top} myUid={user?.uid} />
      ) : (
        <p className="text-sm opacity-60">Loading leaderboard...</p>
      )}

      {!user && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center gap-2"
        >
          <button
            onClick={handleSignInAndSave}
            disabled={signingIn || saveState === "saved" || saveState === "already-played"}
            className="flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-black shadow disabled:opacity-50"
          >
            {signingIn ? "Signing in..." : "Sign in with Google to save your spot"}
          </button>
          {saveState === "saved" && <p className="text-sm text-emerald-400">Saved! You're on today's leaderboard ✅</p>}
          {saveState === "already-played" && (
            <p className="text-sm opacity-70">You already have a score saved for today.</p>
          )}
          {signInError && <p className="max-w-xs text-xs text-red-400/80">{signInError}</p>}
          <p className="max-w-xs text-xs opacity-50">
            We only use your Google sign-in to check you're a real player and lock in your spot — never to read your
            data or spam you.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
