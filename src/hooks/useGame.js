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

// un solo "run" que recorre las 4 categorias en orden, sumando puntos en todas,
// sin botones intermedios: todo avanza solo, el jugador solo tiene que elegir.
// fases: intro -> loading -> ready -> revealed -> (loop) -> category-recap -> intro (siguiente) -> ... -> finished
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
  const loadingRef = useRef(false); // evita cargas duplicadas (doble-render en dev, dobles clicks, etc.)
  const category = CATEGORIES[categoryIndex];

  const loadRound = useCallback(async (catId) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
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
        goToRecapOrFinish(catId);
      } else {
        setErrorMessage(`Couldn't load this round: ${err.message}`);
        setPhase("error");
      }
    } finally {
      loadingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pasa por una pantalla de recap ("sacaste 3/5") antes de la siguiente categoria
  const goToRecapOrFinish = useCallback((currentCatId) => {
    const currentIndex = CATEGORIES.findIndex((c) => c.id === currentCatId);
    if (currentIndex >= CATEGORIES.length - 1) {
      setPhase("finished");
      return;
    }
    setPhase("category-recap");
  }, []);

  const continueAfterRecap = useCallback(() => {
    setCategoryIndex((i) => i + 1);
    setRoundNumber(1);
    setCategoryScore(0);
    usedKeysRef.current = new Set();
    setPhase("intro");
  }, []);

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

  // se llama sola (con un timer en GameScreen) despues de mostrar el resultado de la ronda
  const advanceRound = useCallback(() => {
    setSkipNotice(null);
    if (roundNumber >= ROUNDS_PER_CATEGORY) {
      goToRecapOrFinish(category.id);
      return;
    }
    setRoundNumber((n) => n + 1);
    loadRound(category.id);
  }, [roundNumber, category, loadRound, goToRecapOrFinish]);

  const retryRound = useCallback(() => loadRound(category.id), [category, loadRound]);

  const skipCategory = useCallback(() => goToRecapOrFinish(category.id), [category, goToRecapOrFinish]);

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
    advanceRound,
    continueAfterRecap,
    retryRound,
    skipCategory,
  };
}
