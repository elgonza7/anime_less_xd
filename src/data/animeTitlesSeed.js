// lista curada y CHICA a proposito: menos titulos = menos repeticion rara,
// menos carga a jikan, y mas facil de mantener el fallback offline al dia.
// se resuelven en vivo contra jikan (score, members, imagen) asi no
// hardcodeamos mal_id a mano y arriesgamos mandar un id equivocado. los
// titulos usan el nombre oficial completo para que la busqueda de jikan no
// matchee por error una pelicula/spin-off en vez de la serie principal.
export const ANIME_TITLES_SEED = [
  "Attack on Titan",
  "Death Note",
  "Naruto",
  "Fullmetal Alchemist: Brotherhood",
  "One Punch Man",
  "Demon Slayer: Kimetsu no Yaiba",
  "Jujutsu Kaisen",
  "Bleach",
  "My Hero Academia",
  "Steins;Gate",
  "Hunter x Hunter (2011)",
  "Code Geass",
  "One Piece",
  "Vinland Saga",
  "Spy x Family",
  "Chainsaw Man",
  "Cowboy Bebop",
  "Sword Art Online",
  "Dragon Ball Z",
  "Haikyuu",
];
