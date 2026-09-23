import { useEffect, useState } from "react";
import { getTopScores, getUserRank } from "../services/leaderboardService";

function Row({ rank, displayName, photoURL, totalPoints, highlight }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-2 ${
        highlight ? "bg-violet-600/20 ring-1 ring-violet-500" : "bg-panel"
      }`}
    >
      <span className="w-8 text-center font-black opacity-70">#{rank}</span>
      {photoURL && <img src={photoURL} alt="" className="h-8 w-8 rounded-full" />}
      <span className="flex-1 truncate font-semibold">{displayName || "Anonymous"}</span>
      <span className="font-bold text-violet-400">{totalPoints} pts</span>
    </div>
  );
}

export default function Leaderboard({ user, onBack }) {
  const [top, setTop] = useState(null);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([getTopScores(10), getUserRank(user.uid)]).then(([topScores, rank]) => {
      if (!alive) return;
      setTop(topScores);
      setMyRank(rank);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [user.uid]);

  const isUserInTop = top?.some((row) => row.uid === user.uid);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <h2 className="text-center text-2xl font-bold">🏆 Global Leaderboard</h2>

      {loading && <p className="text-center opacity-60">Loading...</p>}

      {!loading && (
        <div className="flex flex-col gap-2">
          {top.map((row) => (
            <Row key={row.uid} {...row} highlight={row.uid === user.uid} />
          ))}

          {myRank && !isUserInTop && (
            <>
              <p className="text-center text-lg opacity-40">⋯</p>
              <Row {...myRank} highlight />
            </>
          )}

          {!myRank && (
            <p className="mt-2 text-center text-sm opacity-60">
              You haven't played a round yet. Play a run to score points.
            </p>
          )}
        </div>
      )}

      <button onClick={onBack} className="mx-auto rounded-full bg-panel px-5 py-2 font-bold hover:bg-panel-border">
        Back
      </button>
    </div>
  );
}
