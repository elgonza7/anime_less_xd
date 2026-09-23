import { fetchAnimeByTitle } from "../services/jikanService";
import { fetchVideoStats } from "../services/youtubeService";
import { fetchEpisodesFor, pickRandomAnimeWithEpisodes, pickRandomEpisode } from "../services/episodeService";
import { ANIME_TITLES_SEED } from "../data/animeTitlesSeed";
import { ANIME_IMDB_SEED } from "../data/animeImdbSeed";
import openingsSeed from "../data/openingsSeed.json";
import { pickTwoDistinct } from "./utils";

export class EpisodesNotReadyError extends Error {}

const fmt = (n) => (n || n === 0 ? n.toLocaleString("en-US") : "?");

export async function buildRatingRound(usedTitles) {
  const pool = ANIME_TITLES_SEED.filter((t) => !usedTitles.has(t));
  const [titleA, titleB] = pickTwoDistinct(pool.length >= 2 ? pool : ANIME_TITLES_SEED);
  const [a, b] = await Promise.all([fetchAnimeByTitle(titleA), fetchAnimeByTitle(titleB)]);

  return {
    usedKeys: [titleA, titleB],
    left: { label: a.title, subLabel: `⭐ ${fmt(a.score)}`, imageUrl: a.imageUrl, value: a.score ?? 0 },
    right: { label: b.title, subLabel: `⭐ ${fmt(b.score)}`, imageUrl: b.imageUrl, value: b.score ?? 0 },
  };
}

export async function buildFandomRound(usedTitles) {
  const pool = ANIME_TITLES_SEED.filter((t) => !usedTitles.has(t));
  const [titleA, titleB] = pickTwoDistinct(pool.length >= 2 ? pool : ANIME_TITLES_SEED);
  const [a, b] = await Promise.all([fetchAnimeByTitle(titleA), fetchAnimeByTitle(titleB)]);

  return {
    usedKeys: [titleA, titleB],
    left: { label: a.title, subLabel: `👥 ${fmt(a.members)} members`, imageUrl: a.imageUrl, value: a.members ?? 0 },
    right: { label: b.title, subLabel: `👥 ${fmt(b.members)} members`, imageUrl: b.imageUrl, value: b.members ?? 0 },
  };
}

export async function buildOpeningRound(usedIds) {
  const pool = openingsSeed.filter((o) => !usedIds.has(o.videoId));
  const [opA, opB] = pickTwoDistinct(pool.length >= 2 ? pool : openingsSeed);
  const [statsA, statsB] = await Promise.all([fetchVideoStats(opA.videoId), fetchVideoStats(opB.videoId)]);

  return {
    usedKeys: [opA.videoId, opB.videoId],
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
