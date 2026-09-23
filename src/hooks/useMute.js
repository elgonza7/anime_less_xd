import { useEffect, useState } from "react";
import { setMuted } from "../game/sounds";

export function useMute() {
  const [muted, setMutedState] = useState(() => {
    try {
      return localStorage.getItem("muted") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setMuted(muted);
    try {
      localStorage.setItem("muted", String(muted));
    } catch {
      // nada, no pasa nada si no se puede guardar
    }
  }, [muted]);

  return { muted, toggleMuted: () => setMutedState((m) => !m) };
}
