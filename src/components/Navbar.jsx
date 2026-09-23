import { signInWithGoogle, signOutUser } from "../services/authService";

export default function Navbar({ user, onGoHome, onGoLeaderboard }) {
  return (
    <header className="flex items-center justify-between border-b border-panel-border px-4 py-3 sm:px-8">
      <button onClick={onGoHome} className="text-lg font-black">
        Ani<span className="text-violet-500">Versus</span>
      </button>

      <div className="flex items-center gap-3">
        <button onClick={onGoLeaderboard} className="rounded-full px-3 py-1.5 text-sm font-semibold hover:bg-panel">
          🏆 Ranking
        </button>

        {user ? (
          <button onClick={signOutUser} className="flex items-center gap-2 rounded-full bg-panel px-3 py-1.5 text-sm">
            {user.photoURL && <img src={user.photoURL} alt="" className="h-6 w-6 rounded-full" />}
            <span className="max-w-24 truncate">{user.displayName}</span>
          </button>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-black"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
