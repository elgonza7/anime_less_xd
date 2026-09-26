import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider, firebaseReady } from "../firebase/client";

// si el popup falla, SIEMPRE probamos con redirect antes de rendirnos --
// incluso para "auth/popup-closed-by-user". Suena raro (¿no significa eso
// que el usuario cerro el popup a proposito?), pero ese codigo es un falso
// positivo muy conocido de Firebase Auth en navegadores con Cross-Origin-
// -Opener-Policy mas estricta (Chrome/Opera/Edge recientes): el login
// adentro del popup puede haber terminado bien, pero el navegador le impide
// a Firebase confirmarlo, y termina reportando "cerrado por el usuario" de
// todos modos. Habiamos tratado ese codigo como cancelacion real y eso fue
// justo lo que rompio el login en Opera (andaba antes de ese cambio). Mas
// vale un redirect de mas que un login roto en silencio.

// si ya hay un intento de login en curso, cualquier click extra (doble click,
// login-dijo-que-no-y-volvio-a-tocar, etc) se engancha a ESE mismo intento en
// vez de lanzar uno nuevo -- lanzar signInWithPopup de nuevo mientras el
// anterior sigue abierto es lo que produce "auth/cancelled-popup-request" y
// deja todo en un estado raro ("se buguea").
let inFlightSignIn = null;

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

async function doSignIn() {
  if (isMobileBrowser()) {
    await signInWithRedirect(auth, googleProvider);
    return null; // la pagina se recarga; completeRedirectSignIn() toma la posta al volver
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch {
    await signInWithRedirect(auth, googleProvider);
    return null;
  }
}

export function signInWithGoogle() {
  if (!firebaseReady) {
    return Promise.reject(new Error("Firebase no esta configurado todavia. Falta el .env"));
  }
  if (inFlightSignIn) return inFlightSignIn;

  inFlightSignIn = doSignIn().finally(() => {
    inFlightSignIn = null;
  });
  return inFlightSignIn;
}

export async function signOutUser() {
  if (!firebaseReady) return;
  await signOut(auth);
}
