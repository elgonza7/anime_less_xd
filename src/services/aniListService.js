import fallbackStats from "../data/animeStatsFallback.json";

// AniList (graphql.anilist.co) en vez de Jikan/MAL: en las pruebas de esta
// sesion Jikan se cayo en cadena varias veces (429/504) mientras AniList
// respondio siempre bien. Ademas AniList trae score+popularidad+imagen en
// UNA sola consulta GraphQL en vez de tener que pedir varios campos sueltos.
const API_URL = "https://graphql.anilist.co";
const QUERY = `
  query ($search: String) {
    Media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
      title { romaji english }
      coverImage { extraLarge large }
      meanScore
      popularity
    }
  }
`;

const fallbackByTitle = new Map(fallbackStats.map((e) => [e.seedTitle, e]));

// mismo patron que jikanService: si AniList empieza a fallar seguido,
// dejamos de insistir por un rato y usamos el snapshot local.
const COOLDOWN_MS = 15000;
let circuitOpenUntil = 0;
let consecutiveFailures = 0;

let lastCallAt = 0;
const MIN_GAP_MS = 300; // AniList es bastante mas permisivo que Jikan

function throttle() {
  const now = Date.now();
  const wait = Math.max(0, lastCallAt + MIN_GAP_MS - now);
  lastCallAt = now + wait;
  return new Promise((resolve) => setTimeout(resolve, wait));
}

const cache = new Map();
const inFlight = new Map();

function fallbackOrThrow(title, cause) {
  const entry = fallbackByTitle.get(title);
  if (entry) {
    return { title: entry.title, imageUrl: entry.imageUrl, score: entry.score, members: entry.members };
  }
  throw cause;
}

// devuelve { title, imageUrl, score (0-10), members (proxy: popularity) }
export async function fetchAnimeByTitle(title) {
  if (cache.has(title)) return cache.get(title);
  if (inFlight.has(title)) return inFlight.get(title);

  const promise = (async () => {
    if (Date.now() < circuitOpenUntil) {
      return fallbackOrThrow(title, new Error("AniList is cooling down after repeated errors"));
    }

    try {
      await throttle();
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: QUERY, variables: { search: title } }),
      });
      if (!res.ok) throw new Error(`AniList respondio ${res.status}`);

      const json = await res.json();
      const media = json.data?.Media;
      if (!media) throw new Error(`No se encontro "${title}" en AniList`);

      consecutiveFailures = 0;
      const parsed = {
        title: media.title.english || media.title.romaji,
        imageUrl: media.coverImage?.extraLarge || media.coverImage?.large,
        score: media.meanScore != null ? media.meanScore / 10 : null,
        members: media.popularity,
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
