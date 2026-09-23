import { collection, doc, getCountFromServer, getDoc, orderBy, query, limit, getDocs, where } from "firebase/firestore";
import { db, firebaseReady } from "../firebase/client";

const SCORES_COLLECTION = "scores";

export class AlreadyPlayedTodayError extends Error {}

// el puntaje ya NO se escribe directo a firestore desde el cliente (mira
// firestore.rules: scores solo se puede leer, nunca escribir desde el
// browser). todo pasa por /api/submit-score, que valida el token, chequea
// "un intento guardado por dia" por usuario Y por IP, y recien ahi escribe
// con la Admin SDK. asi nadie puede inventarse un puntaje desde devtools.
export async function submitScore(user, score) {
  if (!firebaseReady || !user) return;

  const idToken = await user.getIdToken();
  let res;
  try {
    res = await fetch("/api/submit-score", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ score }),
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

export async function getTopScores(topN = 10) {
  if (!firebaseReady) return [];
  const q = query(collection(db, SCORES_COLLECTION), orderBy("totalPoints", "desc"), limit(topN));
  const snap = await getDocs(q);
  return snap.docs.map((d, i) => ({ uid: d.id, rank: i + 1, ...d.data() }));
}

// firestore no tiene "rank" nativo asi que contamos cuanta gente le gana.
// para un leaderboard chico esto sale gratis, si esto se vuelve el nuevo facebook
// habra que migrar a un contador desnormalizado
export async function getUserRank(uid) {
  if (!firebaseReady) return null;

  const userSnap = await getDoc(doc(db, SCORES_COLLECTION, uid));
  if (!userSnap.exists()) return null;

  const myScore = userSnap.data().totalPoints ?? 0;
  const aheadQuery = query(collection(db, SCORES_COLLECTION), where("totalPoints", ">", myScore));
  const aheadCount = await getCountFromServer(aheadQuery);

  return {
    uid,
    rank: aheadCount.data().count + 1,
    totalPoints: myScore,
    displayName: userSnap.data().displayName,
    photoURL: userSnap.data().photoURL,
  };
}
