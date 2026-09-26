import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider, firebaseReady } from "../firebase/client";

// si el popup falla por CUALQUIER motivo que no sea "el usuario lo cerro a
// proposito", probamos con redirect en vez de solo fallar. Antes esto era una
// lista fija de codigos conocidos (popup-blocked, etc), pero un amigo se
// encontro con el error en Firefox de escritorio con un codigo que no estaba
// en esa lista (probablemente Enhanced Tracking Protection de Firefox
// bloqueando el storage entre el popup y la pagina principal, algo conocido
// de Firebase Auth + Firefox) -- mientras a otro amigo en el mismo navegador
// le funcionaba bien. En vez de tratar de adivinar cada codigo de error
// posible por navegador, ahora el fallback es la regla y el "no, dejalo
// fallar" es la excepcion.
const USER_CANCELLED_CODES = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"]);

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
  } catch (err) {
    if (!USER_CANCELLED_CODES.has(err.code)) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
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
