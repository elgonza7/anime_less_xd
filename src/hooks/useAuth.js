import { useEffect, useState } from "react";
import { subscribeToAuth } from "../services/authService";

export function useAuth() {
  const [user, setUser] = useState(undefined); // undefined = todavia no sabemos, null = no logueado

  useEffect(() => {
    const unsubscribe = subscribeToAuth(setUser);
    return unsubscribe;
  }, []);

  return { user, isLoading: user === undefined };
}
