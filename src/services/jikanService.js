const BASE_URL = "https://api.jikan.moe/v4";

// jikan pide no pasar de 3 req/seg (y 60/min). con esta cola simple nunca la rompemos.
let lastCallAt = 0;
const MIN_GAP_MS = 400;

function throttle() {
  const now = Date.now();
  const wait = Math.max(0, lastCallAt + MIN_GAP_MS - now);
  lastCallAt = now + wait;
  return new Promise((resolve) => setTimeout(resolve, wait));
}

const cache = new Map();

// devuelve { malId, title, imageUrl, score, scoredBy, members, favorites }
export async function fetchAnimeByTitle(title) {
  if (cache.has(title)) return cache.get(title);

  await throttle();
  const res = await fetch(`${BASE_URL}/anime?q=${encodeURIComponent(title)}&limit=1`);
  if (!res.ok) throw new Error(`Jikan respondio ${res.status} para "${title}"`);

  const json = await res.json();
  const anime = json.data?.[0];
  if (!anime) throw new Error(`No se encontro "${title}" en Jikan`);

  const parsed = {
    malId: anime.mal_id,
    title: anime.title_english || anime.title,
    imageUrl: anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url,
    score: anime.score,
    scoredBy: anime.scored_by,
    members: anime.members,
    favorites: anime.favorites,
  };

  cache.set(title, parsed);
  return parsed;
}

export async function fetchManyByTitle(titles) {
  const results = [];
  for (const title of titles) {
    results.push(await fetchAnimeByTitle(title));
  }
  return results;
}
