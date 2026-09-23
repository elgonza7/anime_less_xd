import { doc, getDoc } from "firebase/firestore";
import { db, firebaseReady } from "../firebase/client";
import { ANIME_IMDB_SEED } from "../data/animeImdbSeed";

const cache = new Map();

// devuelve { anime, updatedAt, episodes: [{season, episode, rating, votes}] }
// o null si la Cloud Function todavia no corrio para ese anime.
export async function fetchEpisodesFor(animeEntry) {
  if (!firebaseReady) return null;
  if (cache.has(animeEntry.tconst)) return cache.get(animeEntry.tconst);

  let data = null;
  try {
    const snap = await getDoc(doc(db, "episodeRatings", animeEntry.tconst));
    data = snap.exists() ? snap.data() : null;
  } catch (err) {
    // reglas de Firestore sin deployar, base sin crear, offline, etc. -> tratamos
    // igual que "todavia no hay datos", el juego salta la categoria sola.
    console.warn(`no se pudo leer episodeRatings/${animeEntry.tconst}:`, err.message);
  }
  cache.set(animeEntry.tconst, data);
  return data;
}

export function pickRandomAnimeWithEpisodes() {
  const entry = ANIME_IMDB_SEED[Math.floor(Math.random() * ANIME_IMDB_SEED.length)];
  return entry;
}

export function pickRandomEpisode(episodes) {
  const withVotes = episodes.filter((ep) => ep.votes >= 10);
  const pool = withVotes.length > 0 ? withVotes : episodes;
  return pool[Math.floor(Math.random() * pool.length)];
}
