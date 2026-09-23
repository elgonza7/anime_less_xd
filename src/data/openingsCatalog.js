// catalogo de openings. NO vienen resueltos a un videoId de youtube todavia:
// eso se hace bajo demanda (ver services/openingsCacheService.js) para no
// gastar cuota de youtube search (100 units cada una) de una sola vez. cada
// vez que se resuelve una, queda guardada en Firestore para siempre. las
// queries incluyen artista + sello/canal oficial para que la busqueda de
// youtube no traiga un cover o una compilacion en vez del video oficial.
function slug(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const RAW_CATALOG = [
  { anime: "Chainsaw Man", opening: "OP1 - KICK BACK", query: '"Chainsaw Man" OP "KICK BACK" "Kenshi Yonezu" MAPPA CHANNEL' },
  { anime: "Oshi no Ko", opening: "OP1 - Idol", query: '"Oshi no Ko" OP "Idol" "YOASOBI" Ayase' },
  { anime: "Spy x Family", opening: "OP1 - Mixed Nuts", query: '"Spy x Family" OP "Mixed Nuts" "Official HIGE DANdism" TOHO animation' },
  { anime: "Frieren: Beyond Journey's End", opening: "OP1 - The Brave (Yuusha)", query: '"Frieren" OP "Yuusha" "YOASOBI" TOHO animation' },
  { anime: "Solo Leveling", opening: "OP1 - LEveL", query: '"Solo Leveling" OP "LEveL" "SawanoHiroyuki[nZk]" Aniplex' },
  { anime: "Mashle: Magic and Muscles", opening: "OP2 - Bling-Bang-Bang-Born", query: '"Mashle" OP "Bling-Bang-Bang-Born" "Creepy Nuts" Aniplex' },
  { anime: "The Apothecary Diaries", opening: "OP1 - Be a Flower", query: '"Kusuriya no Hitorigoto" OP "Hana ni Natte" "Ryokuoushoku Shakai" TOHO animation' },
  { anime: "Kaiju No. 8", opening: "OP1 - Abyss", query: '"Kaiju No. 8" OP "Abyss" "YUNGBLUD" TOHO animation' },
  { anime: "Hell's Paradise", opening: "OP1 - W Y K", query: '"Jigokuraku" OP "W Y K" "millennium parade" MAPPA CHANNEL' },
  { anime: "Cyberpunk: Edgerunners", opening: "OP1 - This Fire", query: '"Cyberpunk Edgerunners" OP "This Fire" "Franz Ferdinand" Netflix' },

  { anime: "Tokyo Ghoul", opening: "OP1 - Unravel", query: '"Tokyo Ghoul" OP "unravel" "TK from Ling tosite sigure" Crunchyroll' },
  { anime: "Mob Psycho 100", opening: "OP1 - 99", query: '"Mob Psycho 100" OP "99" "MOB CHOIR" Warner Bros. Japan' },
  { anime: "JoJo's Bizarre Adventure", opening: "OP1 - Sono Chi no Sadame", query: '"JoJo" OP "Sono Chi no Sadame" "Hiroaki Tommy Tominaga" Warner Bros. Japan' },
  { anime: "Black Clover", opening: "OP10 - Black Catcher", query: '"Black Clover" OP "Black Catcher" "Vickeblanka" avex' },
  { anime: "Fairy Tail", opening: "OP1 - Snow Fairy", query: '"Fairy Tail" OP "Snow Fairy" "FUNKIST" Pony Canyon' },
  { anime: "Fire Force", opening: "OP1 - Inferno", query: '"Fire Force" OP "Inferno" "Mrs. GREEN APPLE" DMM pictures' },
  { anime: "Soul Eater", opening: "OP1 - Resonance", query: '"Soul Eater" OP "Resonance" "T.M.Revolution"' },
  { anime: "Blue Exorcist", opening: "OP1 - Core Pride", query: '"Blue Exorcist" OP "Core Pride" "UVERworld" Aniplex' },
  { anime: "Akame ga Kill!", opening: "OP1 - Skyreach", query: '"Akame ga Kill" OP "Skyreach" "Sora Amamiya" TOHO animation' },
  { anime: "Tokyo Revengers", opening: "OP1 - Cry Baby", query: '"Tokyo Revengers" OP "Cry Baby" "Official HIGE DANdism" Pony Canyon' },

  { anime: "Kaguya-sama: Love is War", opening: "OP1 - Love Dramatic", query: '"Kaguya-sama" OP "Love Dramatic" "Masayuki Suzuki" Aniplex' },
  { anime: "Toradora!", opening: "OP1 - Pre-Parade", query: '"Toradora" OP "Pre-Parade" "Rie Kugimiya" King Record' },
  { anime: "Horimiya", opening: "OP1 - Iro Kousui", query: '"Horimiya" OP "Iro Kousui" "Yoh Kamiyama" Aniplex' },
  { anime: "My Dress-Up Darling", opening: "OP1 - Sansan Days", query: '"Sono Bisque Doll" OP "Sansan Days" "Spira Spica" Aniplex' },
  { anime: "Rascal Does Not Dream of Bunny Girl Senpai", opening: "OP1 - Kimi no Sei", query: '"Bunny Girl Senpai" OP "Kimi no Sei" "the peggies" Aniplex' },
  { anime: "Kimi ni Todoke", opening: "OP1 - Kimi ni Todoke", query: '"Kimi ni Todoke" OP "Tomofumi Tanizawa" VAP' },
  { anime: "The Quintessential Quintuplets", opening: "OP1 - Gotoubun no Kimochi", query: '"Gotoubun no Hanayome" OP "Gotoubun no Kimochi" Pony Canyon' },
  { anime: "Rent-a-Girlfriend", opening: "OP1 - Centimeter", query: '"Kanojo Okarishimasu" OP "Centimeter" "the peggies" DMM pictures' },
  { anime: "Wotakoi", opening: "OP1 - Fiction", query: '"Wotakoi" OP "Fiction" "sumika" Aniplex' },
  { anime: "My Teen Romantic Comedy SNAFU", opening: "OP1 - Yukitoki", query: '"Oregairu" OP "Yukitoki" "Nagi Yanagi" NBCUniversal Anime' },

  { anime: "Re:Zero", opening: "OP1 - Redo", query: '"Re:Zero" OP "Redo" "Konomi Suzuki" KADOKAWAanime' },
  { anime: "KonoSuba", opening: "OP1 - fantastic dreamer", query: '"KonoSuba" OP "fantastic dreamer" "Machico" Nippon Columbia' },
  { anime: "Overlord", opening: "OP1 - Clattanoia", query: '"Overlord" OP "Clattanoia" "OxT" KADOKAWAanime' },
  { anime: "The Rising of the Shield Hero", opening: "OP1 - RISE", query: '"Shield Hero" OP "RISE" "MADKID" KADOKAWAanime' },
  { anime: "That Time I Got Reincarnated as a Slime", opening: "OP1 - Nameless Story", query: '"TenSura" OP "Nameless Story" "Takuma Terashima" Lantis' },
  { anime: "No Game No Life", opening: "OP1 - This game", query: '"No Game No Life" OP "This game" "Konomi Suzuki" KADOKAWAanime' },
  { anime: "Sword Art Online", opening: "OP1 - Crossing Field", query: '"Sword Art Online" OP "Crossing Field" "LiSA" Aniplex' },
  { anime: "Log Horizon", opening: "OP1 - database", query: '"Log Horizon" OP "database" "MAN WITH A MISSION"' },
  { anime: "The Eminence in Shadow", opening: "OP1 - HIGHEST", query: '"Eminence in Shadow" OP "HIGHEST" "OxT" KADOKAWAanime' },
  { anime: "Mushoku Tensei", opening: "OP1 - The Traveler's Song", query: '"Mushoku Tensei" OP "Tabibito no Uta" "Yuiko Ohara" TOHO animation' },

  { anime: "Neon Genesis Evangelion", opening: "OP1 - A Cruel Angel's Thesis", query: '"Evangelion" OP "A Cruel Angel\'s Thesis" "Yoko Takahashi" KING AMUSEMENT CREATIVE' },
  { anime: "Cowboy Bebop", opening: "OP1 - Tank!", query: '"Cowboy Bebop" OP "Tank" "SEATBELTS" Sunrise' },
  { anime: "Sailor Moon", opening: "OP1 - Moonlight Densetsu", query: '"Sailor Moon" OP "Moonlight Densetsu" Toei Animation' },
  { anime: "Dragon Ball Z", opening: "OP1 - Cha-La Head-Cha-La", query: '"Dragon Ball Z" OP "Cha-La Head-Cha-La" "Hironobu Kageyama" Toei Animation' },
  { anime: "Yu Yu Hakusho", opening: "OP1 - Smile Bomb", query: '"Yu Yu Hakusho" OP "Hohoemi no Bakudan" "Matsuko Mawatari" Pony Canyon' },
  { anime: "Inuyasha", opening: "OP1 - Change the World", query: '"Inuyasha" OP "Change the World" "V6" avex' },
  { anime: "Rurouni Kenshin (1996)", opening: "OP1 - Freckles (Sobakasu)", query: '"Rurouni Kenshin" OP "Sobakasu" "JUDY AND MARY" Sony Music' },
  { anime: "Digimon Adventure", opening: "OP1 - Butter-Fly", query: '"Digimon Adventure" OP "Butter-Fly" "Koji Wada" Toei Animation' },
  { anime: "Pokémon", opening: "OP1 - Mezase Pokémon Master", query: '"Pokemon" OP "Mezase Pokemon Master" "Rica Matsumoto" Sony Music' },
  { anime: "Great Teacher Onizuka (GTO)", opening: "OP1 - Driver's High", query: '"GTO" OP "Driver\'s High" "L\'Arc-en-Ciel" Sony Music' },

  { anime: "Haikyuu!!", opening: "OP1 - Imagination", query: '"Haikyuu" OP "Imagination" "SPYAIR" TOHO animation' },
  { anime: "Kuroko's Basketball", opening: "OP1 - Can Do", query: '"Kuroko no Basket" OP "Can Do" "GRANRODEO" Lantis' },
  { anime: "Blue Lock", opening: "OP1 - Chaos ga Kiwamaru", query: '"Blue Lock" OP "Chaos ga Kiwamaru" "UNISON SQUARE GARDEN" EMOTION Label' },
  { anime: "Yuri!!! on ICE", opening: "OP1 - History Maker", query: '"Yuri on Ice" OP "History Maker" "DEAN FUJIOKA" avex' },
  { anime: "Slam Dunk", opening: "OP1 - Kimi ga Suki da to Sakebitai", query: '"Slam Dunk" OP "Kimi ga Suki da to Sakebitai" "BAAD" Toei Animation' },
  { anime: "Psycho-Pass", opening: "OP1 - abnormalize", query: '"Psycho-Pass" OP "abnormalize" "Ling tosite sigure" TOHO animation' },
  { anime: "Parasyte -the maxim-", opening: "OP1 - Let Me Hear", query: '"Parasyte" OP "Let Me Hear" "Fear, and Loathing in Las Vegas" VAP' },
  { anime: "ERASED", opening: "OP1 - Re:Re:", query: '"Boku dake ga Inai Machi" OP "Re:Re" "ASIAN KUNG-FU GENERATION" Aniplex' },
  { anime: "The Promised Neverland", opening: "OP1 - Touch Off", query: '"Promised Neverland" OP "Touch Off" "UVERworld" Aniplex' },
  { anime: "Mirai Nikki", opening: "OP1 - Kuusou Mesorogiwi", query: '"Mirai Nikki" OP "Kuusou Mesorogiwi" "Yousei Teikoku" Lantis' },

  { anime: "Your Lie in April", opening: "OP1 - Hikaru Nara", query: '"Shigatsu wa Kimi no Uso" OP "Hikaru Nara" "Goose house" Aniplex' },
  { anime: "Clannad: After Story", opening: "OP1 - Toki wo Kizamu Uta", query: '"Clannad After Story" OP "Toki wo Kizamu Uta" "Lia" Key Sounds Label' },
  { anime: "Violet Evergarden", opening: "OP1 - Sincerely", query: '"Violet Evergarden" OP "Sincerely" "TRUE" Lantis' },
  { anime: "Anohana", opening: "OP1 - Aoi Shiori", query: '"Anohana" OP "Aoi Shiori" "Galileo Galilei" Aniplex' },
  { anime: "Angel Beats!", opening: "OP1 - My Soul, Your Beats!", query: '"Angel Beats" OP "My Soul, Your Beats" "Lia" Aniplex' },
  { anime: "Bocchi the Rock!", opening: "OP1 - Seishun Complex", query: '"Bocchi the Rock" OP "Seishun Complex" "Kessoku Band" Aniplex' },
  { anime: "K-On!", opening: "OP1 - Cagayake! GIRLS", query: '"K-On" OP "Cagayake GIRLS" Pony Canyon' },
  { anime: "NANA", opening: "OP1 - Rose", query: '"NANA" OP "Rose" "ANNA TSUCHIYA" VAP' },
  { anime: "Given", opening: "OP1 - Kizuato", query: '"Given" OP "Kizuato" "Centimillimental" Aniplex' },
  { anime: "Carole & Tuesday", opening: "OP1 - Kiss Me", query: '"Carole & Tuesday" OP "Kiss Me" "Nai Br.XX & Celeina Ann" FlyingDog' },

  { anime: "Tengen Toppa Gurren Lagann", opening: "OP1 - Sorairo Days", query: '"Gurren Lagann" OP "Sorairo Days" "Shoko Nakagawa" Aniplex' },
  { anime: "Mobile Suit Gundam: Iron-Blooded Orphans", opening: "OP1 - Raise your flag", query: '"Gundam Iron-Blooded Orphans" OP "Raise your flag" "MAN WITH A MISSION" GundamInfo' },
  { anime: "86 EIGHTY-SIX", opening: "OP1 - 3-pun 29-byou", query: '"86 EIGHTY-SIX" OP "3-pun 29-byou" "hitorie" Aniplex' },
  { anime: "Darling in the Franxx", opening: "OP1 - KISS OF DEATH", query: '"Darling in the Franxx" OP "KISS OF DEATH" "Mika Nakashima" Aniplex' },
  { anime: "Guilty Crown", opening: "OP1 - My Dearest", query: '"Guilty Crown" OP "My Dearest" "supercell" Aniplex' },
  { anime: "Vivy: Fluorite Eye's Song", opening: "OP1 - Sing My Pleasure", query: '"Vivy" OP "Sing My Pleasure" "Kairi Yagi" Aniplex' },
  { anime: "Aldnoah.Zero", opening: "OP1 - heavenly blue", query: '"Aldnoah Zero" OP "heavenly blue" "Kalafina" Aniplex' },
  { anime: "Macross Frontier", opening: "OP1 - Triangler", query: '"Macross Frontier" OP "Triangler" "Maaya Sakamoto" FlyingDog' },
  { anime: "Ghost in the Shell: Stand Alone Complex", opening: "OP1 - Inner Universe", query: '"Ghost in the Shell SAC" OP "Inner Universe" "Origa" FlyingDog' },
  { anime: "Dr. STONE", opening: "OP1 - Good Morning World!", query: '"Dr. STONE" OP "Good Morning World" "BURNOUT SYNDROMES" TOHO animation' },

  { anime: "Baccano!", opening: "OP1 - Gun's & Roses", query: '"Baccano" OP "Guns & Roses" "Paradise Lunch" Aniplex' },
  { anime: "Durarara!!", opening: "OP1 - Uragiri no Yuuyake", query: '"Durarara" OP "Uragiri no Yuuyake" "THEATRE BROOK" Aniplex' },
  { anime: "Noragami", opening: "OP1 - Goya no Machiawase", query: '"Noragami" OP "Goya no Machiawase" "Hello Sleepwalkers" avex' },
  { anime: "Made in Abyss", opening: "OP1 - Deep in Abyss", query: '"Made in Abyss" OP "Deep in Abyss" KADOKAWAanime' },
  { anime: "BNA: Brand New Animal", opening: "OP1 - Ready to", query: '"BNA" OP "Ready to" TOHO animation' },
  { anime: "Dorohedoro", opening: "OP1 - Welcome to Chaos", query: '"Dorohedoro" OP "Welcome to Chaos" TOHO animation' },
  { anime: "Beastars", opening: "OP1 - Wild Side", query: '"Beastars" OP "Wild Side" "ALI" TOHO animation' },
  { anime: "Bakemonogatari", opening: "OP4 - Renai Circulation", query: '"Bakemonogatari" OP "Renai Circulation" "Kana Hanazawa" Aniplex' },
  { anime: "Katanagatari", opening: "OP1 - Meiya Kadenrou", query: '"Katanagatari" OP "Meiya Kadenrou" "Minami Kuribayashi" Lantis' },
  { anime: "Blood Blockade Battlefront", opening: "OP1 - Hello,world!", query: '"Kekkai Sensen" OP "Hello,world!" "BUMP OF CHICKEN" TOHO animation' },

  { anime: "Attack on Titan", opening: "OP1 - Guren no Yumiya", query: '"Attack on Titan" OP "Guren no Yumiya" "Linked Horizon" Pony Canyon' },
  { anime: "Naruto", opening: "OP2 - Haruka Kanata", query: '"Naruto" OP "Haruka Kanata" "ASIAN KUNG-FU GENERATION" Sony Music' },
  { anime: "Naruto Shippuden", opening: "OP16 - Silhouette", query: '"Naruto Shippuden" OP "Silhouette" "KANA-BOON" Sony Music' },
  { anime: "Death Note", opening: "OP1 - the WORLD", query: '"Death Note" OP "the WORLD" "Nightmare" VAP' },
  { anime: "Fullmetal Alchemist: Brotherhood", opening: "OP2 - Again", query: '"Fullmetal Alchemist Brotherhood" OP "Again" "YUI" Aniplex' },
  { anime: "Demon Slayer", opening: "OP1 - Gurenge", query: '"Demon Slayer" OP "Gurenge" "LiSA" Aniplex' },
  { anime: "Jujutsu Kaisen", opening: "OP1 - Kaikai Kitan", query: '"Jujutsu Kaisen" OP "Kaikai Kitan" "Eve" TOHO animation' },
  { anime: "My Hero Academia", opening: "OP1 - The Day", query: '"My Hero Academia" OP "The Day" "Porno Graffitti" TOHO animation' },
  { anime: "One Punch Man", opening: "OP1 - The Hero!!", query: '"One Punch Man" OP "THE HERO" "JAM Project" Lantis' },
  { anime: "Bleach", opening: "OP4 - Asterisk", query: '"Bleach" OP "Asterisk" "ORANGE RANGE" Sony Music' },
];

export const OPENINGS_CATALOG = RAW_CATALOG.map((entry) => ({
  ...entry,
  key: slug(`${entry.anime}-${entry.opening}`),
}));
