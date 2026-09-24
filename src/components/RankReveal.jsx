import { motion } from "framer-motion";
import { useEffect } from "react";
import { playCategoryComplete } from "../game/sounds";

const MEDALS = ["🥇", "🥈", "🥉"];

function Row({ rank, displayName, photoURL, totalPoints, highlight, delay, climbIn, ghost }) {
  return (
    <motion.div
      initial={climbIn ? { opacity: 0, y: 30, scale: 0.9 } : { opacity: 0, x: -16 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      transition={climbIn ? { delay, type: "spring", stiffness: 260, damping: 18 } : { delay }}
      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 ${
        ghost
          ? "border-2 border-dashed border-violet-500/50 bg-transparent"
          : highlight
            ? "bg-violet-600/20 ring-2 ring-violet-500"
            : "bg-panel"
      }`}
    >
      <span className="w-8 text-center text-xl font-black opacity-80">{MEDALS[rank - 1] || `#${rank}`}</span>
      {photoURL && <img src={photoURL} alt="" className="h-8 w-8 rounded-full" />}
      <span className={`flex-1 truncate font-semibold ${ghost ? "italic opacity-70" : ""}`}>
        {ghost ? "You'd be here" : displayName || "Anonymous"}
      </span>
      <span className="font-bold text-violet-400">{totalPoints} pts</span>
      {highlight && !ghost && <span className="text-xs font-bold uppercase text-violet-400">you</span>}
    </motion.div>
  );
}

// leaderboard primero (top 1/2/3 con medalla), tu fila se integra ahi si
// estas en el top, o se agrega abajo con una animacion de "entrar subiendo"
// si no. nada de mostrar solo un numero de rango aislado.
//
// si no hay myUid (jugaste sin loguearte) mostramos "myRank" como una fila
// fantasma ("You'd be here") en lugar de resaltar una fila real -- no hay
// cuenta guardada todavia, ver getHypotheticalRank en leaderboardService.js.
export default function RankReveal({ myRank, top, myUid }) {
  const isInTop = myUid ? top.some((row) => row.uid === myUid) : false;
  const ghost = !myUid;

  useEffect(() => {
    const timer = setTimeout(playCategoryComplete, 900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <p className="text-sm font-bold uppercase tracking-widest opacity-60">🏆 Today's Leaderboard</p>

      <div className="flex w-full max-w-sm flex-col gap-2">
        {top.length === 0 && <p className="text-center text-sm opacity-60">No scores yet today — you're the first!</p>}

        {top.map((row, i) => (
          <Row key={row.uid} {...row} highlight={row.uid === myUid} delay={i * 0.15} />
        ))}

        {myRank && !isInTop && (
          <>
            <p className="text-center text-lg opacity-40">⋯</p>
            <Row {...myRank} highlight delay={top.length * 0.15 + 0.2} climbIn={!ghost} ghost={ghost} />
          </>
        )}
      </div>
    </div>
  );
}
