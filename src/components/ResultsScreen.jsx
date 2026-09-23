import { useEffect, useRef, useState } from "react";
import { ROUNDS_PER_CATEGORY } from "../game/categories";
import { submitScore } from "../services/leaderboardService";

export default function ResultsScreen({ score, user, onPlayAgain, onGoToMenu, onGoToLeaderboard }) {
  const [saved, setSaved] = useState(false);
  const alreadySubmitted = useRef(false);

  useEffect(() => {
    if (!user || alreadySubmitted.current) return;
    alreadySubmitted.current = true;
    submitScore(user, score)
      .then(() => setSaved(true))
      .catch((err) => console.error("no se pudo guardar el puntaje:", err));
  }, [user, score]);

  const pct = Math.round((score / ROUNDS_PER_CATEGORY) * 100);
  const emoji = pct >= 80 ? "🔥" : pct >= 50 ? "🙂" : "💀";

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
      <p className="text-6xl">{emoji}</p>
      <h2 className="text-2xl font-bold">
        Sacaste {score}/{ROUNDS_PER_CATEGORY}
      </h2>

      {user ? (
        <p className="text-sm opacity-70">{saved ? "Puntaje guardado en tu cuenta ✅" : "Guardando puntaje..."}</p>
      ) : (
        <p className="text-sm opacity-70">Iniciá sesión con Google para que este puntaje cuente en el ranking.</p>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={onPlayAgain} className="rounded-full bg-violet-600 px-5 py-2 font-bold hover:bg-violet-500">
          Jugar de nuevo
        </button>
        <button onClick={onGoToLeaderboard} className="rounded-full bg-panel px-5 py-2 font-bold hover:bg-panel-border">
          Ver ranking
        </button>
        <button onClick={onGoToMenu} className="rounded-full bg-panel px-5 py-2 font-bold hover:bg-panel-border">
          Elegir otra categoría
        </button>
      </div>
    </div>
  );
}
