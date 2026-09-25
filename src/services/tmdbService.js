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
const seasonCountsCache = new Map(); // tvId -> [{ season, episodeCount }] | null
const seasonEpisodesCache = new Map(); // "tvId-season" -> [{still_path}] | null

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
  if (seasonCountsCache.has(tvId)) return seasonCountsCache.get(tvId);

  const data = await tmdbGet(`/tv/${tvId}`);
  const seasons =
    data?.seasons
      ?.filter((s) => s.season_number > 0)
      .sort((a, b) => a.season_number - b.season_number)
      .map((s) => ({ season: s.season_number, episodeCount: s.episode_count })) ?? null;
  seasonCountsCache.set(tvId, seasons);
  return seasons;
}

async function getSeasonEpisodes(tvId, season) {
  const key = `${tvId}-${season}`;
  if (seasonEpisodesCache.has(key)) return seasonEpisodesCache.get(key);

  const data = await tmdbGet(`/tv/${tvId}/season/${season}`);
  const episodes = data?.episodes ?? null;
  seasonEpisodesCache.set(key, episodes);
  return episodes;
}

// IMDb y TMDB casi nunca dividen un anime largo en las mismas "temporadas":
// IMDb a veces lo deja todo en una Season 1 gigante (Hunter x Hunter), a
// veces lo separa POR AÑO en muchas temporadas chicas (Bleach tiene 16 en
// IMDb); TMDB arma sus propias temporadas por arco/cour, y ADEMAS a veces
// numera los episodios de forma absoluta a lo largo de toda la serie (Naruto,
// HxH) y a veces reinicia en 1 por temporada (Bleach) -- no hay un patron
// unico. Confiar en "season X, episode Y" de IMDb tal cual, o asumir una
// formula de numeracion, rompe en cualquiera de estos casos.
//
// la unica referencia que SI es estable entre ambos: la POSICION del
// episodio dentro del orden cronologico completo de la serie ("es el
// episodio numero 100 de 366"). roundBuilders.js calcula esa posicion
// (absoluteIndex, 1-based) con el dataset propio de IMDb; aca la usamos para
// ubicar la misma posicion dentro de las temporadas reales de TMDB, y
// devolvemos el still de ESE item de la lista (no de "episodio numero Y"),
// asi no importa si TMDB numera absoluto o relativo para ese show puntual.
export async function fetchEpisodeStillByPosition(tconst, absoluteIndex) {
  if (!Number.isFinite(absoluteIndex) || absoluteIndex < 1) return null;

  const tvId = await resolveTmdbTvId(tconst);
  if (!tvId) return null;

  const seasons = await getSeasonEpisodeCounts(tvId);
  if (!seasons || seasons.length === 0) return null;

  let remaining = absoluteIndex;
  for (const s of seasons) {
    if (remaining <= s.episodeCount) {
      const episodes = await getSeasonEpisodes(tvId, s.season);
      return episodes?.[remaining - 1]?.still_path
        ? `https://image.tmdb.org/t/p/w780${episodes[remaining - 1].still_path}`
        : null;
    }
    remaining -= s.episodeCount;
  }
  return null; // IMDb tiene mas episodios listados de los que TMDB tiene cargados
}
