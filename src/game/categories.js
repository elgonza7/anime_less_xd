export const ROUNDS_PER_CATEGORY = 5; // client said 5 rounds, not 4, not 6 lol

// el orden importa: "opening" va al final porque la primera vez que sale un
// opening nuevo hay que resolverlo contra youtube (mas lento); el resto son
// mas rapidos asi que van primero.
export const CATEGORIES = [
  {
    id: "rating",
    label: "Anime Rating",
    icon: "⭐",
    question: "Which anime has a better rating?",
  },
  {
    id: "episode",
    label: "Episode Rating",
    icon: "🎬",
    question: "Which episode has a better rating?",
  },
  {
    id: "fandom",
    label: "Fandom Size",
    icon: "👥",
    question: "Which anime has a bigger fandom?",
  },
  {
    id: "opening",
    label: "Opening Views",
    icon: "🎵",
    question: "Which opening has more views?",
  },
];
