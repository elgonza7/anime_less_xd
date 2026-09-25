import { doc, getDoc } from "firebase/firestore";
import { db, firebaseReady } from "../firebase/client";
import { ANIME_IMDB_SEED } from "../data/animeImdbSeed";
import { seededRandomInt } from "../game/dailySeed";

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

export function pickRandomAnimeWithEpisodes(seedContext, attempt) {
  const entry = ANIME_IMDB_SEED[seededRandomInt(ANIME_IMDB_SEED.length, seedContext, "anime", attempt)];
  return entry;
}

// algunos datasets viejos (de antes de filtrar en scripts/update-episode-ratings.mjs)
// pueden tener season/episode "\N" de IMDb (-> NaN al parsear). los sacamos
// aca tambien por las dudas, sin esto rompian el label ("S{NaN}E...") y el
// mapeo de temporadas reales de TMDB en tmdbService.js.
function validEpisodes(episodes) {
  return episodes.filter((ep) => Number.isFinite(ep.season) && Number.isFinite(ep.episode));
}

export function pickRandomEpisode(episodes, seedContext, attempt) {
  const clean = validEpisodes(episodes);
  const withVotes = clean.filter((ep) => ep.votes >= 10);
  const pool = withVotes.length > 0 ? withVotes : clean;
  return pool[seededRandomInt(pool.length, seedContext, "episode", attempt)];
}

// posicion 1-based del episodio dentro del orden completo (season,episode)
// de la serie, ignorando entradas invalidas -- es lo que tmdbService.js usa
// para encontrar el episodio real en TMDB, cuya numeracion por temporada no
// siempre coincide con la de IMDb.
export function absoluteEpisodeIndex(episodes, episode) {
  const clean = validEpisodes(episodes);
  const idx = clean.findIndex((ep) => ep.tconst === episode.tconst);
  return idx === -1 ? null : idx + 1;
}
