export default function ProgressDots({ total, current }) {
  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full transition-colors ${
            i < current ? "bg-violet-500" : "bg-panel-border"
          }`}
        />
      ))}
    </div>
  );
}
