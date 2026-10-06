import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, firebaseReady } from "../firebase/client";
import { searchOfficialVideo } from "./youtubeService";

const COLLECTION = "openingsCache";
// version del criterio de eleccion del video. los docs cacheados con una
// version menor (elegidos como "primer resultado") se vuelven a resolver la
// primera vez que se usan, ahora quedandose con el video oficial mas visto.
const RANK_VERSION = 2;
const memoryCache = new Map(); // evita releer Firestore para el mismo opening dentro de la misma sesion

// si ya esta resuelto (en memoria o en Firestore), lo devuelve gratis.
// si no, lo busca en YouTube UNA vez (100 units) y lo guarda para siempre,
// asi la proxima persona que lo necesite ya lo encuentra cacheado.
export async function resolveOpening(catalogEntry) {
  if (memoryCache.has(catalogEntry.key)) return memoryCache.get(catalogEntry.key);

  let stale = null;
  if (firebaseReady) {
    try {
      const ref = doc(db, COLLECTION, catalogEntry.key);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        if ((data.rankVersion ?? 1) >= RANK_VERSION) {
          memoryCache.set(catalogEntry.key, data);
          return data;
        }
        stale = data;
      }
    } catch (err) {
      // reglas sin deployar, offline, etc. -> seguimos y resolvemos en vivo igual
      console.warn(`no se pudo leer ${COLLECTION}/${catalogEntry.key}:`, err.message);
    }
  }

  let found;
  try {
    found = await searchOfficialVideo([
      catalogEntry.query,
      catalogEntry.query.replace(/"/g, ""),
      `${catalogEntry.anime} ${catalogEntry.opening} opening`,
    ]);
  } catch (err) {
    // si no se pudo re-resolver, mejor el video viejo que ninguno
    if (stale) {
      memoryCache.set(catalogEntry.key, stale);
      return stale;
    }
    throw err;
  }
  const resolved = {
    anime: catalogEntry.anime,
    opening: catalogEntry.opening,
    videoId: found.videoId,
    thumbnail: found.thumbnail,
    resolvedTitle: found.resolvedTitle,
    resolvedAt: Date.now(),
    rankVersion: RANK_VERSION,
  };

  memoryCache.set(catalogEntry.key, resolved);
  if (firebaseReady) {
    setDoc(doc(db, COLLECTION, catalogEntry.key), resolved).catch((err) =>
      console.warn("no se pudo cachear el opening en Firestore:", err)
    );
  }
  return resolved;
}
