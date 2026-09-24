import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "./components/Navbar";
import GameScreen from "./components/GameScreen";
import ResultsScreen from "./components/ResultsScreen";
import Leaderboard from "./components/Leaderboard";
import AlreadyPlayedScreen from "./components/AlreadyPlayedScreen";
import { useAuth } from "./hooks/useAuth";
import { useGame } from "./hooks/useGame";
import { useTheme } from "./hooks/useTheme";
import { useMute } from "./hooks/useMute";
import { checkGameStatus, getGodModeStatus, setGodMode } from "./services/leaderboardService";
import { completeRedirectSignIn } from "./services/authService";

function App() {
  const { user } = useAuth();
  const game = useGame();
  const { theme, toggleTheme } = useTheme();
  const { muted, toggleMuted } = useMute();
  const [view, setView] = useState("game"); // game | results | leaderboard
  const [finishedScore, setFinishedScore] = useState(0);
  const [finishedTimeMs, setFinishedTimeMs] = useState(null);
  const [alreadyPlayedToday, setAlreadyPlayedToday] = useState(null); // null = checking
  const [godMode, setGodModeState] = useState({ isGodUser: false, enabled: false });

  // esto corre para CUALQUIERA, con o sin sesion -- antes solo chequeaba la
  // cuenta, asi que sin loguearse se podia rejugar infinitas veces con solo
  // volver al inicio. ahora tambien se chequea por IP en el servidor.
  const refreshGameStatus = () => checkGameStatus(user || null).then(setAlreadyPlayedToday);

  // si el login cayo en el fallback de redirect (ver services/authService.js),
  // esto termina el proceso al volver de Google. onAuthStateChanged se entera
  // solo despues.
  useEffect(() => {
    completeRedirectSignIn();
  }, []);

  useEffect(() => {
    let alive = true;
    setAlreadyPlayedToday(null);
    checkGameStatus(user || null).then((played) => {
      if (alive) setAlreadyPlayedToday(played);
    });
    getGodModeStatus(user || null).then((status) => {
      if (alive) setGodModeState(status);
    });
    return () => {
      alive = false;
    };
  }, [user]);

  const goHome = () => {
    game.beginRun();
    setView("game");
  };

  const handleFinished = (score, totalTimeMs) => {
    setFinishedScore(score);
    setFinishedTimeMs(totalTimeMs);
    setView("results");
  };

  const handleToggleGodMode = () => {
    const next = !godMode.enabled;
    setGodModeState((g) => ({ ...g, enabled: next })); // optimista
    setGodMode(user, next)
      .then(() => refreshGameStatus())
      .catch((err) => {
        console.error(err);
        setGodModeState((g) => ({ ...g, enabled: !next })); // revertir si fallo
      });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        user={user}
        theme={theme}
        onToggleTheme={toggleTheme}
        muted={muted}
        onToggleMuted={toggleMuted}
        onGoHome={goHome}
        onGoLeaderboard={() => setView("leaderboard")}
        isGodUser={godMode.isGodUser}
        godModeEnabled={godMode.enabled}
        onToggleGodMode={handleToggleGodMode}
      />

      <main className="flex flex-1 items-start justify-center p-3 pt-4 sm:p-4 sm:pt-6">
        <AnimatePresence mode="wait">
          {view === "game" && alreadyPlayedToday === null && (
            <motion.p key="checking" exit={{ opacity: 0 }} className="text-lg opacity-60">
              Loading...
            </motion.p>
          )}

          {view === "game" && alreadyPlayedToday === false && (
            <motion.div key="game" exit={{ opacity: 0 }} className="w-full">
              <GameScreen game={game} onFinished={handleFinished} />
            </motion.div>
          )}

          {view === "game" && alreadyPlayedToday === true && (
            <motion.div key="already-played" exit={{ opacity: 0 }} className="w-full">
              <AlreadyPlayedScreen onGoToLeaderboard={() => setView("leaderboard")} />
            </motion.div>
          )}

          {view === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <ResultsScreen
                score={finishedScore}
                totalTimeMs={finishedTimeMs}
                user={user}
                onSaved={refreshGameStatus}
                onGoToLeaderboard={() => setView("leaderboard")}
              />
            </motion.div>
          )}

          {view === "leaderboard" && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <Leaderboard user={user} onBack={goHome} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
