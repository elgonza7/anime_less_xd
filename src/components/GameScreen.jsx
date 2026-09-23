import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CompareCard from "./CompareCard";
import ProgressDots from "./ProgressDots";
import CategoryIntro from "./CategoryIntro";
import { ROUNDS_PER_CATEGORY } from "../game/categories";

export default function GameScreen({ game, onFinished }) {
  const { category, phase } = game;

  useEffect(() => {
    if (phase === "finished") onFinished(game.totalScore);
  }, [phase, game.totalScore, onFinished]);

  if (phase === "intro") {
    return (
      <CategoryIntro
        category={category}
        index={game.categoryIndex}
        total={game.totalCategories}
        skipNotice={game.skipNotice}
        onStart={game.startCategoryRounds}
      />
    );
  }

  if (phase === "loading" || phase === "finished") {
    return <p className="text-center text-lg opacity-70">Loading round...</p>;
  }

  if (phase === "error") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
        <p className="text-lg font-semibold">😵 {game.errorMessage}</p>
        <div className="flex gap-3">
          <button onClick={game.retryRound} className="rounded-full bg-violet-600 px-5 py-2 font-bold text-white hover:bg-violet-500">
            Retry
          </button>
          <button onClick={game.skipCategory} className="rounded-full bg-panel px-5 py-2 font-bold hover:bg-panel-border">
            Skip this category
          </button>
        </div>
      </div>
    );
  }

  if (!game.round) return null;

  const revealed = phase === "revealed";

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-6">
      <div className="text-center">
        <p className="text-sm uppercase tracking-wide text-violet-400">
          {category.icon} {category.label} · Round {game.roundNumber}/{ROUNDS_PER_CATEGORY}
        </p>
        <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{category.question}</h2>
        <p className="mt-1 text-sm opacity-70">Total score: {game.totalScore}</p>
      </div>

      <ProgressDots total={ROUNDS_PER_CATEGORY} current={game.roundNumber - (revealed ? 0 : 1)} />

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
        <CompareCard
          side="left"
          {...game.round.left}
          revealed={revealed}
          disabled={revealed}
          isWinner={revealed && game.round.left.value >= game.round.right.value}
          onClick={game.choose}
        />
        <span className="rounded-full bg-panel px-4 py-2 text-sm font-black shadow">OR</span>
        <CompareCard
          side="right"
          {...game.round.right}
          revealed={revealed}
          disabled={revealed}
          isWinner={revealed && game.round.right.value >= game.round.left.value}
          onClick={game.choose}
        />
      </div>

      <AnimatePresence>
        {revealed && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={game.nextRound}
            className="rounded-full bg-violet-600 px-8 py-3 text-lg font-bold text-white hover:bg-violet-500"
          >
            {game.roundNumber >= ROUNDS_PER_CATEGORY ? "Next category →" : "Next →"}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
