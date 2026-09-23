import { fetchAnimeByTitle } from "../services/jikanService";
import { fetchVideoStats } from "../services/youtubeService";
import { resolveOpening } from "../services/openingsCacheService";
import { fetchEpisodesFor, pickRandomAnimeWithEpisodes, pickRandomEpisode } from "../services/episodeService";
import { ANIME_TITLES_SEED } from "../data/animeTitlesSeed";
import { ANIME_IMDB_SEED } from "../data/animeImdbSeed";
import { OPENINGS_CATALOG } from "../data/openingsCatalog";
import { pickTwoDistinct } from "./utils";

export class EpisodesNotReadyError extends Error {}

const fmt = (n) => (n || n === 0 ? n.toLocaleString("en-US") : "?");

// jikan (la api de MAL) a veces se cae para un titulo puntual pero anda bien para el
// resto. en vez de reventar toda la ronda, probamos con otro anime del pool.
async function pickWorkingAnime(candidateTitles) {
  const pool = [...candidateTitles];
  while (pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    const seedTitle = pool.splice(idx, 1)[0];
    try {
      const data = await fetchAnimeByTitle(seedTitle);
      return { seedTitle, data };
    } catch {
      // probamos el siguiente
    }
  }
  return null;
}

async function pickAnimePair(usedTitles) {
  const pool = ANIME_TITLES_SEED.filter((t) => !usedTitles.has(t));
  const basePool = pool.length >= 2 ? pool : [...ANIME_TITLES_SEED];

  const first = await pickWorkingAnime(basePool);
  if (!first) throw new Error("MyAnimeList isn't responding right now, try again in a bit.");

  const secondPool = basePool.filter((t) => t !== first.seedTitle);
  const second = await pickWorkingAnime(
    secondPool.length > 0 ? secondPool : ANIME_TITLES_SEED.filter((t) => t !== first.seedTitle)
  );
  if (!second) throw new Error("MyAnimeList isn't responding right now, try again in a bit.");

  return [first, second];
}

export async function buildRatingRound(usedTitles) {
  const [a, b] = await pickAnimePair(usedTitles);

  return {
    usedKeys: [a.seedTitle, b.seedTitle],
    left: { label: a.data.title, subLabel: `⭐ ${fmt(a.data.score)}`, imageUrl: a.data.imageUrl, value: a.data.score ?? 0 },
    right: { label: b.data.title, subLabel: `⭐ ${fmt(b.data.score)}`, imageUrl: b.data.imageUrl, value: b.data.score ?? 0 },
  };
}

export async function buildFandomRound(usedTitles) {
  const [a, b] = await pickAnimePair(usedTitles);

  return {
    usedKeys: [a.seedTitle, b.seedTitle],
    left: {
      label: a.data.title,
      subLabel: `👥 ${fmt(a.data.members)} members`,
      imageUrl: a.data.imageUrl,
      value: a.data.members ?? 0,
    },
    right: {
      label: b.data.title,
      subLabel: `👥 ${fmt(b.data.members)} members`,
      imageUrl: b.data.imageUrl,
      value: b.data.members ?? 0,
    },
  };
}

export async function buildOpeningRound(usedKeys) {
  const pool = OPENINGS_CATALOG.filter((o) => !usedKeys.has(o.key));
  const [catalogA, catalogB] = pickTwoDistinct(pool.length >= 2 ? pool : OPENINGS_CATALOG);

  // resolveOpening solo pega a youtube "search" (caro) la primera vez que se
  // pide ese opening puntual; despues queda cacheado en Firestore para siempre.
  const [opA, opB] = await Promise.all([resolveOpening(catalogA), resolveOpening(catalogB)]);
  const [statsA, statsB] = await Promise.all([fetchVideoStats(opA.videoId), fetchVideoStats(opB.videoId)]);

  return {
    usedKeys: [catalogA.key, catalogB.key],
    left: {
      label: `${opA.anime} — ${opA.opening}`,
      subLabel: `▶️ ${fmt(statsA.viewCount)} views`,
      imageUrl: statsA.thumbnail,
      value: statsA.viewCount,
    },
    right: {
      label: `${opB.anime} — ${opB.opening}`,
      subLabel: `▶️ ${fmt(statsB.viewCount)} views`,
      imageUrl: statsB.thumbnail,
      value: statsB.viewCount,
    },
  };
}

async function buildEpisodeSide() {
  const entry = pickRandomAnimeWithEpisodes();
  const data = await fetchEpisodesFor(entry);
  if (!data || !data.episodes?.length) {
    throw new EpisodesNotReadyError(`No episode data yet for "${entry.anime}".`);
  }

  const episode = pickRandomEpisode(data.episodes);
  const animeInfo = await fetchAnimeByTitle(entry.anime).catch(() => null);

  return {
    key: episode.tconst,
    label: `${entry.anime} — S${episode.season}E${episode.episode}`,
    subLabel: `⭐ ${episode.rating} (${fmt(episode.votes)} IMDb votes)`,
    imageUrl: animeInfo?.imageUrl,
    value: episode.rating,
  };
}

export async function buildEpisodeRound(usedKeys) {
  if (ANIME_IMDB_SEED.length < 2) throw new EpisodesNotReadyError("No anime configured with an IMDb tconst yet.");

  let left = await buildEpisodeSide();
  let right = await buildEpisodeSide();
  let attempts = 0;
  while ((left.key === right.key || usedKeys.has(left.key) || usedKeys.has(right.key)) && attempts < 10) {
    right = await buildEpisodeSide();
    attempts += 1;
  }

  return { usedKeys: [left.key, right.key], left, right };
}
