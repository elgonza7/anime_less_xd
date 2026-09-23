import { useCallback, useRef, useState } from "react";
import { ROUNDS_PER_CATEGORY } from "../game/categories";
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

export function useGame() {
  const [categoryId, setCategoryId] = useState(null);
  const [roundNumber, setRoundNumber] = useState(0); // 1-indexed para mostrar en pantalla
  const [round, setRound] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | revealed | finished | error
  const [score, setScore] = useState(0);
  const [lastPick, setLastPick] = useState(null); // "left" | "right"
  const [errorMessage, setErrorMessage] = useState(null);

  const usedKeysRef = useRef(new Set());

  const loadRound = useCallback(async (cat) => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const builder = BUILDERS[cat];
      const built = await builder(usedKeysRef.current);
      built.usedKeys.forEach((k) => usedKeysRef.current.add(k));
      setRound(built);
      setStatus("ready");
    } catch (err) {
      setErrorMessage(err instanceof EpisodesNotReadyError ? err.message : `Error cargando la ronda: ${err.message}`);
      setStatus("error");
    }
  }, []);

  const startCategory = useCallback(
    (cat) => {
      setCategoryId(cat);
      setScore(0);
      setRoundNumber(1);
      usedKeysRef.current = new Set();
      loadRound(cat);
    },
    [loadRound]
  );

  const choose = useCallback(
    (side) => {
      if (status !== "ready" || !round) return;
      const chosenValue = round[side].value;
      const otherSide = side === "left" ? "right" : "left";
      const won = chosenValue >= round[otherSide].value;

      setLastPick(side);
      if (won) setScore((s) => s + 1);
      setStatus("revealed");
    },
    [status, round]
  );

  const nextRound = useCallback(() => {
    if (roundNumber >= ROUNDS_PER_CATEGORY) {
      setStatus("finished");
      return;
    }
    setRoundNumber((n) => n + 1);
    loadRound(categoryId);
  }, [roundNumber, categoryId, loadRound]);

  const retryRound = useCallback(() => loadRound(categoryId), [categoryId, loadRound]);

  const reset = useCallback(() => {
    setCategoryId(null);
    setRound(null);
    setStatus("idle");
    setScore(0);
    setRoundNumber(0);
    setLastPick(null);
    usedKeysRef.current = new Set();
  }, []);

  return {
    categoryId,
    roundNumber,
    totalRounds: ROUNDS_PER_CATEGORY,
    round,
    status,
    score,
    lastPick,
    errorMessage,
    startCategory,
    choose,
    nextRound,
    retryRound,
    reset,
  };
}
