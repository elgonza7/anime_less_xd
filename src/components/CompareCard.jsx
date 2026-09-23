export default function CompareCard({ side, imageUrl, label, subLabel, revealed, isWinner, disabled, onClick }) {
  const borderClass = !revealed
    ? "border-panel-border hover:border-violet-500"
    : isWinner
      ? "border-emerald-500"
      : "border-red-500/70";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(side)}
      className={`group relative flex h-72 w-full flex-col overflow-hidden rounded-2xl border-2 bg-panel text-left transition-all sm:h-96 sm:w-72 ${borderClass} ${
        disabled ? "cursor-default" : "cursor-pointer"
      }`}
    >
      <div className="relative flex-1 overflow-hidden bg-black/40">
        {imageUrl ? (
          <img src={imageUrl} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🎴</div>
        )}
        {revealed && (
          <div
            className={`absolute inset-0 flex items-center justify-center text-3xl font-black ${
              isWinner ? "bg-emerald-500/20" : "bg-red-500/20"
            }`}
          >
            {isWinner ? "GANÓ" : "PERDIÓ"}
          </div>
        )}
      </div>
      <div className="space-y-1 p-4">
        <p className="truncate text-base font-bold sm:text-lg">{label}</p>
        <p className={`text-sm font-semibold ${revealed ? "opacity-100" : "opacity-0"}`}>{subLabel}</p>
      </div>
    </button>
  );
}
