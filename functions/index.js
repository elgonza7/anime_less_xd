const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const zlib = require("zlib");
const readline = require("readline");
const { Readable } = require("stream");

initializeApp();
const db = getFirestore();

// mapeo anime -> tconst de IMDb. mismo mapeo que src/data/animeImdbSeed.js
// (duplicado a mano porque functions/ es un paquete node aparte del front).
const SERIES_MAP = {
  tt2560140: "Attack on Titan",
  tt0877057: "Death Note",
  tt0409591: "Naruto",
  tt0988824: "Naruto Shippuden",
  tt1355642: "Fullmetal Alchemist: Brotherhood",
  tt4508902: "One Punch Man",
  tt9335498: "Demon Slayer",
  tt12343534: "Jujutsu Kaisen",
  tt13293588: "Mushoku Tensei",
  tt0434665: "Bleach",
  tt5626028: "My Hero Academia",
  tt1910272: "Steins;Gate",
  tt2098220: "Hunter x Hunter (2011)",
  tt0994314: "Code Geass",
  tt0388629: "One Piece",
};

// datasets no-comerciales oficiales de IMDb (autorizado explicitamente para
// este uso, a diferencia de scrapear imdb.com en vivo). se actualizan solos
// todos los dias del lado de IMDb, por eso alcanza con bajarlos 1 vez por dia.
const EPISODE_DATASET_URL = "https://datasets.imdbws.com/title.episode.tsv.gz";
const RATINGS_DATASET_URL = "https://datasets.imdbws.com/title.ratings.tsv.gz";

async function streamGzipTsv(url, onRow) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo descargar ${url}: ${res.status}`);

  const gunzip = zlib.createGunzip();
  Readable.fromWeb(res.body).pipe(gunzip);

  const rl = readline.createInterface({ input: gunzip });
  let isHeader = true;
  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    onRow(line.split("\t"));
  }
}

async function refreshEpisodeRatings() {
  const wantedSeries = new Set(Object.keys(SERIES_MAP));

  // pass 1: title.episode.tsv -> tconst de episodio, pero solo de las series que nos interesan
  const episodeIndex = new Map(); // episodeTconst -> { parentTconst, season, episode }
  await streamGzipTsv(EPISODE_DATASET_URL, ([tconst, parentTconst, seasonNumber, episodeNumber]) => {
    if (wantedSeries.has(parentTconst)) {
      episodeIndex.set(tconst, { parentTconst, season: seasonNumber, episode: episodeNumber });
    }
  });

  // pass 2: title.ratings.tsv -> pegamos el rating solo a los episodios que quedaron en el index
  const bySeriesTconst = new Map(); // parentTconst -> episodios[]
  await streamGzipTsv(RATINGS_DATASET_URL, ([tconst, averageRating, numVotes]) => {
    const meta = episodeIndex.get(tconst);
    if (!meta) return;

    const list = bySeriesTconst.get(meta.parentTconst) ?? [];
    list.push({
      tconst,
      season: Number(meta.season),
      episode: Number(meta.episode),
      rating: Number(averageRating),
      votes: Number(numVotes),
    });
    bySeriesTconst.set(meta.parentTconst, list);
  });

  const batch = db.batch();
  for (const [seriesTconst, episodes] of bySeriesTconst.entries()) {
    episodes.sort((a, b) => a.season - b.season || a.episode - b.episode);
    batch.set(db.collection("episodeRatings").doc(seriesTconst), {
      anime: SERIES_MAP[seriesTconst],
      updatedAt: Date.now(),
      episodes,
    });
  }
  await batch.commit();

  return bySeriesTconst.size;
}

// corre solo, todos los dias a las 8am hora argentina
exports.updateEpisodeRatings = onSchedule(
  {
    schedule: "0 8 * * *",
    timeZone: "America/Argentina/Buenos_Aires",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    const count = await refreshEpisodeRatings();
    console.log(`updateEpisodeRatings: ${count} series actualizadas.`);
  }
);

// endpoint manual para la primera carga (no hay que esperar al cron de las
// 8am para probar la app). Llamalo una vez con curl/navegador despues de
// deployar y listo.
exports.updateEpisodeRatingsNow = onRequest(
  { timeoutSeconds: 540, memory: "512MiB" },
  async (req, res) => {
    try {
      const count = await refreshEpisodeRatings();
      res.status(200).send(`OK: ${count} series actualizadas.`);
    } catch (err) {
      console.error(err);
      res.status(500).send(`Error: ${err.message}`);
    }
  }
);
