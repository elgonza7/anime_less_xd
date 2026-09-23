import { motion, AnimatePresence } from "framer-motion";

export default function CompareCard({ side, imageUrl, label, subLabel, revealed, isWinner, disabled, onClick }) {
  const borderClass = !revealed
    ? "border-panel-border hover:border-violet-500"
    : isWinner
      ? "border-emerald-500"
      : "border-panel-border opacity-60";

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={() => onClick(side)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      transition={{ duration: 0.25 }}
      className={`group relative flex h-96 w-full flex-col overflow-hidden rounded-3xl border-2 bg-panel text-left shadow-xl transition-colors sm:h-[30rem] sm:w-96 ${borderClass} ${
        disabled ? "cursor-default" : "cursor-pointer"
      }`}
    >
      <div className="relative flex-1 overflow-hidden bg-black/40">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={label}
            className={`h-full w-full object-cover transition-all ${revealed && !isWinner ? "grayscale" : ""}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl">🎴</div>
        )}

        <AnimatePresence>
          {revealed && isWinner && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-sm font-black text-white shadow-lg"
            >
              ✓ Correct
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-1 p-4">
        <p className="truncate text-lg font-bold sm:text-xl">{label}</p>
        <p
          className={`text-sm font-semibold transition-opacity ${revealed ? "opacity-100" : "opacity-0"} ${
            revealed && isWinner ? "text-emerald-400" : "opacity-60"
          }`}
        >
          {subLabel}
        </p>
      </div>
    </motion.button>
  );
}
