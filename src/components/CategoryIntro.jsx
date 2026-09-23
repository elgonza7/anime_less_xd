import { motion } from "framer-motion";

export default function CategoryIntro({ category, index, total, skipNotice, onStart }) {
  return (
    <motion.div
      key={category.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="mx-auto flex max-w-lg flex-col items-center gap-5 text-center"
    >
      {skipNotice && (
        <p className="rounded-full bg-amber-500/10 px-4 py-1.5 text-sm text-amber-400">{skipNotice}</p>
      )}

      <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
        Round {index + 1} of {total}
      </p>

      <span className="text-6xl">{category.icon}</span>

      <h2 className="text-3xl font-black sm:text-4xl">{category.label}</h2>
      <p className="text-lg opacity-70">{category.intro}</p>

      <button
        onClick={onStart}
        className="mt-2 rounded-full bg-violet-600 px-10 py-3 text-lg font-bold text-white hover:bg-violet-500"
      >
        {index === 0 ? "Let's play →" : "Continue →"}
      </button>
    </motion.div>
  );
}
