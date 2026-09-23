// Marca la IP como "ya jugo hoy". Lo llama el cliente SOLO cuando termina el
// run sin estar logueado (si esta logueado, api/submit-score.js ya marca la
// IP y la cuenta juntas al guardar el puntaje).
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getClientIp, hashIp, todayUTC, getFirebaseApp } from "./_lib/ip.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method-not-allowed" });
    return;
  }

  const app = getFirebaseApp();
  const db = getFirestore(app);
  const today = todayUTC();
  const ip = getClientIp(req);
  const ipHash = hashIp(ip);

  let uid = null;
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (idToken) {
    try {
      uid = (await getAuth(app).verifyIdToken(idToken)).uid;
    } catch {
      uid = null;
    }
  }

  await db.collection("dailyIPs").doc(`${today}_${ipHash}`).set({ date: today, uid }, { merge: true });
  res.status(200).json({ ok: true });
}
