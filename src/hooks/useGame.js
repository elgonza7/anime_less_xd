import { useCallback, useRef, useState } from "react";
import { CATEGORIES, ROUNDS_PER_CATEGORY } from "../game/categories";
import {
  buildRatingRound,
  buildFandomRound,
  buildOpeningRound,
  buildEpisodeRound,
  EpisodesNotReadyError,
} from "../game/roundBuilders";

const BUILDERS = {
  rating: buildRatingRound,
  fandom: buildFandomRound,
  opening: buildOpeningRound,
  episode: buildEpisodeRound,
};

// un solo "run" que recorre las 4 categorias en orden, sumando puntos en todas.
// fases: intro -> loading -> ready -> revealed -> (loop) -> intro (siguiente) -> ... -> finished
export function useGame() {
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [round, setRound] = useState(null);
  const [phase, setPhase] = useState("intro");
  const [totalScore, setTotalScore] = useState(0);
  const [categoryScore, setCategoryScore] = useState(0);
  const [lastPick, setLastPick] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [skipNotice, setSkipNotice] = useState(null);

  const usedKeysRef = useRef(new Set());
  const category = CATEGORIES[categoryIndex];

  const loadRound = useCallback(async (catId) => {
    setPhase("loading");
    setErrorMessage(null);
    try {
      const built = await BUILDERS[catId](usedKeysRef.current);
      built.usedKeys.forEach((k) => usedKeysRef.current.add(k));
      setRound(built);
      setPhase("ready");
    } catch (err) {
      if (err instanceof EpisodesNotReadyError) {
        setSkipNotice(`Skipped "${CATEGORIES.find((c) => c.id === catId)?.label}" — data isn't synced yet.`);
        advanceToNextCategory(catId);
        return;
      }
      setErrorMessage(`Couldn't load this round: ${err.message}`);
      setPhase("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const advanceToNextCategory = useCallback(
    (currentCatId) => {
      const currentIndex = CATEGORIES.findIndex((c) => c.id === currentCatId);
      usedKeysRef.current = new Set();
      setRoundNumber(1);
      setCategoryScore(0);

      if (currentIndex >= CATEGORIES.length - 1) {
        setPhase("finished");
        return;
      }
      setCategoryIndex(currentIndex + 1);
      setPhase("intro");
    },
    []
  );

  const beginRun = useCallback(() => {
    setCategoryIndex(0);
    setRoundNumber(1);
    setTotalScore(0);
    setCategoryScore(0);
    usedKeysRef.current = new Set();
    setSkipNotice(null);
    setPhase("intro");
  }, []);

  const startCategoryRounds = useCallback(() => {
    loadRound(category.id);
  }, [category, loadRound]);

  const choose = useCallback(
    (side) => {
      if (phase !== "ready" || !round) return;
      const chosenValue = round[side].value;
      const otherSide = side === "left" ? "right" : "left";
      const won = chosenValue >= round[otherSide].value;

      setLastPick(side);
      if (won) {
        setTotalScore((s) => s + 1);
        setCategoryScore((s) => s + 1);
      }
      setPhase("revealed");
    },
    [phase, round]
  );

  const nextRound = useCallback(() => {
    setSkipNotice(null);
    if (roundNumber >= ROUNDS_PER_CATEGORY) {
      advanceToNextCategory(category.id);
      return;
    }
    setRoundNumber((n) => n + 1);
    loadRound(category.id);
  }, [roundNumber, category, loadRound, advanceToNextCategory]);

  const retryRound = useCallback(() => loadRound(category.id), [category, loadRound]);

  const skipCategory = useCallback(() => advanceToNextCategory(category.id), [category, advanceToNextCategory]);

  return {
    category,
    categoryIndex,
    totalCategories: CATEGORIES.length,
    roundNumber,
    totalRounds: ROUNDS_PER_CATEGORY,
    round,
    phase,
    totalScore,
    categoryScore,
    lastPick,
    errorMessage,
    skipNotice,
    beginRun,
    startCategoryRounds,
    choose,
    nextRound,
    retryRound,
    skipCategory,
  };
}
