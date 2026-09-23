// Chequea si YA se jugo hoy, por IP (para cualquiera, con o sin cuenta) y
// tambien por cuenta si viene un token. Publico a proposito: el juego se
// puede jugar sin login, asi que este chequeo tiene que funcionar sin login
// tambien (antes solo se chequeaba la cuenta, por eso alguien sin loguearse
// podia rejugar infinitas veces con solo tocar "volver al inicio").
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getClientIp, hashIp, todayUTC, getFirebaseApp } from "./_lib/ip.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method-not-allowed" });
    return;
  }

  const app = getFirebaseApp();
  const db = getFirestore(app);
  const today = todayUTC();

  const ip = getClientIp(req);
  const ipHash = hashIp(ip);
  const ipSnap = await db.collection("dailyIPs").doc(`${today}_${ipHash}`).get();
  if (ipSnap.exists) {
    res.status(200).json({ alreadyPlayed: true });
    return;
  }

  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (idToken) {
    try {
      const decoded = await getAuth(app).verifyIdToken(idToken);
      const scoreSnap = await db.collection("scores").doc(decoded.uid).get();
      if (scoreSnap.exists && scoreSnap.data().lastPlayedDate === today) {
        res.status(200).json({ alreadyPlayed: true });
        return;
      }
    } catch {
      // token invalido/vencido -> lo tratamos como anonimo, ya chequeamos la IP arriba
    }
  }

  res.status(200).json({ alreadyPlayed: false });
}
