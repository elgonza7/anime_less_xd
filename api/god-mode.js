// GET: te dice si sos la cuenta especial y, si lo sos, el estado actual del
// toggle. POST: prende/apaga el toggle (rechazado si no sos esa cuenta).
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getFirebaseApp } from "./_lib/ip.js";
import { GOD_MODE_EMAIL, isGodModeActive } from "./_lib/godmode.js";

export default async function handler(req, res) {
  try {
    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!idToken) {
      res.status(401).json({ error: "missing-token" });
      return;
    }

    const app = getFirebaseApp();
    let decoded;
    try {
      decoded = await getAuth(app).verifyIdToken(idToken);
    } catch (err) {
      res.status(401).json({ error: "invalid-token", detail: err.message });
      return;
    }

    if (decoded.email !== GOD_MODE_EMAIL) {
      res.status(200).json({ isGodUser: false });
      return;
    }

    const db = getFirestore(app);

    if (req.method === "GET") {
      const enabled = await isGodModeActive(db, decoded);
      res.status(200).json({ isGodUser: true, enabled });
      return;
    }

    if (req.method === "POST") {
      const { enabled } = req.body || {};
      await db.collection("settings").doc("godMode").set({ enabled: Boolean(enabled) }, { merge: true });
      res.status(200).json({ isGodUser: true, enabled: Boolean(enabled) });
      return;
    }

    res.status(405).json({ error: "method-not-allowed" });
  } catch (err) {
    console.error("god-mode: error inesperado:", err);
    res.status(500).json({ error: "internal-error", detail: err.message });
  }
}
