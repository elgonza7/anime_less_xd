// Corre UNA vez (o cada vez que quieras ampliar la lista) para resolver los
// videoId reales de YouTube de cada opening y dejarlos guardados en
// src/data/openingsSeed.json. Asi el juego no gasta cuota de "search" en cada
// partida, solo consulta "videos.list" (1 unit) para traer las vistas al vuelo.
//
// uso: node --env-file=.env scripts/resolve-openings.mjs

import { writeFile } from "node:fs/promises";

const API_KEY = process.env.VITE_YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error("Falta VITE_YOUTUBE_API_KEY (revisa tu .env)");
  process.exit(1);
}

const OPENINGS_TO_RESOLVE = [
  { anime: "Attack on Titan", opening: "OP1 - Guren no Yumiya", query: "Attack on Titan Opening 1 Guren no Yumiya Official" },
  { anime: "Naruto", opening: "OP2 - Haruka Kanata", query: "Naruto Opening 2 Haruka Kanata Official" },
  { anime: "Naruto Shippuden", opening: "OP16 - Silhouette", query: "Naruto Shippuden Opening 16 Silhouette Official" },
  { anime: "Death Note", opening: "OP1 - the WORLD", query: "Death Note Opening 1 the WORLD Official" },
  { anime: "Fullmetal Alchemist: Brotherhood", opening: "OP2 - Again", query: "Fullmetal Alchemist Brotherhood Opening 2 Again Official" },
  { anime: "Demon Slayer", opening: "OP1 - Gurenge", query: "Demon Slayer Opening 1 Gurenge Official" },
  { anime: "Jujutsu Kaisen", opening: "OP1 - Kaikai Kitan", query: "Jujutsu Kaisen Opening 1 Kaikai Kitan Official" },
  { anime: "My Hero Academia", opening: "OP1 - The Day", query: "My Hero Academia Opening 1 The Day Official" },
  { anime: "One Punch Man", opening: "OP1 - The Hero!!", query: "One Punch Man Opening THE HERO Official" },
  { anime: "Bleach", opening: "OP4 - Asterisk", query: "Bleach Opening 4 Asterisk Official" },
  { anime: "One Piece", opening: "OP1 - We Are!", query: "One Piece Opening 1 We Are Official" },
  { anime: "Code Geass", opening: "OP1 - Colors", query: "Code Geass Opening 1 Colors Official" },
  { anime: "Mushoku Tensei", opening: "OP1 - Ring of Fortune", query: "Mushoku Tensei Opening Ring of Fortune Official" },
  { anime: "Hunter x Hunter (2011)", opening: "OP1 - Departure!", query: "Hunter x Hunter 2011 Opening Departure Official" },
  { anime: "Steins;Gate", opening: "OP1 - Hacking to the Gate", query: "Steins Gate Opening Hacking to the Gate Official" },
];

async function searchVideoId(query) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`search fallo (${res.status}): ${body}`);
  }
  const json = await res.json();
  const item = json.items?.[0];
  if (!item) return null;
  return {
    videoId: item.id.videoId,
    resolvedTitle: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails?.high?.url,
  };
}

const resolved = [];
for (const entry of OPENINGS_TO_RESOLVE) {
  try {
    const found = await searchVideoId(entry.query);
    if (!found) {
      console.warn(`[sin resultado] ${entry.anime} - ${entry.opening}`);
      continue;
    }
    resolved.push({ ...entry, ...found });
    console.log(`[ok] ${entry.anime} -> ${found.videoId} (${found.resolvedTitle})`);
  } catch (err) {
    console.error(`[error] ${entry.anime}: ${err.message}`);
  }
}

await writeFile(
  new URL("../src/data/openingsSeed.json", import.meta.url),
  JSON.stringify(resolved, null, 2)
);

console.log(`\nListo, ${resolved.length}/${OPENINGS_TO_RESOLVE.length} openings resueltos en src/data/openingsSeed.json`);
console.log("IMPORTANTE: revisa a mano cada resolvedTitle/channelTitle antes de confiar en el video,");
console.log("la busqueda de YouTube a veces trae covers o compilaciones en vez del oficial.");
