import { signInWithPopup, getRedirectResult, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider, firebaseReady } from "../firebase/client";

// Solo popup, en todos lados (celu incluido). signInWithRedirect NO funciona
// en navegadores modernos (Chrome, Firefox, Safari, Opera) cuando la app vive
// en un dominio propio (animless.com) y el authDomain es firebaseapp.com: el
// navegador particiona el storage entre dominios y al volver de Google la
// sesion se pierde ("vuelve a la pagina sin credenciales"). signInWithPopup
// no tiene ese problema.

// si ya hay un intento en curso, los clicks extra se enganchan a ese mismo
// intento en vez de abrir otro popup (eso cancelaba el primero y se buguaba).
let inFlightSignIn = null;

export function subscribeToAuth(callback) {
  if (!firebaseReady) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

// limpia cualquier redirect pendiente de versiones anteriores; no hace nada si no hay.
export async function completeRedirectSignIn() {
  if (!firebaseReady) return null;
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch {
    return null;
  }
}

export function signInWithGoogle() {
  if (!firebaseReady) {
    return Promise.reject(new Error("Firebase no esta configurado todavia. Falta el .env"));
  }
  if (inFlightSignIn) return inFlightSignIn;

  inFlightSignIn = signInWithPopup(auth, googleProvider)
    .then((result) => result.user)
    .finally(() => {
      inFlightSignIn = null;
    });
  return inFlightSignIn;
}

export function isUserCancelled(err) {
  return err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request";
}

export async function signOutUser() {
  if (!firebaseReady) return;
  await signOut(auth);
}
