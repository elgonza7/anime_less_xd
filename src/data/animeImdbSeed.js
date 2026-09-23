// mapeo anime -> tconst de IMDb, para la categoria de "rating por episodio".
// Los tconst se verificaron cruzando resultados de busqueda (titulo + tipo +
// anio) contra IMDb, no renderizando la pagina directo (IMDb bloquea el
// fetch automatizado). Si algun dia algo no matchea, revisa el tconst a mano
// en imdb.com antes de tocar la Cloud Function.
export const ANIME_IMDB_SEED = [
  { anime: "Attack on Titan", tconst: "tt2560140" },
  { anime: "Death Note", tconst: "tt0877057" },
  { anime: "Naruto", tconst: "tt0409591" },
  { anime: "Naruto Shippuden", tconst: "tt0988824" },
  { anime: "Fullmetal Alchemist: Brotherhood", tconst: "tt1355642" },
  { anime: "One Punch Man", tconst: "tt4508902" },
  { anime: "Demon Slayer: Kimetsu no Yaiba", tconst: "tt9335498" },
  { anime: "Jujutsu Kaisen", tconst: "tt12343534" },
  { anime: "Mushoku Tensei", tconst: "tt13293588" },
  { anime: "Bleach", tconst: "tt0434665" },
  { anime: "My Hero Academia", tconst: "tt5626028" },
  { anime: "Steins;Gate", tconst: "tt1910272" },
  { anime: "Hunter x Hunter (2011)", tconst: "tt2098220" },
  { anime: "Code Geass: Lelouch of the Rebellion", tconst: "tt0994314" },
  { anime: "One Piece", tconst: "tt0388629" },
];
