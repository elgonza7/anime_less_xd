// Vercel serverless function. Todos los puntajes pasan por aca (el cliente ya
// NO puede escribir directo a Firestore, ver firestore.rules) para que:
//   1. nadie pueda inventarse un puntaje desde la consola del navegador
//      (ahora lo valida el server con la Admin SDK, no las Firestore rules)
//   2. se respete "un intento guardado por dia" por usuario Y por IP, asi
//      alguien no se loguea de nuevo en incognito para resubir mejor puntaje.
//
// Necesita la env var FIREBASE_SERVICE_ACCOUNT en Vercel (Project Settings ->
// Environment Variables), con el mismo JSON de cuenta de servicio que se usa
// para el workflow de GitHub Actions. Ver SETUP.md.

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getClientIp, hashIp, todayUTC, getFirebaseApp } from "./_lib/ip.js";
import { isGodModeActive } from "./_lib/godmode.js";

const CATEGORIES_COUNT = 4;
const ROUNDS_PER_CATEGORY = 5;
const MAX_SCORE = CATEGORIES_COUNT * ROUNDS_PER_CATEGORY;
const TOTAL_ROUNDS = CATEGORIES_COUNT * ROUNDS_PER_CATEGORY;
const MIN_PLAUSIBLE_MS = TOTAL_ROUNDS * 300; // ~300ms minimo de reaccion humana por ronda

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "method-not-allowed" });
      return;
    }

    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!idToken) {
      res.status(401).json({ error: "missing-token" });
      return;
    }

    const { score, totalTimeMs } = req.body || {};
    if (typeof score !== "number" || score < 0 || score > MAX_SCORE || !Number.isInteger(score)) {
      res.status(400).json({ error: "invalid-score" });
      return;
    }

    // desempate invisible por tiempo total de la partida (mas rapido gana
    // si el puntaje quedo empatado). si el numero que manda el cliente no es
    // creible, lo mandamos al fondo de la cola en vez de premiarlo.
    const safeTimeMs =
      typeof totalTimeMs === "number" && totalTimeMs >= MIN_PLAUSIBLE_MS ? Math.round(totalTimeMs) : Number.MAX_SAFE_INTEGER;

    const app = getFirebaseApp();
    const db = getFirestore(app);

    let decoded;
    try {
      decoded = await getAuth(app).verifyIdToken(idToken);
    } catch (err) {
      console.error("submit-score: verifyIdToken fallo:", err.message);
      res.status(401).json({ error: "invalid-token", detail: err.message });
      return;
    }

    const uid = decoded.uid;
    const today = todayUTC();
    const godActive = await isGodModeActive(db, decoded);

    const scoreRef = db.collection("scores").doc(uid);
    const scoreSnap = await scoreRef.get();
    const prev = scoreSnap.exists ? scoreSnap.data() : null;

    if (!godActive && prev?.lastPlayedDate === today) {
      res.status(409).json({ error: "already-played-today" });
      return;
    }

    const ip = getClientIp(req);
    const ipHash = hashIp(ip);
    const ipRef = db.collection("dailyIPs").doc(`${today}_${ipHash}`);

    if (!godActive) {
      const ipSnap = await ipRef.get();
      // si la IP ya jugo hoy con OTRA cuenta, bloqueamos. si jugo anonima
      // (uid null, ver api/mark-played.js) dejamos pasar: es probablemente la
      // misma persona iniciando sesion recien despues de terminar su unica
      // corrida del dia, no un replay.
      if (ipSnap.exists && ipSnap.data().uid && ipSnap.data().uid !== uid) {
        res.status(409).json({ error: "already-played-today" });
        return;
      }
    }

    // "totalPoints"/"totalTimeMs" son SIEMPRE el puntaje de la corrida mas
    // reciente (se pisan cada dia) -- eso es lo que arma el leaderboard de
    // HOY (filtrado por lastPlayedDate, ver leaderboardService.js). Aparte,
    // "bestPoints"/"bestTimeMs" son el record personal de esta cuenta, que
    // solo se actualiza si esta corrida lo mejora, y persiste aunque un dia
    // despues juegue peor -- eso es lo que arma el leaderboard "historico"
    // (mejores puntajes de siempre), sin necesidad de guardar cada corrida
    // de cada dia por separado.
    const prevBest = prev?.bestPoints ?? -1;
    const prevBestTime = prev?.bestTimeMs ?? Number.MAX_SAFE_INTEGER;
    const isNewBest = score > prevBest || (score === prevBest && safeTimeMs < prevBestTime);

    await scoreRef.set(
      {
        displayName: decoded.name || "Anonymous",
        photoURL: decoded.picture || null,
        totalPoints: score,
        totalTimeMs: safeTimeMs,
        lastPlayedDate: today,
        ...(isNewBest ? { bestPoints: score, bestTimeMs: safeTimeMs, bestDate: today } : {}),
      },
      { merge: true }
    );
    await ipRef.set({ uid, date: today });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("submit-score: error inesperado:", err);
    res.status(500).json({ error: "internal-error", detail: err.message });
  }
}
