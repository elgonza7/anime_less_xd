# Setup de AniVersus

## 1. Instalar dependencias

```bash
npm install
```

## 2. Crear el proyecto de Firebase

1. Entrá a https://console.firebase.google.com y creá un proyecto nuevo (gratis, plan Spark alcanza).
2. **Authentication** → Sign-in method → habilitá **Google**.
3. **Firestore Database** → creá la base (modo producción, cualquier región).
4. **Project settings** → **Your apps** → agregá una Web App → copiá el objeto `firebaseConfig`.
5. Pegá esos valores en `.env` (usá `.env.example` como plantilla):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

6. En **Authentication → Settings → Authorized domains**, agregá el dominio donde vayas a
   deployar (Vercel/Render/lo que sea), sino el login con Google no va a andar ahí.

## 3. Correr en local

```bash
npm run dev
```

Sin Firebase configurado la app anda igual (podés jugar), pero el ranking queda
bloqueado con el mensaje de "iniciá sesión".

## 4. Deployar Firestore rules y Cloud Functions

```bash
npm install -g firebase-tools   # si no lo tenés
firebase login
firebase use --add              # elegí el proyecto que creaste en el paso 2
cd functions && npm install && cd ..
firebase deploy --only firestore:rules,functions
```

Esto sube:
- `firestore.rules`: reglas de seguridad (leaderboard requiere login, episodeRatings es solo lectura).
- `functions/updateEpisodeRatings`: job que corre **solo, todos los días a las 8am hora Argentina**,
  descarga los datasets oficiales no-comerciales de IMDb (`title.episode.tsv.gz` + `title.ratings.tsv.gz`)
  y guarda los ratings por episodio en Firestore, solo para los animes listados en
  `src/data/animeImdbSeed.js` (y su copia en `functions/index.js`).

## 5. Primera carga de datos de episodios (no esperar al cron)

Después del deploy, el job recién va a correr la primera vez a las 8am. Para no esperar,
llamá una vez a mano al endpoint manual que quedó publicado:

```bash
curl https://<tu-region>-<tu-project-id>.cloudfunctions.net/updateEpisodeRatingsNow
```

(La URL exacta te la muestra la terminal cuando corras `firebase deploy`.)

## 6. YouTube Data API

Ya viene la key puesta en `.env` (la que pasaste por el chat). **Recomendación fuerte:**
como esa key quedó en texto plano en la conversación, andá a
Google Cloud Console → APIs & Services → Credentials → esa key → **Restringila**
(a "YouTube Data API v3" + al dominio de tu app) o mejor, **regenerala** y poné la nueva
en tu `.env` local antes de deployar a producción. Nunca la subas a GitHub (`.env` ya
está en `.gitignore`).

Si en algún momento querés ampliar la lista de openings, editá
`scripts/resolve-openings.mjs` y corré:

```bash
node --env-file=.env scripts/resolve-openings.mjs
```

Esto vuelve a generar `src/data/openingsSeed.json`. Revisá a mano el `resolvedTitle` /
`channelTitle` de cada uno: la búsqueda de YouTube a veces trae un cover o una
compilación en vez del opening oficial.

## 7. Deploy del front (Vercel / Firebase Hosting / lo que sea)

```bash
npm run build
```

Sube la carpeta `dist/`. Si usás Firebase Hosting: `firebase deploy --only hosting`.
Acordate de configurar las mismas variables `VITE_*` como env vars en el servicio que
elijas (Vercel, Render, etc.) — el build las necesita en tiempo de compilación.

## Decisiones técnicas y limitaciones conocidas

- **Rating de anime / tamaño de fandom**: vía [Jikan](https://jikan.moe) (API no oficial
  de MyAnimeList, gratis, sin key). `score` = rating, `members` = proxy de fandom (no existe
  una métrica real de "tamaño de fandom" en ninguna API pública).
- **Rating por episodio**: MAL/AniList no tienen rating por episodio individual. Se usa el
  dataset **no-comercial oficial** de IMDb (autorizado explícitamente para este uso, a
  diferencia de scrapear la web en vivo, que sus Términos prohíben). Se descartó SeriesGraph
  porque sus ToS prohíben expresamente el scraping automatizado sin permiso escrito.
- **Vistas de openings**: YouTube Data API v3. Los `videoId` se resuelven una vez con
  `scripts/resolve-openings.mjs` (búsqueda) y quedan fijos en `src/data/openingsSeed.json`;
  las vistas se consultan en vivo (`videos.list`, gasta 1 unit de cuota por partida, no rompe
  el límite gratis diario).
- **Anti-cheat del leaderboard**: el puntaje se escribe directo desde el cliente a Firestore.
  Las reglas evitan que alguien toque el puntaje de otro usuario, pero no evitan que alguien
  logueado edite su propio `totalPoints` desde la consola del navegador. Para una entrega de
  facultad esto es un límite aceptable; si esto se pone serio en algún momento, hay que mover
  la suma de puntos a una Cloud Function `callable` que valide server-side.
