import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "./components/Navbar";
import GameScreen from "./components/GameScreen";
import ResultsScreen from "./components/ResultsScreen";
import Leaderboard from "./components/Leaderboard";
import LoginGate from "./components/LoginGate";
import { useAuth } from "./hooks/useAuth";
import { useGame } from "./hooks/useGame";
import { useTheme } from "./hooks/useTheme";
import { useMute } from "./hooks/useMute";

function App() {
  const { user } = useAuth();
  const game = useGame();
  const { theme, toggleTheme } = useTheme();
  const { muted, toggleMuted } = useMute();
  const [view, setView] = useState("game"); // game | results | leaderboard
  const [finishedScore, setFinishedScore] = useState(0);

  const goHome = () => {
    game.beginRun();
    setView("game");
  };

  const handleFinished = (score) => {
    setFinishedScore(score);
    setView("results");
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
      />

      <main className="flex flex-1 items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {view === "game" && (
            <motion.div key="game" exit={{ opacity: 0 }} className="w-full">
              <GameScreen game={game} onFinished={handleFinished} />
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
                user={user}
                onPlayAgain={goHome}
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
              {user ? (
                <Leaderboard user={user} onBack={goHome} />
              ) : (
                <LoginGate message="Sign in with Google to see the global leaderboard." />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
