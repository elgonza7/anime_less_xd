import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CompareCard, { CARD_SIZE_CLASSES } from "./CompareCard";
import ProgressDots from "./ProgressDots";
import CategoryStepper from "./CategoryStepper";
import { ROUNDS_PER_CATEGORY } from "../game/categories";
import { playCorrect, playWrong, playCategoryComplete } from "../game/sounds";

const REVEAL_DELAY_MS = 2400;
const RECAP_DELAY_MS = 2800;

export default function GameScreen({ game, onFinished }) {
  const { category, phase } = game;

  useEffect(() => {
    if (phase === "finished") onFinished(game.totalScore, game.totalTimeMs);
  }, [phase, game.totalScore, game.totalTimeMs, onFinished]);

  // arranca la categoria sola, sin boton
  useEffect(() => {
    if (phase === "intro") game.startCategoryRounds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, category.id]);

  // suena y avanza solo despues de mostrar quien gano
  useEffect(() => {
    if (phase !== "revealed" || !game.round || !game.lastPick) return;
    const otherSide = game.lastPick === "left" ? "right" : "left";
    const won = game.round[game.lastPick].value >= game.round[otherSide].value;
    (won ? playCorrect : playWrong)();

    const timer = setTimeout(game.advanceRound, REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // recap de la categoria -> suena y sigue solo a la siguiente
  useEffect(() => {
    if (phase !== "category-recap") return;
    playCategoryComplete();
    const timer = setTimeout(game.continueAfterRecap, RECAP_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === "error") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
        <p className="text-xl font-semibold">😵 {game.errorMessage}</p>
        <div className="flex gap-3">
          <button onClick={game.retryRound} className="rounded-full bg-violet-600 px-6 py-3 text-lg font-bold text-white hover:bg-violet-500">
            Retry
          </button>
          <button onClick={game.skipCategory} className="rounded-full bg-panel px-6 py-3 text-lg font-bold hover:bg-panel-border">
            Skip this category
          </button>
        </div>
      </div>
    );
  }

  if (phase === "category-recap") {
    return (
      <motion.div
        key="recap"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto flex max-w-md flex-col items-center gap-4 text-center"
      >
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
          className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-500 text-6xl text-white"
        >
          ✓
        </motion.span>
        <p className="text-base font-bold uppercase tracking-widest text-violet-400">{category.label}</p>
        <p className="text-7xl font-black">
          {game.categoryScore}
          <span className="text-4xl opacity-50">/{ROUNDS_PER_CATEGORY}</span>
        </p>
      </motion.div>
    );
  }

  const revealed = phase === "revealed";
  const showFullSpinner = !game.round;

  // mientras se busca el desafiante nuevo, el de la izquierda no desaparece:
  // si veniamos de una ronda anterior, el que ERA de la derecha (ya conocido)
  // ya se muestra de una en la posicion izquierda -- eso es lo que dispara el
  // slide, sin esperar a que termine de cargar el nuevo de la derecha.
  const leftEntry = game.round ? (phase === "loading" ? game.round.right : game.round.left) : null;
  const rightEntry = game.round && phase !== "loading" ? game.round.right : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-4">
      <CategoryStepper currentIndex={game.categoryIndex} />

      <AnimatePresence mode="wait">
        <motion.div
          key={category.id}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {game.skipNotice && (
            <p className="mb-3 rounded-full bg-amber-500/10 px-4 py-1.5 text-sm text-amber-400">{game.skipNotice}</p>
          )}
          <h2 className="text-2xl font-black sm:text-3xl">{category.question}</h2>
          <p className="mt-1 text-base font-semibold opacity-70">
            Round {game.roundNumber} of {ROUNDS_PER_CATEGORY}
          </p>
          <p className="text-xs opacity-50">Total score: {game.totalScore}</p>
        </motion.div>
      </AnimatePresence>

      <ProgressDots total={ROUNDS_PER_CATEGORY} current={game.roundNumber - (revealed ? 0 : 1)} />

      {showFullSpinner ? (
        <div className={`flex items-center justify-center ${CARD_SIZE_CLASSES}`}>
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="text-5xl"
          >
            {category.icon}
          </motion.span>
        </div>
      ) : (
        <div className="flex w-full flex-col items-center gap-3 md:flex-row md:justify-center md:gap-6">
          <CompareCard
            key={leftEntry.itemKey}
            side="left"
            layout
            {...leftEntry}
            revealed={revealed}
            disabled={revealed || !rightEntry}
            alwaysShowStat={game.roundNumber > 1}
            isWinner={revealed && rightEntry && leftEntry.value >= rightEntry.value}
            onClick={game.choose}
          />
          <span className="rounded-full bg-panel px-5 py-2.5 text-base font-black shadow">OR</span>
          {rightEntry ? (
            <CompareCard
              key={rightEntry.itemKey}
              side="right"
              layout
              {...rightEntry}
              revealed={revealed}
              disabled={revealed}
              isWinner={revealed && leftEntry.value <= rightEntry.value}
              onClick={game.choose}
            />
          ) : (
            <div className={`flex items-center justify-center rounded-3xl border-2 border-panel-border bg-panel ${CARD_SIZE_CLASSES}`}>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="text-5xl opacity-50"
              >
                {category.icon}
              </motion.span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
