import { fetchAnimeByTitle } from "../services/aniListService";
import { fetchVideoStats } from "../services/youtubeService";
import { resolveOpening } from "../services/openingsCacheService";
import { fetchEpisodesFor, pickRandomAnimeWithEpisodes, pickRandomEpisode } from "../services/episodeService";
import { ANIME_TITLES_SEED } from "../data/animeTitlesSeed";
import { ANIME_IMDB_SEED } from "../data/animeImdbSeed";
import { OPENINGS_CATALOG } from "../data/openingsCatalog";
import { seededRandomInt } from "./dailySeed";

export class EpisodesNotReadyError extends Error {}

// a veces AniList se cae para un titulo puntual pero anda bien para el
// resto. en vez de reventar la ronda, probamos con otro anime del pool.
// seedContext identifica ESTE pick puntual (categoria+ronda+lado) para que
// sea reproducible sin depender de cuantas veces se llamo antes.
async function pickWorkingAnime(candidateTitles, seedContext) {
  const pool = [...candidateTitles];
  let attempt = 0;
  while (pool.length > 0) {
    const idx = seededRandomInt(pool.length, seedContext, attempt);
    const seedTitle = pool.splice(idx, 1)[0];
    try {
      const data = await fetchAnimeByTitle(seedTitle);
      return { seedTitle, data };
    } catch {
      attempt += 1; // probamos el siguiente
    }
  }
  return null;
}

function unusedPool(fullList, usedKeys) {
  const pool = fullList.filter((t) => !usedKeys.has(t));
  return pool.length > 0 ? pool : fullList;
}

// --- cada fetcher trae UNA sola entrada nueva, no un par. el "juego de las
// cadenas" (el ganador se queda a la izquierda, entra un desafiante nuevo a
// la derecha) lo maneja useGame, no esto. `seedContext` (ej: "rating:r3:right")
// lo arma useGame y hace que el pick sea 100% reproducible ese dia. ---

export async function fetchRatingEntry(usedKeys, seedContext) {
  const picked = await pickWorkingAnime(unusedPool(ANIME_TITLES_SEED, usedKeys), seedContext);
  if (!picked) throw new Error("AniList isn't responding right now, try again in a bit.");
  return {
    itemKey: picked.seedTitle,
    label: picked.data.title,
    imageUrl: picked.data.imageUrl,
    value: picked.data.score ?? 0,
    statIcon: "⭐",
    statDecimals: 2,
  };
}

export async function fetchFandomEntry(usedKeys, seedContext) {
  const picked = await pickWorkingAnime(unusedPool(ANIME_TITLES_SEED, usedKeys), seedContext);
  if (!picked) throw new Error("AniList isn't responding right now, try again in a bit.");
  return {
    itemKey: picked.seedTitle,
    label: picked.data.title,
    imageUrl: picked.data.imageUrl,
    value: picked.data.members ?? 0,
    statIcon: "👥",
    statUnit: " members",
  };
}

export async function fetchOpeningEntry(usedKeys, seedContext) {
  const pool = unusedPool(OPENINGS_CATALOG, usedKeys).filter((o) => !usedKeys.has(o.key));
  const list = pool.length > 0 ? pool : OPENINGS_CATALOG;
  const catalogEntry = list[seededRandomInt(list.length, seedContext)];

  // resolveOpening solo pega a youtube "search" (caro) la primera vez que se
  // pide ese opening puntual; despues queda cacheado en Firestore para siempre.
  const opening = await resolveOpening(catalogEntry);
  const stats = await fetchVideoStats(opening.videoId);

  return {
    itemKey: catalogEntry.key,
    label: `${opening.anime} — ${opening.opening}`,
    imageUrl: stats.thumbnail,
    value: stats.viewCount,
    statIcon: "▶️",
    statUnit: " views",
  };
}

export async function fetchEpisodeEntry(usedKeys, seedContext) {
  if (ANIME_IMDB_SEED.length < 1) throw new EpisodesNotReadyError("No anime configured with an IMDb tconst yet.");

  let attempts = 0;
  while (attempts < 12) {
    const entry = pickRandomAnimeWithEpisodes(seedContext, attempts);
    const data = await fetchEpisodesFor(entry);
    if (!data || !data.episodes?.length) {
      attempts += 1;
      if (attempts >= 12) throw new EpisodesNotReadyError(`No episode data yet for "${entry.anime}".`);
      continue;
    }

    const episode = pickRandomEpisode(data.episodes, seedContext, attempts);
    if (usedKeys.has(episode.tconst)) {
      attempts += 1;
      continue;
    }

    const animeInfo = await fetchAnimeByTitle(entry.anime).catch(() => null);
    return {
      itemKey: episode.tconst,
      label: `${entry.anime} — S${episode.season}E${episode.episode}`,
      imageUrl: animeInfo?.imageUrl,
      value: episode.rating,
      statIcon: "⭐",
      statDecimals: 1,
    };
  }
  throw new EpisodesNotReadyError("Couldn't find a fresh episode to compare.");
}

export const ENTRY_FETCHERS = {
  rating: fetchRatingEntry,
  fandom: fetchFandomEntry,
  opening: fetchOpeningEntry,
  episode: fetchEpisodeEntry,
};
