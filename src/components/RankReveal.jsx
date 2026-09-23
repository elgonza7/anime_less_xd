import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { playCategoryComplete } from "../game/sounds";

function useCountFromTo(from, to, durationMs) {
  const [display, setDisplay] = useState(from);

  useEffect(() => {
    let raf;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubico
      setDisplay(Math.round(from - (from - to) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to, durationMs]);

  return display;
}

function Row({ rank, displayName, photoURL, totalPoints, highlight, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
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

// muestra el rango "subiendo" (contando desde un numero mas alto hasta el
// puesto real) y despues el top + la fila del jugador, con animacion, tipo
// el resultado final de un kahoot/duolingo en vez de una tabla estatica.
export default function RankReveal({ myRank, top, myUid }) {
  const startRank = myRank.rank + 40;
  const displayedRank = useCountFromTo(startRank, myRank.rank, 1400);
  const isUserInTop = top.some((row) => row.uid === myUid);

  useEffect(() => {
    const timer = setTimeout(playCategoryComplete, 1400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-sm uppercase tracking-widest opacity-60">Your rank today</p>
      <p className="font-mono text-6xl font-black text-violet-400">#{displayedRank}</p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="mt-2 flex w-full max-w-sm flex-col gap-2"
      >
        {top.map((row, i) => (
          <Row key={row.uid} {...row} highlight={row.uid === myUid} delay={1.6 + i * 0.12} />
        ))}
        {!isUserInTop && (
          <>
            <p className="text-center text-lg opacity-40">⋯</p>
            <Row {...myRank} highlight delay={1.6 + top.length * 0.12} />
          </>
        )}
      </motion.div>
    </div>
  );
}
