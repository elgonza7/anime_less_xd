import { collection, doc, getCountFromServer, getDoc, orderBy, query, limit, getDocs, where } from "firebase/firestore";
import { db, firebaseReady } from "../firebase/client";

const SCORES_COLLECTION = "scores";

export class AlreadyPlayedTodayError extends Error {}

// el puntaje ya NO se escribe directo a firestore desde el cliente (mira
// firestore.rules: scores solo se puede leer, nunca escribir desde el
// browser). todo pasa por /api/submit-score, que valida el token, chequea
// "un intento guardado por dia" por usuario Y por IP, y recien ahi escribe
// con la Admin SDK. asi nadie puede inventarse un puntaje desde devtools.
//
// totalTimeMs es un desempate invisible (nunca se muestra en ningun lado):
// si dos personas sacan el mismo puntaje, gana quien termino mas rapido. el
// server descarta valores poco creibles en vez de premiarlos.
export async function submitScore(user, score, totalTimeMs) {
  if (!firebaseReady || !user) return;

  const idToken = await user.getIdToken();
  let res;
  try {
    res = await fetch("/api/submit-score", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ score, totalTimeMs }),
    });
  } catch (err) {
    console.error("submit-score: fetch fallo (red/CORS/etc):", err);
    throw new Error(`No se pudo contactar al servidor: ${err.message}`);
  }

  if (res.status === 409) throw new AlreadyPlayedTodayError("You already have a saved score for today.");
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    console.error("submit-score fallo:", res.status, body);
    throw new Error(`No se pudo guardar el puntaje (${res.status}: ${body?.error || "?"} ${body?.detail || ""})`);
  }
}

// chequea si YA se jugo hoy -- por IP (funciona sin login) y por cuenta si
// hay una sesion activa. antes esto solo miraba la cuenta, por eso alguien
// sin loguearse podia rejugar infinitas veces con solo volver al inicio.
export async function checkGameStatus(user) {
  const headers = {};
  if (user) {
    const idToken = await user.getIdToken();
    headers.Authorization = `Bearer ${idToken}`;
  }
  const res = await fetch("/api/game-status", { headers });
  if (!res.ok) return false; // si el chequeo falla, no bloqueamos al usuario de jugar
  const data = await res.json();
  return Boolean(data.alreadyPlayed);
}

// se llama al terminar un run SIN estar logueado, para marcar la IP. si esta
// logueado no hace falta: api/submit-score.js ya marca IP + cuenta juntas.
export async function markPlayedAnonymously() {
  try {
    await fetch("/api/mark-played", { method: "POST" });
  } catch (err) {
    console.warn("no se pudo marcar el intento anonimo:", err);
  }
}

// { isGodUser: false } para cualquiera que no sea la cuenta especial.
// { isGodUser: true, enabled } para esa cuenta.
export async function getGodModeStatus(user) {
  if (!user) return { isGodUser: false };
  const idToken = await user.getIdToken();
  const res = await fetch("/api/god-mode", { headers: { Authorization: `Bearer ${idToken}` } });
  if (!res.ok) return { isGodUser: false };
  return res.json();
}

export async function setGodMode(user, enabled) {
  const idToken = await user.getIdToken();
  const res = await fetch("/api/god-mode", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error(`No se pudo cambiar el modo dios (${res.status})`);
  return res.json();
}

export async function getTopScores(topN = 10) {
  if (!firebaseReady) return [];
  const q = query(
    collection(db, SCORES_COLLECTION),
    orderBy("totalPoints", "desc"),
    orderBy("totalTimeMs", "asc"),
    limit(topN)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d, i) => ({ uid: d.id, rank: i + 1, ...d.data() }));
}

// firestore no tiene "rank" nativo asi que contamos cuanta gente le gana:
// mas puntos, o mismos puntos pero mas rapido (desempate invisible).
export async function getUserRank(uid) {
  if (!firebaseReady) return null;

  const userSnap = await getDoc(doc(db, SCORES_COLLECTION, uid));
  if (!userSnap.exists()) return null;

  const myScore = userSnap.data().totalPoints ?? 0;
  const myTime = userSnap.data().totalTimeMs ?? Number.MAX_SAFE_INTEGER;

  const [aheadByScore, tiedButFaster] = await Promise.all([
    getCountFromServer(query(collection(db, SCORES_COLLECTION), where("totalPoints", ">", myScore))),
    getCountFromServer(
      query(
        collection(db, SCORES_COLLECTION),
        where("totalPoints", "==", myScore),
        where("totalTimeMs", "<", myTime)
      )
    ),
  ]);

  return {
    uid,
    rank: aheadByScore.data().count + tiedButFaster.data().count + 1,
    totalPoints: myScore,
    displayName: userSnap.data().displayName,
    photoURL: userSnap.data().photoURL,
  };
}
