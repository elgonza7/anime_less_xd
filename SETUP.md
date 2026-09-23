# Setup de AnimeLess

## 1. Instalar dependencias

```bash
npm install
```

## 2. Proyecto de Firebase

Ya está creado (`animeless-e07bf`) y sus claves ya están puestas en `.env`. Solo falta
que en la consola de Firebase (https://console.firebase.google.com/project/animeless-e07bf):

1. **Authentication** → Sign-in method → habilitá **Google** (si todavía no lo hiciste).
2. **Firestore Database** → **Create database** si el botón todavía dice eso (si ya
   probaste `firebase deploy` y se cortó a mitad de camino por el tema de Cloud
   Functions, entrá a esta sección y confirmá que la base ya exista con estado
   "Active" — si no, creala manualmente acá, modo producción, cualquier región).
3. **Authentication → Settings → Authorized domains** → agregá el dominio donde vayas a
   deployar (Vercel/Render/lo que sea) — `localhost` ya viene autorizado por defecto.

> Nota: el `apiKey` de Firebase para web **no es un secreto** (a diferencia de la key de
> YouTube más abajo) — Firebase lo espera embebido en el bundle del cliente, la seguridad
> real la dan las Firestore Rules, no ocultar esta key. Podés subirla a GitHub sin drama.

## 3. Correr en local

```bash
npm run dev
```

El login con Google y el leaderboard ya deberían andar apenas hagas los pasos de
Authentication/Firestore de arriba. La categoría de episodios va a aparecer "sin datos"
(y el juego la salta sola) hasta que hagas el paso 5.

## 4. Deployar las reglas de Firestore

```bash
npm install -g firebase-tools   # si no lo tenés
firebase login
firebase deploy --only firestore:rules
```

(El `.firebaserc` ya apunta a `animeless-e07bf`, no hace falta `firebase use`.)
Si ya habías corrido esto antes, volvé a correrlo — se agregó la colección
`openingsCache` a las reglas.

Esto sube `firestore.rules`: leaderboard requiere login, `episodeRatings` es solo lectura.
**Importante:** esto NO necesita el plan Blaze — el error que te salió
("Your project must be on the Blaze plan") era porque `firebase deploy` intentaba
deployar Cloud Functions al mismo tiempo, y Functions sí pide Blaze (tarjeta de
crédito, aunque no te cobre nada por este uso tan chico). Para no depender de eso,
el refresco de episodios se mueve al paso 5, corriendo en GitHub Actions en vez de
Cloud Functions — gratis, sin tarjeta.

## 5. Ratings de episodios: GitHub Actions en vez de Cloud Functions

`scripts/update-episode-ratings.mjs` hace el mismo trabajo que iba a hacer la Cloud
Function (bajar los datasets de IMDb y guardar los ratings en Firestore), pero corre
como un workflow programado de GitHub Actions — no toca el plan de Firebase para nada.

**Setup (una sola vez):**

1. Firebase Console → ⚙️ **Project settings** → pestaña **Service accounts** →
   **Generate new private key**. Se descarga un `.json` — guardalo, no lo subas al repo
   (ya está en `.gitignore` por las dudas).
2. En GitHub: tu repo → **Settings → Secrets and variables → Actions → New repository
   secret**. Nombre: `FIREBASE_SERVICE_ACCOUNT`. Valor: pegá el contenido completo de
   ese `.json`.
3. Listo. El workflow `.github/workflows/update-episode-ratings.yml` ya está en el repo
   y corre solo **todos los días a las 8am hora Argentina** (11:00 UTC).

**Para no esperar al cron de mañana**, andá a tu repo en GitHub → pestaña **Actions** →
"Update episode ratings" → botón **Run workflow** → Run. Tarda 1-2 minutos.

**Para correrlo en tu compu** (probar antes de subirlo, opcional): guardá el `.json` del
paso 1 en algún lado local (por ejemplo `./service-account.json`, que también está
gitignoreado) y agregá a tu `.env`:

```
FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json
```

Y corré:

```bash
node --env-file=.env scripts/update-episode-ratings.mjs
```

## 6. YouTube Data API

Ya viene la key puesta en `.env` (la que pasaste por el chat). **Recomendación fuerte:**
como esa key quedó en texto plano en la conversación, andá a
Google Cloud Console → APIs & Services → Credentials → esa key → **Restringila**
(a "YouTube Data API v3" + al dominio de tu app) o mejor, **regenerala** y poné la nueva
en tu `.env` local antes de deployar a producción. Nunca la subas a GitHub (`.env` ya
está en `.gitignore`).

El catálogo de openings (`src/data/openingsCatalog.js`) tiene 100 animes, pero **no**
se resuelven todos de una — buscar un opening en YouTube (`search.list`) cuesta 100
units de cuota, y resolver los 100 de una se comería el límite gratis diario entero.
En cambio, cada opening se resuelve **la primera vez que sale en una partida** y
después queda guardado para siempre en Firestore (`openingsCache`), así nadie más
tiene que volver a buscarlo — el catálogo se va completando solo con el uso normal,
sin gastar cuota de más. Si en algún momento un opening resuelto queda mal (trajo un
cover en vez del oficial), borrá ese documento puntual en Firestore Console
(colección `openingsCache`) y se va a volver a resolver la próxima vez que salga.

## 7. Deploy del front (Vercel)

Ya tenés el proyecto conectado en Vercel. Solo falta que en **Project Settings →
Environment Variables** cargues las mismas variables que tenés en tu `.env` local
(las `VITE_FIREBASE_*` y `VITE_YOUTUBE_API_KEY`) — Vercel las necesita en build time,
no alcanza con que estén en tu compu. Después de guardarlas, hacé un redeploy.

## Decisiones técnicas y limitaciones conocidas

- **Rating de anime / tamaño de fandom**: vía [Jikan](https://jikan.moe) (API no oficial
  de MyAnimeList, gratis, sin key). `score` = rating, `members` = proxy de fandom (no existe
  una métrica real de "tamaño de fandom" en ninguna API pública).
- **Rating por episodio**: MAL/AniList no tienen rating por episodio individual. Se usa el
  dataset **no-comercial oficial** de IMDb (autorizado explícitamente para este uso, a
  diferencia de scrapear la web en vivo, que sus Términos prohíben). Se descartó SeriesGraph
  porque sus ToS prohíben expresamente el scraping automatizado sin permiso escrito. El
  refresco corre en GitHub Actions (no en Cloud Functions) porque Functions exige el plan
  Blaze de Firebase; Firestore por sí solo es gratis en el plan Spark.
- **Vistas de openings**: YouTube Data API v3. Los `videoId` se resuelven una vez con
  `scripts/resolve-openings.mjs` (búsqueda) y quedan fijos en `src/data/openingsSeed.json`;
  las vistas se consultan en vivo (`videos.list`, gasta 1 unit de cuota por partida, no rompe
  el límite gratis diario).
- **Anti-cheat del leaderboard**: el puntaje se escribe directo desde el cliente a Firestore.
  Las reglas evitan que alguien toque el puntaje de otro usuario, pero no evitan que alguien
  logueado edite su propio `totalPoints` desde la consola del navegador. Para una entrega de
  facultad esto es un límite aceptable; si esto se pone serio en algún momento, hay que mover
  la suma de puntos a una Cloud Function `callable` que valide server-side.
