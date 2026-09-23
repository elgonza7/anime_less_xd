const BASE_URL = "https://api.jikan.moe/v4";

// jikan pide no pasar de 3 req/seg (y 60/min). con esta cola simple no la rompemos,
// pero la api publica de jikan a veces tira 429/504 igual con tráfico normal,
// por eso el retry con backoff de abajo.
let lastCallAt = 0;
const MIN_GAP_MS = 500;

function throttle() {
  const now = Date.now();
  const wait = Math.max(0, lastCallAt + MIN_GAP_MS - now);
  lastCallAt = now + wait;
  return new Promise((resolve) => setTimeout(resolve, wait));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, { retries = 3, baseDelayMs = 700 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    await throttle();
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (res.status !== 429 && res.status < 500) {
        throw new Error(`Jikan respondio ${res.status}`);
      }
      lastError = new Error(`Jikan respondio ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await sleep(baseDelayMs * 2 ** attempt);
  }
  throw lastError;
}

const cache = new Map();
const inFlight = new Map();

// devuelve { malId, title, imageUrl, score, scoredBy, members, favorites }
export async function fetchAnimeByTitle(title) {
  if (cache.has(title)) return cache.get(title);
  if (inFlight.has(title)) return inFlight.get(title);

  const promise = (async () => {
    const res = await fetchWithRetry(`${BASE_URL}/anime?q=${encodeURIComponent(title)}&limit=1`);
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
  })();

  inFlight.set(title, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(title);
  }
}
