import { signInWithGoogle } from "../services/authService";
import { firebaseReady } from "../firebase/client";

export default function LoginGate({ message }) {
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      alert("Couldn't sign in. Please try again.");
    }
  };

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 text-center">
      <p className="text-5xl">🔒</p>
      <p className="text-lg font-semibold">{message || "Sign in with Google to see this."}</p>
      {!firebaseReady && (
        <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400">
          Firebase isn't configured yet (missing keys in .env). Check SETUP.md.
        </p>
      )}
      <button
        onClick={handleLogin}
        disabled={!firebaseReady}
        className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-bold text-black shadow disabled:opacity-40"
      >
        Sign in with Google
      </button>
    </div>
  );
}
