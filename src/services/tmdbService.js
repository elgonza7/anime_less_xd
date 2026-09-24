// TMDB tiene fotogramas ("stills") por episodio, cosa que IMDb (nuestra
// fuente de ratings) no expone en su dataset. Como ya tenemos el tconst de
// IMDb de la serie (animeImdbSeed.js), usamos el endpoint "find" de TMDB
// para resolver el show sin tener que volver a buscar por nombre (y
// arriesgarnos a otro mismatch tipo Demon Slayer/Code Geass/Frieren).
//
// esto es 100% decorativo: si algo falla devolvemos null y roundBuilders.js
// usa el poster del anime como venia haciendo antes.
const API_BASE = "https://api.themoviedb.org/3";
const READ_TOKEN = import.meta.env.VITE_TMDB_READ_TOKEN;

const tvIdCache = new Map(); // tconst -> tmdbTvId | null
const stillCache = new Map(); // "tvId-season-episode" -> url | null

async function tmdbGet(path) {
  if (!READ_TOKEN) return null;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${READ_TOKEN}`, Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function resolveTmdbTvId(tconst) {
  if (tvIdCache.has(tconst)) return tvIdCache.get(tconst);

  const data = await tmdbGet(`/find/${tconst}?external_source=imdb_id`);
  const tvId = data?.tv_results?.[0]?.id ?? null;
  tvIdCache.set(tconst, tvId);
  return tvId;
}

// devuelve una url de imagen o null (nunca tira error)
export async function fetchEpisodeStill(tconst, season, episode) {
  const tvId = await resolveTmdbTvId(tconst);
  if (!tvId) return null;

  const cacheKey = `${tvId}-${season}-${episode}`;
  if (stillCache.has(cacheKey)) return stillCache.get(cacheKey);

  const data = await tmdbGet(`/tv/${tvId}/season/${season}/episode/${episode}`);
  const stillPath = data?.still_path ?? null;
  const url = stillPath ? `https://image.tmdb.org/t/p/w780${stillPath}` : null;
  stillCache.set(cacheKey, url);
  return url;
}
