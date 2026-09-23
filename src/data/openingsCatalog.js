// catalogo CHICO a proposito (40, no 100): menos variedad rara/obscura, menos
// riesgo de que la busqueda de youtube traiga un cover en vez del oficial, y
// menos carga en general. no vienen resueltos a un videoId de youtube
// todavia: eso se hace bajo demanda (ver services/openingsCacheService.js)
// para no gastar cuota de youtube search (100 units cada una). cada vez que
// se resuelve una, queda guardada en Firestore para siempre.
function slug(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const RAW_CATALOG = [
  { anime: "Chainsaw Man", opening: "OP1 - KICK BACK", query: "Chainsaw Man Opening KICK BACK MAPPA Official Crunchyroll" },
  { anime: "Oshi no Ko", opening: "OP1 - Idol", query: "Oshi no Ko Opening Idol YOASOBI Official" },
  { anime: "Spy x Family", opening: "OP1 - Mixed Nuts", query: "Spy x Family Opening Mixed Nuts Official TOHO animation" },
  { anime: "Frieren: Beyond Journey's End", opening: "OP1 - The Brave (Yuusha)", query: "Frieren Opening Yuusha YOASOBI Official TOHO" },
  { anime: "Solo Leveling", opening: "OP1 - LEveL", query: "Solo Leveling Opening LEveL Official Crunchyroll" },
  { anime: "Tokyo Ghoul", opening: "OP1 - Unravel", query: "Tokyo Ghoul Opening Unravel Official" },
  { anime: "Mob Psycho 100", opening: "OP1 - 99", query: "Mob Psycho 100 Opening 99 Official Crunchyroll" },
  { anime: "JoJo's Bizarre Adventure", opening: "OP1 - Sono Chi no Sadame", query: "JoJos Bizarre Adventure Opening 1 Sono Chi no Sadame Official" },
  { anime: "Black Clover", opening: "OP10 - Black Catcher", query: "Black Clover Opening 10 Black Catcher Official Crunchyroll" },
  { anime: "Fire Force", opening: "OP1 - Inferno", query: "Fire Force Opening 1 Inferno Official Crunchyroll" },
  { anime: "Blue Exorcist", opening: "OP1 - Core Pride", query: "Blue Exorcist Opening 1 Core Pride Official" },
  { anime: "Tokyo Revengers", opening: "OP1 - Cry Baby", query: "Tokyo Revengers Opening Cry Baby Official Crunchyroll" },
  { anime: "Kaguya-sama: Love is War", opening: "OP1 - Love Dramatic", query: "Kaguya-sama Love is War Opening 1 Love Dramatic Official" },
  { anime: "Toradora!", opening: "OP1 - Pre-Parade", query: "Toradora Opening 1 Pre-Parade Official Crunchyroll" },
  { anime: "Horimiya", opening: "OP1 - Iro Kousui", query: "Horimiya Opening Iro Kousui Official" },
  { anime: "Re:Zero", opening: "OP1 - Redo", query: "Re Zero Opening 1 Redo Official Kadokawa" },
  { anime: "KonoSuba", opening: "OP1 - fantastic dreamer", query: "Konosuba Opening 1 fantastic dreamer Official Crunchyroll" },
  { anime: "Overlord", opening: "OP1 - Clattanoia", query: "Overlord Opening 1 Clattanoia Official Kadokawa" },
  { anime: "Sword Art Online", opening: "OP1 - Crossing Field", query: "Sword Art Online Opening 1 Crossing Field Official" },
  { anime: "Neon Genesis Evangelion", opening: "OP1 - A Cruel Angel's Thesis", query: "Evangelion Opening A Cruel Angels Thesis Official King Records" },
  { anime: "Cowboy Bebop", opening: "OP1 - Tank!", query: "Cowboy Bebop Opening Tank Official" },
  { anime: "Sailor Moon", opening: "OP1 - Moonlight Densetsu", query: "Sailor Moon Opening 1 Moonlight Densetsu Official" },
  { anime: "Dragon Ball Z", opening: "OP1 - Cha-La Head-Cha-La", query: "Dragon Ball Z Opening Cha-La Head-Cha-La Official" },
  { anime: "Yu Yu Hakusho", opening: "OP1 - Smile Bomb", query: "Yu Yu Hakusho Opening Smile Bomb Official Crunchyroll" },
  { anime: "Inuyasha", opening: "OP1 - Change the World", query: "Inuyasha Opening 1 Change the World Official" },
  { anime: "Haikyuu!!", opening: "OP1 - Imagination", query: "Haikyuu Opening 1 Imagination Official TOHO" },
  { anime: "Blue Lock", opening: "OP1 - Chaos ga Kiwamaru", query: "Blue Lock Opening 1 Chaos ga Kiwamaru Official" },
  { anime: "Slam Dunk", opening: "OP1 - Kimi ga Suki da to Sakebitai", query: "Slam Dunk Opening 1 Official" },
  { anime: "Psycho-Pass", opening: "OP1 - abnormalize", query: "Psycho Pass Opening 1 abnormalize Official" },
  { anime: "Your Lie in April", opening: "OP1 - Hikaru Nara", query: "Your Lie in April Opening 1 Hikaru Nara Official Crunchyroll" },
  { anime: "Violet Evergarden", opening: "OP1 - Sincerely", query: "Violet Evergarden Opening Sincerely Official Kyoto Animation" },
  { anime: "Angel Beats!", opening: "OP1 - My Soul, Your Beats!", query: "Angel Beats Opening My Soul Your Beats Official" },
  { anime: "K-On!", opening: "OP1 - Cagayake! GIRLS", query: "K-On Opening 1 Cagayake GIRLS Official" },
  { anime: "Tengen Toppa Gurren Lagann", opening: "OP1 - Sorairo Days", query: "Gurren Lagann Opening Sorairo Days Official" },
  { anime: "Darling in the Franxx", opening: "OP1 - KISS OF DEATH", query: "Darling in the Franxx Opening KISS OF DEATH Official Crunchyroll" },
  { anime: "Dr. STONE", opening: "OP1 - Good Morning World!", query: "Dr STONE Opening 1 Good Morning World Official Crunchyroll" },
  { anime: "Durarara!!", opening: "OP1 - Uragiri no Yuuyake", query: "Durarara Opening 1 Uragiri no Yuuyake Official" },
  { anime: "Made in Abyss", opening: "OP1 - Deep in Abyss", query: "Made in Abyss Opening Deep in Abyss Official Kadokawa" },
  { anime: "Vinland Saga", opening: "OP1 - MUKANJYO", query: "Vinland Saga Opening 1 MUKANJYO Official" },
  { anime: "Fate/Zero", opening: "OP1 - oath sign", query: "Fate Zero Opening 1 oath sign Official" },
];

export const OPENINGS_CATALOG = RAW_CATALOG.map((entry) => ({
  ...entry,
  key: slug(`${entry.anime}-${entry.opening}`),
}));
