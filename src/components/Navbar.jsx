import { useState } from "react";
import { signInWithGoogle, signOutUser } from "../services/authService";

// el menu de arriba tenia demasiados items (modo dios, mute, tema, leaderboard,
// perfil/login) para entrar en una fila en pantallas de celular sin desbordar
// el ancho de la pagina (eso generaba el scroll horizontal fantasma que
// reportaron). Por eso en mobile se junta todo en un boton de hamburguesa;
// en desktop (sm+) se ve todo en fila como antes.
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
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("sign in fallo:", err);
      alert("Couldn't sign in. Please try again.");
    }
  };

  const godButton = isGodUser && (
    <button
      onClick={onToggleGodMode}
      aria-label="Toggle god mode"
      title={godModeEnabled ? "God mode ON — you can replay anytime" : "God mode OFF — same rules as everyone"}
      className={`rounded-full px-2.5 py-1.5 text-sm ${godModeEnabled ? "bg-violet-600" : "hover:bg-panel opacity-50"}`}
    >
      🛡️
    </button>
  );

  const muteButton = (
    <button onClick={onToggleMuted} aria-label="Toggle sound" className="rounded-full px-2.5 py-1.5 text-sm hover:bg-panel">
      {muted ? "🔇" : "🔊"}
    </button>
  );

  const themeButton = (
    <button onClick={onToggleTheme} aria-label="Toggle theme" className="rounded-full px-2.5 py-1.5 text-sm hover:bg-panel">
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );

  const leaderboardButton = (
    <button onClick={onGoLeaderboard} className="rounded-full px-3 py-1.5 text-sm font-semibold hover:bg-panel">
      🏆 Leaderboard
    </button>
  );

  const authArea = user ? (
    <div className="flex items-center gap-2 rounded-full bg-panel px-3 py-1.5 text-sm">
      {user.photoURL && <img src={user.photoURL} alt="" className="h-6 w-6 shrink-0 rounded-full" />}
      <span className="max-w-24 truncate">{user.displayName}</span>
      <button onClick={signOutUser} className="shrink-0 font-semibold text-violet-400 hover:text-violet-300">
        Sign Out
      </button>
    </div>
  ) : (
    <button onClick={handleSignIn} className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-black shadow">
      Sign In
    </button>
  );

  return (
    <header className="flex flex-col gap-1 border-b border-panel-border px-4 py-3 sm:px-8">
      <div className="flex items-center justify-between gap-2">
        <button onClick={onGoHome} className="flex min-w-0 items-center gap-2 text-lg font-black">
          <img src="/logo.png" alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
          <span className="truncate">
            Anime<span className="text-violet-500">Less</span>
          </span>
        </button>

        {/* desktop: todo en fila */}
        <div className="hidden shrink-0 items-center gap-3 sm:flex">
          {godButton}
          {muteButton}
          {themeButton}
          {leaderboardButton}
          {authArea}
        </div>

        {/* mobile: un solo boton de hamburguesa */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          className="shrink-0 rounded-full px-3 py-1.5 text-xl hover:bg-panel sm:hidden"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <div className="flex flex-col gap-2 border-t border-panel-border pt-2 sm:hidden">
          <div className="flex items-center gap-2">
            {godButton}
            {muteButton}
            {themeButton}
          </div>
          <div onClick={() => setMenuOpen(false)}>{leaderboardButton}</div>
          <div onClick={() => setMenuOpen(false)}>{authArea}</div>
        </div>
      )}

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
