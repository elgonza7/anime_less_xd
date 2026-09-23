import { signInWithGoogle } from "../services/authService";
import { firebaseReady } from "../firebase/client";

export default function LoginGate({ message }) {
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      alert("No se pudo iniciar sesión. Intentá de nuevo.");
    }
  };

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 text-center">
      <p className="text-5xl">🔒</p>
      <p className="text-lg font-semibold">{message || "Iniciá sesión con Google para ver esto."}</p>
      {!firebaseReady && (
        <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-300">
          Firebase todavía no está configurado (faltan las claves en .env). Revisá SETUP.md.
        </p>
      )}
      <button
        onClick={handleLogin}
        disabled={!firebaseReady}
        className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-bold text-black disabled:opacity-40"
      >
        Iniciar sesión con Google
      </button>
    </div>
  );
}
