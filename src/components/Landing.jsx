import { CATEGORIES } from "../game/categories";

export default function Landing({ onSelectCategory }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
      <div>
        <h1 className="text-4xl font-black sm:text-5xl">
          Ani<span className="text-violet-500">Versus</span>
        </h1>
        <p className="mt-2 text-sm opacity-70 sm:text-base">
          Elegí una categoría, comparás 5 veces, sumás puntos. Fácil.
        </p>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className="flex flex-col items-center gap-2 rounded-2xl border-2 border-panel-border bg-panel p-6 transition-colors hover:border-violet-500"
          >
            <span className="text-4xl">{cat.icon}</span>
            <span className="text-lg font-bold">{cat.label}</span>
            <span className="text-sm opacity-60">{cat.question}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
