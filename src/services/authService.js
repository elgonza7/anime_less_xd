import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider, firebaseReady } from "../firebase/client";

// errores de signInWithPopup que NO son "el usuario se arrepintio": son el
// navegador/entorno rechazando el popup en si (Safari con "prevent cross-site
// tracking", navegadores in-app de Instagram/TikTok, terceros bloqueando
// cookies, etc). en esos casos probamos con redirect en vez de solo fallar
// -- por eso a un amigo le funcionaba y a otro no, dependia del navegador.
const POPUP_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/web-storage-unsupported",
]);

export function subscribeToAuth(callback) {
  if (!firebaseReady) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

// si volviste de un signInWithRedirect, esto termina el login. hay que
// llamarlo una vez al arrancar la app (ver src/App.jsx).
export async function completeRedirectSignIn() {
  if (!firebaseReady) return null;
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch (err) {
    console.error("no se pudo completar el login por redirect:", err);
    return null;
  }
}

// signInWithPopup en el celular es poco confiable en general (Chrome/Safari
// mobile, y sobre todo navegadores in-app como Instagram/TikTok muchas veces
// ni siquiera abren una ventana de verdad, navegan la misma pestaña a medias
// y quedan en un estado roto que vuelve a la pagina principal sin loguear).
// por eso en celular vamos directo a redirect en vez de intentar popup primero.
function isMobileBrowser() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile|IEMobile/i.test(navigator.userAgent);
}

export async function signInWithGoogle() {
  if (!firebaseReady) {
    throw new Error("Firebase no esta configurado todavia. Falta el .env");
  }
  if (isMobileBrowser()) {
    await signInWithRedirect(auth, googleProvider);
    return null; // la pagina se recarga; completeRedirectSignIn() toma la posta al volver
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    if (POPUP_FALLBACK_CODES.has(err.code)) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
  }
}

export async function signOutUser() {
  if (!firebaseReady) return;
  await signOut(auth);
}
