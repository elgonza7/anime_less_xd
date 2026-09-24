import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getTopScores, getUserRank } from "../services/leaderboardService";

// user es opcional: el leaderboard es publico (ver firestore.rules), asi que
// tambien lo puede ver alguien sin loguearse -- simplemente no le mostramos
// "tu posicion" porque sin cuenta no hay puntaje guardado que resaltar.

function Row({ rank, displayName, photoURL, totalPoints, highlight, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-center gap-3 rounded-xl px-4 py-2 ${
        highlight ? "bg-violet-600/20 ring-1 ring-violet-500" : "bg-panel"
      }`}
    >
      <span className="w-8 text-center font-black opacity-70">#{rank}</span>
      {photoURL && <img src={photoURL} alt="" className="h-8 w-8 rounded-full" />}
      <span className="flex-1 truncate font-semibold">{displayName || "Anonymous"}</span>
      <span className="font-bold text-violet-400">{totalPoints} pts</span>
    </motion.div>
  );
}

export default function Leaderboard({ user, onBack }) {
  const [top, setTop] = useState(null);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.all([getTopScores(10), user ? getUserRank(user.uid) : Promise.resolve(null)])
      .then(([topScores, rank]) => {
        if (!alive) return;
        setTop(topScores);
        setMyRank(rank);
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        console.error("couldn't load leaderboard:", err);
        setError("Couldn't load the leaderboard. Double check Firestore is set up (see SETUP.md).");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user]);

  useEffect(() => load(), [load]);

  const isUserInTop = user && top?.some((row) => row.uid === user.uid);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <h2 className="text-center text-2xl font-bold">🏆 Global Leaderboard</h2>

      {loading && <p className="text-center opacity-60">Loading...</p>}

      {error && (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={load} className="rounded-full bg-violet-600 px-5 py-2 font-bold text-white hover:bg-violet-500">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-col gap-2">
          {top.map((row, i) => (
            <Row key={row.uid} {...row} index={i} highlight={user && row.uid === user.uid} />
          ))}

          {myRank && !isUserInTop && (
            <>
              <p className="text-center text-lg opacity-40">⋯</p>
              <Row {...myRank} index={top.length} highlight />
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
