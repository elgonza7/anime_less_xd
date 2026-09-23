import { useEffect, useRef, useState } from "react";
import { CATEGORIES, ROUNDS_PER_CATEGORY } from "../game/categories";
import { submitScore } from "../services/leaderboardService";

const MAX_SCORE = CATEGORIES.length * ROUNDS_PER_CATEGORY;

export default function ResultsScreen({ score, user, onPlayAgain, onGoToLeaderboard }) {
  const [saved, setSaved] = useState(false);
  const alreadySubmitted = useRef(false);

  useEffect(() => {
    if (!user || alreadySubmitted.current) return;
    alreadySubmitted.current = true;
    submitScore(user, score)
      .then(() => setSaved(true))
      .catch((err) => console.error("couldn't save score:", err));
  }, [user, score]);

  const pct = Math.round((score / MAX_SCORE) * 100);
  const emoji = pct >= 80 ? "🔥" : pct >= 50 ? "🙂" : "💀";

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
      <p className="text-6xl">{emoji}</p>
      <h2 className="text-3xl font-bold">
        You scored {score}/{MAX_SCORE}
      </h2>

      {user ? (
        <p className="text-sm opacity-70">{saved ? "Score saved to your account ✅" : "Saving score..."}</p>
      ) : (
        <p className="text-sm opacity-70">Sign in with Google so this score counts on the leaderboard.</p>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={onPlayAgain} className="rounded-full bg-violet-600 px-5 py-2 font-bold text-white hover:bg-violet-500">
          Play again
        </button>
        <button onClick={onGoToLeaderboard} className="rounded-full bg-panel px-5 py-2 font-bold hover:bg-panel-border">
          View leaderboard
        </button>
      </div>
    </div>
  );
}
