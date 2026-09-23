import { CATEGORIES } from "../game/categories";

export default function CategoryStepper({ currentIndex }) {
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      {CATEGORIES.map((cat, i) => {
        const state = i < currentIndex ? "done" : i === currentIndex ? "current" : "upcoming";
        return (
          <div
            key={cat.id}
            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition-all sm:h-14 sm:w-14 sm:text-3xl ${
              state === "current"
                ? "scale-110 bg-violet-600 shadow-lg shadow-violet-600/40"
                : state === "done"
                  ? "bg-emerald-600/30"
                  : "bg-panel opacity-40"
            }`}
            title={cat.label}
          >
            {cat.icon}
          </div>
        );
      })}
    </div>
  );
}
