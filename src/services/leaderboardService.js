import { collection, doc, getCountFromServer, getDoc, orderBy, query, limit, getDocs, where } from "firebase/firestore";
import { db, firebaseReady } from "../firebase/client";

const SCORES_COLLECTION = "scores";

export class AlreadyPlayedTodayError extends Error {}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

// el puntaje ya NO se escribe directo a firestore desde el cliente (mira
// firestore.rules: scores solo se puede leer, nunca escribir desde el
// browser). todo pasa por /api/submit-score, que valida el token, chequea
// "un intento guardado por dia" por usuario Y por IP, y recien ahi escribe
// con la Admin SDK. asi nadie puede inventarse un puntaje desde devtools.
export async function submitScore(user, score) {
  if (!firebaseReady || !user) return;

  const idToken = await user.getIdToken();
  const res = await fetch("/api/submit-score", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ score }),
  });

  if (res.status === 409) throw new AlreadyPlayedTodayError("You already have a saved score for today.");
  if (!res.ok) throw new Error(`No se pudo guardar el puntaje (${res.status})`);
}

// chequeo liviano para bloquear el juego ANTES de arrancar una ronda, no solo
// al momento de guardar. lee directo de firestore (permitido, "scores" es de
// lectura publica para usuarios logueados).
export async function hasPlayedToday(uid) {
  if (!firebaseReady || !uid) return false;
  const snap = await getDoc(doc(db, SCORES_COLLECTION, uid));
  if (!snap.exists()) return false;
  return snap.data().lastPlayedDate === todayUTC();
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
