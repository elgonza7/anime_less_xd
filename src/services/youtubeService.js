const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

const cache = new Map();

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
