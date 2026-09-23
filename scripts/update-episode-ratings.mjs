// Refresca src/data -> Firestore con los ratings por episodio de IMDb.
// Corre en GitHub Actions todos los dias a las 8am hora Argentina (ver
// .github/workflows/update-episode-ratings.yml), asi no necesitamos que el
// proyecto de Firebase este en el plan Blaze (eso es lo que pide Cloud
// Functions, pero Firestore solo -sin Functions- es gratis en el plan Spark).
//
// uso local: node --env-file=.env scripts/update-episode-ratings.mjs
// (necesita FIREBASE_SERVICE_ACCOUNT o FIREBASE_SERVICE_ACCOUNT_PATH, ver SETUP.md)

import { readFile } from "node:fs/promises";
import zlib from "node:zlib";
import readline from "node:readline";
import { Readable } from "node:stream";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { ANIME_IMDB_SEED } from "../src/data/animeImdbSeed.js";

function parseServiceAccountJson(raw, source) {
  try {
    return JSON.parse(raw.trim());
  } catch (err) {
    throw new Error(
      `El JSON de ${source} no es valido (${err.message}). Longitud recibida: ${raw.length} caracteres. ` +
        `Revisa que el secret tenga el JSON completo pegado tal cual, sin comillas extra alrededor.`
    );
  }
}

async function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return parseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT, "FIREBASE_SERVICE_ACCOUNT");
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const raw = await readFile(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf-8");
    return parseServiceAccountJson(raw, process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  }
  throw new Error(
    "Falta FIREBASE_SERVICE_ACCOUNT (JSON completo, para CI) o FIREBASE_SERVICE_ACCOUNT_PATH (ruta local). Ver SETUP.md."
  );
}

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

async function main() {
  const serviceAccount = await loadServiceAccount();
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  const seriesById = new Map(ANIME_IMDB_SEED.map((e) => [e.tconst, e.anime]));
  const wantedSeries = new Set(seriesById.keys());

  console.log(`Buscando episodios para ${wantedSeries.size} series...`);

  // pass 1: title.episode.tsv -> tconst de episodio, solo de las series que nos interesan
  const episodeIndex = new Map(); // episodeTconst -> { parentTconst, season, episode }
  await streamGzipTsv(EPISODE_DATASET_URL, ([tconst, parentTconst, seasonNumber, episodeNumber]) => {
    if (wantedSeries.has(parentTconst)) {
      episodeIndex.set(tconst, { parentTconst, season: seasonNumber, episode: episodeNumber });
    }
  });
  console.log(`Encontrados ${episodeIndex.size} episodios candidatos.`);

  // pass 2: title.ratings.tsv -> pegamos el rating solo a los episodios que quedaron en el index
  const bySeriesTconst = new Map();
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
      anime: seriesById.get(seriesTconst),
      updatedAt: Date.now(),
      episodes,
    });
  }
  await batch.commit();

  console.log(`Listo: ${bySeriesTconst.size}/${wantedSeries.size} series actualizadas en Firestore.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
