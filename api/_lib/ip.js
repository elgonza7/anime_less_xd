// helper compartido entre las funciones de api/. archivos bajo _lib/ no se
// exponen como endpoints propios en Vercel (por la barra baja), solo se
// importan.
import { createHash } from "node:crypto";
import { initializeApp, getApps, cert } from "firebase-admin/app";

export function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

export function hashIp(ip) {
  return createHash("sha256").update(ip).digest("hex");
}

// el "dia de juego" resetea a las 8am hora Argentina (UTC-3, sin horario de
// verano) = 11:00 UTC, no a medianoche UTC. Restamos 11hs antes de sacar la
// fecha: asi todo lo que pase antes de las 8am ART todavia cuenta como "ayer".
const RESET_UTC_HOUR = 11;

export function todayUTC() {
  const shifted = new Date(Date.now() - RESET_UTC_HOUR * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

export function getFirebaseApp() {
  if (getApps().length) return getApps()[0];
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  return initializeApp({ credential: cert(serviceAccount) });
}
