export const ROUNDS_PER_CATEGORY = 5; // asi lo pidio el cliente, ni una ronda mas ni una menos

export const CATEGORIES = [
  {
    id: "rating",
    label: "Rating de Anime",
    icon: "⭐",
    question: "¿Qué anime tiene mejor rating en MyAnimeList?",
  },
  {
    id: "episode",
    label: "Rating de Episodios",
    icon: "🎬",
    question: "¿Qué episodio tiene mejor rating en IMDb?",
  },
  {
    id: "opening",
    label: "Vistas de Openings",
    icon: "🎵",
    question: "¿Qué opening tiene más vistas en YouTube?",
  },
  {
    id: "fandom",
    label: "Tamaño del Fandom",
    icon: "👥",
    question: "¿Qué anime tiene más fans (miembros en MyAnimeList)?",
  },
];
