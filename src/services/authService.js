import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider, firebaseReady } from "../firebase/client";

export function subscribeToAuth(callback) {
  if (!firebaseReady) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  if (!firebaseReady) {
    throw new Error("Firebase no esta configurado todavia. Falta el .env");
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser() {
  if (!firebaseReady) return;
  await signOut(auth);
}
