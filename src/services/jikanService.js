import fallbackStats from "../data/animeStatsFallback.json";

const BASE_URL = "https://api.jikan.moe/v4";
const fallbackByTitle = new Map(fallbackStats.map((e) => [e.seedTitle, e]));

// jikan (la api de MAL) es un servicio comunitario gratis: cuando se satura tira
// 429/504 en cadena para TODO, no solo para un titulo puntual. Insistir ahi solo
// empeora las cosas, asi que usamos un circuit breaker: despues de un par de
// fallos seguidos, dejamos de pegarle a la red por un rato y usamos el snapshot
// local (src/data/animeStatsFallback.json) para que el juego nunca se rompa.
const COOLDOWN_MS = 15000;
let circuitOpenUntil = 0;
let consecutiveFailures = 0;

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

async function fetchWithRetry(url, { retries = 1, baseDelayMs = 500 } = {}) {
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

function fallbackOrThrow(title, cause) {
  const entry = fallbackByTitle.get(title);
  if (entry) {
    return { malId: null, title: entry.title, imageUrl: entry.imageUrl, score: entry.score, members: entry.members };
  }
  throw cause;
}

// devuelve { malId, title, imageUrl, score, scoredBy, members, favorites }
export async function fetchAnimeByTitle(title) {
  if (cache.has(title)) return cache.get(title);
  if (inFlight.has(title)) return inFlight.get(title);

  const promise = (async () => {
    if (Date.now() < circuitOpenUntil) {
      return fallbackOrThrow(title, new Error("Jikan is cooling down after repeated errors"));
    }

    try {
      const res = await fetchWithRetry(`${BASE_URL}/anime?q=${encodeURIComponent(title)}&limit=1`);
      const json = await res.json();
      const anime = json.data?.[0];
      if (!anime) throw new Error(`No se encontro "${title}" en Jikan`);

      consecutiveFailures = 0;
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
    } catch (err) {
      consecutiveFailures += 1;
      if (consecutiveFailures >= 2) {
        circuitOpenUntil = Date.now() + COOLDOWN_MS;
      }
      return fallbackOrThrow(title, err);
    }
  })();

  inFlight.set(title, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(title);
  }
}
