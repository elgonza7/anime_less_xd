import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, firebaseReady } from "../firebase/client";
import { searchOfficialVideo } from "./youtubeService";

const COLLECTION = "openingsCache";
const memoryCache = new Map(); // evita releer Firestore para el mismo opening dentro de la misma sesion

// si ya esta resuelto (en memoria o en Firestore), lo devuelve gratis.
// si no, lo busca en YouTube UNA vez (100 units) y lo guarda para siempre,
// asi la proxima persona que lo necesite ya lo encuentra cacheado.
export async function resolveOpening(catalogEntry) {
  if (memoryCache.has(catalogEntry.key)) return memoryCache.get(catalogEntry.key);

  if (firebaseReady) {
    const ref = doc(db, COLLECTION, catalogEntry.key);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      memoryCache.set(catalogEntry.key, data);
      return data;
    }
  }

  const found = await searchOfficialVideo(catalogEntry.query);
  const resolved = {
    anime: catalogEntry.anime,
    opening: catalogEntry.opening,
    videoId: found.videoId,
    thumbnail: found.thumbnail,
    resolvedTitle: found.resolvedTitle,
    resolvedAt: Date.now(),
  };

  memoryCache.set(catalogEntry.key, resolved);
  if (firebaseReady) {
    setDoc(doc(db, COLLECTION, catalogEntry.key), resolved).catch((err) =>
      console.warn("no se pudo cachear el opening en Firestore:", err)
    );
  }
  return resolved;
}
