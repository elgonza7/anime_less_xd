# AnimeLess

"More or less", pero de anime. Jugás un run continuo de 4 categorías (5 rondas cada
una): izquierda vs derecha, elegís la que crees que gana. Si te logueás con Google al
final, tu puntaje entra al ranking global.

## Categorías (en orden)

| Categoría | Fuente de datos |
|---|---|
| ⭐ Anime Rating | Jikan (MyAnimeList) |
| 🎬 Episode Rating | Dataset oficial no-comercial de IMDb |
| 🎵 Opening Views | YouTube Data API v3 (se resuelve bajo demanda, ver SETUP.md) |
| 👥 Fandom Size | Miembros en MyAnimeList (proxy, vía Jikan) |

## Stack

React + Vite + Tailwind v4 + Framer Motion en el front. Firebase (Auth con Google +
Firestore, plan Spark/gratis) para login y leaderboard. Un workflow de GitHub Actions
corre todos los días a las 8am (hora Argentina) para refrescar los ratings de episodios
—así no hace falta el plan pago de Firebase Functions. UI en inglés (para llegar a más
gente), comentarios de código en español.

## Correrlo

```bash
npm install
npm run dev
```

Para el setup completo (Firebase, Cloud Functions, variables de entorno) ver **[SETUP.md](SETUP.md)**.
