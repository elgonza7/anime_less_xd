import { motion, AnimatePresence } from "framer-motion";
import AnimatedNumber from "./AnimatedNumber";

export const CARD_SIZE_CLASSES = "h-[min(64vh,38rem)] w-full sm:h-[min(76vh,46rem)] sm:w-[min(36vw,28rem)]";

export default function CompareCard({
  side,
  itemKey,
  imageUrl,
  label,
  value,
  statIcon,
  statUnit = "",
  statDecimals = 0,
  revealed,
  isWinner,
  disabled,
  onClick,
  alwaysShowStat = false,
}) {
  const borderClass = !revealed
    ? "border-panel-border hover:border-violet-500"
    : isWinner
      ? "border-emerald-500"
      : "border-panel-border opacity-60";

  const showStat = revealed || alwaysShowStat;
  const staticStat = value.toLocaleString("en-US", {
    minimumFractionDigits: statDecimals,
    maximumFractionDigits: statDecimals,
  });

  return (
    <motion.button
      type="button"
      layout
      layoutId={itemKey}
      disabled={disabled}
      onClick={() => onClick(side)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={!disabled ? { scale: 1.015 } : {}}
      whileTap={!disabled ? { scale: 0.985 } : {}}
      transition={{ layout: { duration: 1.1, ease: "easeInOut" }, opacity: { duration: 0.4 } }}
      className={`group relative overflow-hidden rounded-3xl border-2 bg-panel text-left shadow-xl transition-colors ${CARD_SIZE_CLASSES} ${borderClass} ${
        disabled ? "cursor-default" : "cursor-pointer"
      }`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={label}
          className={`absolute inset-0 h-full w-full object-cover transition-all ${revealed && !isWinner ? "grayscale" : ""}`}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-7xl">🎴</div>
      )}

      {/* scrim para que el texto se lea siempre, sin importar la imagen */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      <AnimatePresence>
        {revealed && isWinner && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="absolute right-4 top-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-3xl text-white shadow-lg"
          >
            ✓
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-0 space-y-2 p-5">
        <p className="text-xl font-black leading-tight text-white drop-shadow sm:text-3xl">{label}</p>
        <p
          className={`text-lg font-bold transition-opacity sm:text-xl ${showStat ? "opacity-100" : "opacity-0"} ${
            revealed && isWinner ? "text-emerald-400" : "text-white/70"
          }`}
        >
          {statIcon}{" "}
          {alwaysShowStat ? staticStat : <AnimatedNumber value={value} active={revealed} decimals={statDecimals} />}
          {statUnit}
        </p>
      </div>
    </motion.button>
  );
}
