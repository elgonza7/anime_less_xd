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
const seasonMapCache = new Map(); // tvId -> [{ season, episodeCount }] (sin specials), o null
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

async function getSeasonEpisodeCounts(tvId) {
  if (seasonMapCache.has(tvId)) return seasonMapCache.get(tvId);

  const data = await tmdbGet(`/tv/${tvId}`);
  const seasons =
    data?.seasons
      ?.filter((s) => s.season_number > 0)
      .sort((a, b) => a.season_number - b.season_number)
      .map((s) => ({ season: s.season_number, episodeCount: s.episode_count })) ?? null;
  seasonMapCache.set(tvId, seasons);
  return seasons;
}

// IMDb suele listar animes largos (One Piece, Naruto, HxH, Bleach, Detective
// Conan...) como una sola "Season 1" gigante con numeracion absoluta ("S1E100").
// TMDB separa esas mismas temporadas en temporadas reales mas chicas, PERO
// (al menos para HxH, verificado a mano contra la API) sigue usando la
// numeracion ABSOLUTA de episodio incluso dentro de esas temporadas: la
// temporada 2 arranca en el episodio 63, no en el 1. Osea que para encontrar
// el episodio 100 hay que ubicar EN QUE temporada cae ese numero absoluto,
// pero despues pedirlo con el mismo numero absoluto (no un offset relativo).
// Sin esto, "S1E100" le pega a un episodio que en TMDB no existe (404
// silencioso) y siempre cae al poster generico en vez de la escena real.
async function resolveRealSeasonEpisode(tvId, imdbSeason, imdbEpisode) {
  if (imdbSeason !== 1) return { season: imdbSeason, episode: imdbEpisode };

  const seasons = await getSeasonEpisodeCounts(tvId);
  if (!seasons || seasons.length === 0) return { season: imdbSeason, episode: imdbEpisode };

  let cursor = 0;
  for (const s of seasons) {
    cursor += s.episodeCount;
    if (imdbEpisode <= cursor) return { season: s.season, episode: imdbEpisode };
  }
  // no debería pasar (implicaria que IMDb tiene mas episodios que TMDB), pero
  // por las dudas probamos con los numeros originales antes de rendirnos.
  return { season: imdbSeason, episode: imdbEpisode };
}

// devuelve una url de imagen o null (nunca tira error)
export async function fetchEpisodeStill(tconst, season, episode) {
  const tvId = await resolveTmdbTvId(tconst);
  if (!tvId) return null;

  const cacheKey = `${tvId}-${season}-${episode}`;
  if (stillCache.has(cacheKey)) return stillCache.get(cacheKey);

  const real = await resolveRealSeasonEpisode(tvId, season, episode);
  const data = await tmdbGet(`/tv/${tvId}/season/${real.season}/episode/${real.episode}`);
  const stillPath = data?.still_path ?? null;
  const url = stillPath ? `https://image.tmdb.org/t/p/w780${stillPath}` : null;
  stillCache.set(cacheKey, url);
  return url;
}
