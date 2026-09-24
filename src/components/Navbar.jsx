import { signInWithGoogle, signOutUser } from "../services/authService";

export default function Navbar({
  user,
  theme,
  onToggleTheme,
  muted,
  onToggleMuted,
  onGoHome,
  onGoLeaderboard,
  isGodUser,
  godModeEnabled,
  onToggleGodMode,
}) {
  return (
    <header className="flex flex-col gap-1 border-b border-panel-border px-4 py-3 sm:px-8">
      <div className="flex items-center justify-between">
        <button onClick={onGoHome} className="flex items-center gap-2 text-lg font-black">
          <img src="/logo.png" alt="" className="h-8 w-8 rounded-full object-cover" />
          Anime<span className="text-violet-500">Less</span>
        </button>

        <div className="flex items-center gap-3">
          {isGodUser && (
            <button
              onClick={onToggleGodMode}
              aria-label="Toggle god mode"
              title={godModeEnabled ? "God mode ON — you can replay anytime" : "God mode OFF — same rules as everyone"}
              className={`rounded-full px-2.5 py-1.5 text-sm ${godModeEnabled ? "bg-violet-600" : "hover:bg-panel opacity-50"}`}
            >
              🛡️
            </button>
          )}

          <button
            onClick={onToggleMuted}
            aria-label="Toggle sound"
            className="rounded-full px-2.5 py-1.5 text-sm hover:bg-panel"
          >
            {muted ? "🔇" : "🔊"}
          </button>

          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="rounded-full px-2.5 py-1.5 text-sm hover:bg-panel"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          <button onClick={onGoLeaderboard} className="rounded-full px-3 py-1.5 text-sm font-semibold hover:bg-panel">
            🏆 Leaderboard
          </button>

          {user ? (
            <div className="flex items-center gap-2 rounded-full bg-panel px-3 py-1.5 text-sm">
              {user.photoURL && <img src={user.photoURL} alt="" className="h-6 w-6 rounded-full" />}
              <span className="max-w-24 truncate">{user.displayName}</span>
              <button onClick={signOutUser} className="font-semibold text-violet-400 hover:text-violet-300">
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-black shadow"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      <a
        href="https://lessgames.com/moreless"
        target="_blank"
        rel="noreferrer"
        className="self-end text-[11px] opacity-40 hover:opacity-70"
      >
        inspired by lessgames.com/moreless
      </a>
    </header>
  );
}
