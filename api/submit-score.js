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

import { createHash } from "node:crypto";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const CATEGORIES_COUNT = 4;
const ROUNDS_PER_CATEGORY = 5;
const MAX_SCORE = CATEGORIES_COUNT * ROUNDS_PER_CATEGORY;

function getApp() {
  if (getApps().length) return getApps()[0];
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  return initializeApp({ credential: cert(serviceAccount) });
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10); // "2026-09-23"
}

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

export default async function handler(req, res) {
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

  const { score } = req.body || {};
  if (typeof score !== "number" || score < 0 || score > MAX_SCORE || !Number.isInteger(score)) {
    res.status(400).json({ error: "invalid-score" });
    return;
  }

  const app = getApp();
  const db = getFirestore(app);

  let decoded;
  try {
    decoded = await getAuth(app).verifyIdToken(idToken);
  } catch {
    res.status(401).json({ error: "invalid-token" });
    return;
  }

  const uid = decoded.uid;
  const today = todayUTC();

  const scoreRef = db.collection("scores").doc(uid);
  const scoreSnap = await scoreRef.get();
  if (scoreSnap.exists && scoreSnap.data().lastPlayedDate === today) {
    res.status(409).json({ error: "already-played-today" });
    return;
  }

  const ip = clientIp(req);
  const ipHash = createHash("sha256").update(ip).digest("hex");
  const ipRef = db.collection("dailyIPs").doc(`${today}_${ipHash}`);
  const ipSnap = await ipRef.get();
  if (ipSnap.exists && ipSnap.data().uid !== uid) {
    res.status(409).json({ error: "already-played-today" });
    return;
  }

  await scoreRef.set(
    {
      displayName: decoded.name || "Anonymous",
      photoURL: decoded.picture || null,
      totalPoints: score,
      lastPlayedDate: today,
    },
    { merge: true }
  );
  await ipRef.set({ uid, date: today });

  res.status(200).json({ ok: true });
}
