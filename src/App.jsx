import { useState } from "react";
import Navbar from "./components/Navbar";
import Landing from "./components/Landing";
import GameScreen from "./components/GameScreen";
import ResultsScreen from "./components/ResultsScreen";
import Leaderboard from "./components/Leaderboard";
import LoginGate from "./components/LoginGate";
import { useAuth } from "./hooks/useAuth";
import { useGame } from "./hooks/useGame";

function App() {
  const { user } = useAuth();
  const game = useGame();
  const [view, setView] = useState("landing"); // landing | game | results | leaderboard
  const [finishedScore, setFinishedScore] = useState(0);

  const goHome = () => {
    game.reset();
    setView("landing");
  };

  const selectCategory = (categoryId) => {
    game.startCategory(categoryId);
    setView("game");
  };

  const handleFinished = (score) => {
    setFinishedScore(score);
    setView("results");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar user={user} onGoHome={goHome} onGoLeaderboard={() => setView("leaderboard")} />

      <main className="flex flex-1 items-center justify-center p-6">
        {view === "landing" && <Landing onSelectCategory={selectCategory} />}

        {view === "game" && <GameScreen game={game} onFinished={handleFinished} onExit={goHome} />}

        {view === "results" && (
          <ResultsScreen
            score={finishedScore}
            user={user}
            onPlayAgain={() => selectCategory(game.categoryId)}
            onGoToMenu={goHome}
            onGoToLeaderboard={() => setView("leaderboard")}
          />
        )}

        {view === "leaderboard" &&
          (user ? (
            <Leaderboard user={user} onBack={goHome} />
          ) : (
            <LoginGate message="Iniciá sesión con Google para ver el ranking global." />
          ))}
      </main>
    </div>
  );
}

export default App;
