const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

const cache = new Map();

// canales que consideramos "oficiales": plataformas de streaming, sellos,
// productoras y canales de artistas. entre estos se elige el mas visto.
const OFFICIAL_CHANNEL =
  /crunchyroll|aniplex|toho|viz|vevo|official|warner|sony|avex|king ?(record|amusement)|pony canyon|lantis|kadokawa|muse|vap|nbcuniversal|toei|funimation|netflix|mappa|wit studio|ufotable|dmm|anime|アニメ|公式|ノンクレジット|studio|pictures|music|records/i;

const BAD_RESULT =
  /- Topic\b|\bcover\b|cosplay|踊ってみた|\bdance\b|\bAMV\b|\bMAD\b|\bremix\b|\breaction\b|trailer|\bPV\b.*(película|movie)|película|1 ?hour|lyrics? ?AMV|karaoke|piano|guitar/i;

// trae vistas en vivo (esto sale 1 unit de cuota, no rompe el limite diario ni de cerca)
export async function fetchVideoStats(videoId) {
  if (cache.has(videoId)) return cache.get(videoId);
  if (!API_KEY) throw new Error("Falta VITE_YOUTUBE_API_KEY en el .env");

  const url = `${BASE_URL}/videos?part=statistics,snippet&id=${videoId}&key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API respondio ${res.status}`);

  const json = await res.json();
  const item = json.items?.[0];
  if (!item) throw new Error(`No se encontro el video ${videoId}`);

  const parsed = {
    videoId,
    viewCount: Number(item.statistics.viewCount),
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
    channelTitle: item.snippet.channelTitle,
  };

  cache.set(videoId, parsed);
  return parsed;
}

// resuelve un opening a un videoId real. esto cuesta 100 units de cuota
// (bastante caro), por eso solo se llama una vez por opening -- ver
// services/openingsCacheService.js, que guarda el resultado en Firestore
// para que nadie mas tenga que volver a buscarlo.
// acepta una query o una lista de queries de mas especifica a mas laxa: las
// queries con muchas comillas (artista + sello) a veces no devuelven nada en
// YouTube, y en ese caso probamos la siguiente en vez de romper la ronda.
// solo se gasta cuota extra (100 units) cuando la anterior no encontro nada.
export async function searchOfficialVideo(queries) {
  if (!API_KEY) throw new Error("Falta VITE_YOUTUBE_API_KEY en el .env");
  const list = Array.isArray(queries) ? queries : [queries];

  for (const query of list) {
    // pedimos 10 (cuesta lo mismo que 1) y nos quedamos con el video OFICIAL
    // MAS VISTO: si usaramos el primer resultado, a veces seria una subida
    // secundaria (lyric video, version de otro canal) con muchas menos vistas
    // que el video principal, y comparar eso seria injusto para quien adivina.
    // se descartan covers, bailes, AMVs, trailers y los "- Topic".
    const url = `${BASE_URL}/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(query)}&key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube search respondio ${res.status}`);

    const json = await res.json();
    const candidates = (json.items ?? []).filter((it) => !BAD_RESULT.test(`${it.snippet.title} ${it.snippet.channelTitle}`));
    if (candidates.length === 0) continue;

    const statsRes = await fetch(
      `${BASE_URL}/videos?part=statistics&id=${candidates.map((c) => c.id.videoId).join(",")}&key=${API_KEY}`
    );
    const views = new Map();
    if (statsRes.ok) {
      for (const v of (await statsRes.json()).items ?? []) views.set(v.id, Number(v.statistics?.viewCount ?? 0));
    }
    const viewsOf = (c) => views.get(c.id.videoId) ?? 0;
    const official = candidates.filter((c) => OFFICIAL_CHANNEL.test(c.snippet.channelTitle));
    const pool = official.length > 0 ? official : candidates;
    const item = pool.reduce((best, c) => (viewsOf(c) > viewsOf(best) ? c : best), pool[0]);

    return {
      videoId: item.id.videoId,
      resolvedTitle: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
    };
  }
  throw new Error(`YouTube no encontro nada para "${list[0]}"`);
}
