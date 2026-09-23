# AniVersus

Juego estilo "more or less" pero de anime. Elegís una categoría, comparás 5 veces
(izquierda vs derecha), sumás puntos, y si te logueás con Google entrás al ranking global.

## Categorías

| Categoría | Fuente de datos |
|---|---|
| ⭐ Rating de anime | Jikan (MyAnimeList) |
| 🎬 Rating de episodios | Dataset oficial no-comercial de IMDb |
| 🎵 Vistas de openings | YouTube Data API v3 |
| 👥 Tamaño del fandom | Miembros en MyAnimeList (proxy, vía Jikan) |

## Stack

React + Vite + Tailwind v4 en el front. Firebase (Auth con Google + Firestore) para
login y leaderboard. Una Cloud Function corre todos los días a las 8am (hora Argentina)
para refrescar los ratings de episodios.

## Correrlo

```bash
npm install
npm run dev
```

Para el setup completo (Firebase, Cloud Functions, variables de entorno) ver **[SETUP.md](SETUP.md)**.
