import { collection, orderBy, query, limit, getDocs, where } from "firebase/firestore";
import { db, firebaseReady } from "../firebase/client";
import { getTodayUTC } from "../game/dailySeed";

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

// el leaderboard que se muestra apenas terminas de jugar (y la pestaña
// "Today" del leaderboard) tiene que ser SOLO gente que jugo HOY -- sin este
// filtro, alguien que jugo ayer y no volvio a jugar seguia apareciendo con
// el puntaje de ayer para siempre, porque "scores/{uid}" guarda el puntaje
// MAS RECIENTE de cada cuenta, no un historial. Traemos hasta 200 (de sobra
// para un juego chico) en un solo query y calculamos el rank en el cliente
// en vez de hacer 2 queries de conteo aparte -- mas simple y un index menos.
async function fetchTodayScores() {
  if (!firebaseReady) return [];
  const today = getTodayUTC();
  const q = query(
    collection(db, SCORES_COLLECTION),
    where("lastPlayedDate", "==", today),
    orderBy("totalPoints", "desc"),
    orderBy("totalTimeMs", "asc"),
    limit(200)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d, i) => ({ uid: d.id, rank: i + 1, ...d.data() }));
}

// { top, myRank } para el leaderboard de HOY. myRank es null si "uid" no
// jugo hoy (o no se paso uid, para alguien sin cuenta -- ver
// getHypotheticalTodayRank para ese caso).
export async function getTodayLeaderboard(uid, topN = 10) {
  const all = await fetchTodayScores();
  const top = all.slice(0, topN);
  const myRank = uid ? (all.find((r) => r.uid === uid) ?? null) : null;
  return { top, myRank };
}

// mismo leaderboard de hoy, pero para alguien que jugo SIN cuenta: no hay
// fila guardada que buscar, asi que calculamos donde quedaria comparando su
// puntaje contra los que ya estan.
export async function getHypotheticalTodayRank(score, totalTimeMs) {
  const all = await fetchTodayScores();
  const myTime = typeof totalTimeMs === "number" ? totalTimeMs : Number.MAX_SAFE_INTEGER;
  let rank = 1;
  for (const row of all) {
    if (row.totalPoints > score || (row.totalPoints === score && row.totalTimeMs < myTime)) rank++;
  }
  return { top: all.slice(0, 10), myRank: { rank, totalPoints: score } };
}

// leaderboard "historico": el mejor puntaje que CADA cuenta logro alguna vez
// (bestPoints/bestTimeMs, ver api/submit-score.js), no las corridas de cada
// dia por separado -- mucho mas liviano de guardar y de consultar, y sigue
// respondiendo "cual es el mejor puntaje que se vio en el juego" sin necesidad de
// borrar nada. limitado a 5 a proposito (pedido explicito: si guardar mas
// historial es pesado, mejor simplificarlo a esto).
export async function getAllTimeTop(topN = 5) {
  if (!firebaseReady) return [];
  const q = query(
    collection(db, SCORES_COLLECTION),
    orderBy("bestPoints", "desc"),
    orderBy("bestTimeMs", "asc"),
    limit(topN)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d, i) => {
    const data = d.data();
    return {
      uid: d.id,
      rank: i + 1,
      displayName: data.displayName,
      photoURL: data.photoURL,
      totalPoints: data.bestPoints,
      totalTimeMs: data.bestTimeMs,
    };
  });
}
