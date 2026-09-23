import { useEffect } from "react";
import CompareCard from "./CompareCard";
import ProgressDots from "./ProgressDots";
import { CATEGORIES, ROUNDS_PER_CATEGORY } from "../game/categories";

export default function GameScreen({ game, onFinished, onExit }) {
  const category = CATEGORIES.find((c) => c.id === game.categoryId);

  useEffect(() => {
    if (game.status === "finished") onFinished(game.score);
  }, [game.status, game.score, onFinished]);

  if (game.status === "error") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
        <p className="text-lg font-semibold">😵 {game.errorMessage}</p>
        <div className="flex gap-3">
          <button onClick={game.retryRound} className="rounded-full bg-violet-600 px-5 py-2 font-bold hover:bg-violet-500">
            Reintentar
          </button>
          <button onClick={onExit} className="rounded-full bg-panel px-5 py-2 font-bold hover:bg-panel-border">
            Volver al menú
          </button>
        </div>
      </div>
    );
  }

  if (!game.round) {
    return <p className="text-center text-lg opacity-70">Cargando ronda...</p>;
  }

  const revealed = game.status === "revealed";

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
      <div className="text-center">
        <p className="text-sm uppercase tracking-wide text-violet-400">
          {category?.icon} {category?.label} · Ronda {game.roundNumber}/{ROUNDS_PER_CATEGORY}
        </p>
        <h2 className="mt-1 text-xl font-bold sm:text-2xl">{category?.question}</h2>
        <p className="mt-1 text-sm opacity-70">Puntos: {game.score}</p>
      </div>

      <ProgressDots total={ROUNDS_PER_CATEGORY} current={game.roundNumber - (revealed ? 0 : 1)} />

      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <CompareCard
          side="left"
          {...game.round.left}
          revealed={revealed}
          disabled={revealed}
          isWinner={revealed && game.round.left.value >= game.round.right.value}
          onClick={game.choose}
        />
        <span className="rounded-full bg-panel px-4 py-2 text-sm font-black">OR</span>
        <CompareCard
          side="right"
          {...game.round.right}
          revealed={revealed}
          disabled={revealed}
          isWinner={revealed && game.round.right.value >= game.round.left.value}
          onClick={game.choose}
        />
      </div>

      {revealed && (
        <button
          onClick={game.nextRound}
          className="rounded-full bg-violet-600 px-8 py-3 font-bold hover:bg-violet-500"
        >
          {game.roundNumber >= ROUNDS_PER_CATEGORY ? "Ver resultado" : "Siguiente →"}
        </button>
      )}

      <button onClick={onExit} className="text-sm opacity-60 hover:opacity-100">
        Salir al menú
      </button>
    </div>
  );
}
