# Spotifi

A React music home page at `/`, based on the supplied Figma home design.
Built with Vite, Tailwind CSS, daisyUI, and Lucide React. No login is required.
Albums have dedicated pages at `/album/{uuid}`. Click the Spotifi logo to return
to Home; browser Back/Forward also works. The old `/home` URL redirects to `/`.
The player remains mounted when navigating between Home and an album.

Backend repository: [Spotifi backend](https://github.com/lqk7923/Spotifi.git).

## Run locally

```sh
npm install
npm run dev
```

Start the music backend on `http://localhost:8080`, then open
`http://localhost:5173/` (use the port printed by Vite if 5173 is occupied).
Vite forwards `/track` and `/album/{uuid}/tracks` API requests to the backend during
development and preview. Album page URLs serve the frontend so deep links and reloads work.
To change the backend address, copy `.env.example` to `.env.local` and set
`API_PROXY_TARGET`.

## Music API

- `GET /track/all`: direct JSON array of `{ bucketName, trackId, trackTitle, trackDuration, author, albumId, albumTitle }`. `trackDuration` is milliseconds (for example, `12000` means 12 seconds). `author` is the album author; only tracks with a matching album are returned.
- `GET /album/{albumId}/tracks`: JSON album object `{ albumId, albumTitle, author, albumTracks }`. Each item in `albumTracks` contains `{ bucketName, trackId, trackTitle, trackDuration }`. Opening an album in the sidebar or track table fetches this endpoint using the UUID from the track response. The header reads the album's title and author directly; tracks inherit these fields and `albumId` for playback, search, and the queue. The backend returns an error for empty or nonexistent albums. HTTP 404 displays "Could not find that album". Network and server failures retain the retry state.
- `GET /track/{bucket}/{trackId}`: JSON `{ "trackPresignedLink": "https://..." }`, valid for two minutes. Both path parameters are URL-encoded.

The page uses real API titles, authors, and durations with generated cover illustrations.
Missing titles/authors fall back to IDs/collections. API durations are converted from
milliseconds to seconds for display and player controls; loaded audio metadata takes
precedence. An unavailable backend shows a retry state; an empty database shows an
empty library.

Albums are grouped by `albumId`; search includes album titles and IDs. Playback and
the queue use the selected album's returned tracks. List order follows the response;
the backend currently provides no pagination or guaranteed sort order. For production,
`VITE_API_BASE_URL` accepts the backend root (and the legacy `/track` prefix).

Playback supports play/pause, seeking, volume/mute, previous/next, shuffle, repeat,
and a queue. Tracks without a usable preload request a fresh signed URL. Resuming after a long pause
refreshes the URL while preserving the playback position. Audio network/source errors
retry with one fresh URL before showing an error. Rapid track changes cancel earlier
requests so an older response cannot replace the selected track. Playback stops at
the end of the collection unless shuffle or repeat is enabled.

## Next-track preload

After playback starts, the player signs the predicted next track and fetches only
`Range: bytes=0-2499999` (2.5 decimal MB). The first track is also preloaded once
the library arrives. Only one upcoming prefix is kept in memory. Shuffle reserves
its next selection so pressing Next plays the track that was actually preloaded.

Next, automatic advancement, and selecting that same upcoming track consume its
cached prefix. A narrow Service Worker endpoint feeds those bytes to the existing
HTML audio element, then streams the remainder from R2 starting at byte 2,500,000.
It does not wait for the complete file or combine the file into a full Blob before
playing. Smaller files are fully cached. Native seek requests are supported: ranges
inside the prefix use cache, while ranges beyond it go to R2 at their requested offset.

The active prefix is kept in Cache Storage so playback survives Service Worker
restarts. It is released on track changes/unmount; orphaned prefixes from closed
pages are cleaned up when a new prefix is stored. Cache writes and releases run in
message order per tab so rapid track changes cannot remove the newest prefix.
Other API/page requests pass through.
Only prefixes are retained by this feature; the browser manages buffering the remainder.
Track IDs must identify immutable audio files so a refreshed signature points to the
same bytes. A signature older than 110 seconds is refreshed before the next R2 request;
401/403 responses refresh once more without discarding the prefix.

Changing the predicted track cancels the old preload. If a user selects it before
preload is ready, the player waits at most 150 ms for that preload, then cancels it
and uses ordinary playback. Unsupported Service Workers, cache failures, and invalid
range/CORS responses also fall back to ordinary playback.

Production requires HTTPS (localhost works for development), and
`audio-preload-worker.js` must be served as JavaScript rather than the SPA fallback.
The R2 bucket must allow the frontend origin, `GET` and the `Range` request header,
and expose `Content-Range` to JavaScript. An example bucket CORS policy is:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173", "http://127.0.0.1:5173", "https://your-frontend.example"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["Range"],
    "ExposeHeaders": ["Content-Range", "Content-Length", "Accept-Ranges", "Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

See [Cloudflare R2 CORS configuration](https://developers.cloudflare.com/r2/buckets/cors/)
for applying the bucket policy. Service Worker registration requirements are described
in [MDN's registration reference](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register).

For local development, `r2-cors.local.json` contains a ready-to-paste **Cloudflare
dashboard** policy (not the Wrangler CLI format). Open R2 Object Storage, select
the audio bucket, then Settings > CORS Policy > JSON. Add these development origins
to the existing policy while preserving any production origins, and save. The origin
must match the actual frontend scheme/hostname/port, without a trailing slash or path.
The `/track` Vite proxy only proxies the signing API; signed audio is fetched
directly from R2, so enabling CORS on the backend does not enable it on R2.

After saving, reload the app to obtain a fresh signed URL. On the R2 range request,
check for status 206, `Access-Control-Allow-Origin: http://localhost:5173`, and
`Access-Control-Expose-Headers` including `Content-Range`. If Network shows 403,
check signature expiration/validity as well: R2 omits CORS headers on expired
presigned URL responses, so these can also appear as a CORS error. Reusing a copied
URL after its two-minute lifetime is not a valid test of the current CORS policy.

To verify in DevTools Network, play a track and look for the next track's
`bytes=0-2499999` request with status 206 and a matching `Content-Range` response.
Press Next: playback uses `/__audio_preload__/<id>`, and the R2 continuation normally
starts at `bytes=2500000-...`; subsequent seek requests may use different offsets.
The following track should then receive its own prefix request. Signed URLs are
not cache identities: the cache belongs to the selected track's playback session.

Search filters titles, authors, track IDs, and collections locally. Likes are saved in browser storage;
they are not sent to the backend.

## Production

```sh
npm run build
npm run preview
```

Deploy `dist` with an SPA fallback to `index.html` for `/` and `/album/{uuid}`.
Configure a reverse proxy for `/track` and `/album/{uuid}/tracks` API requests,
or set `VITE_API_BASE_URL` to the backend root before building
and allow the frontend origin through backend CORS. The browser must be able to access
the signed R2 audio URL directly; the backend signing endpoint does not stream audio.

### Render deployment and direct album links

The repository includes `render.yaml` for a Render Static Site Blueprint with an
SPA rewrite. Home (`/`) and Album (`/album/{uuid}`) are independent page routes;
the server must serve `index.html` for a direct album request so React can render
the Album page and fetch its tracks without first visiting Home.

For the existing `spotifi-music-for-life` site, open **Render Dashboard > Static
Site > Redirects/Rewrites** and add this rule:

| Source | Destination | Action |
| --- | --- | --- |
| `/*` | `/index.html` | Rewrite |

Use **Rewrite** so the browser retains `/album/{uuid}`. A Redirect to `/` would
instead render Home. Render serves existing files before applying rewrite rules,
so the JS/CSS assets and `audio-preload-worker.js` continue to load normally.
See [Render's redirect/rewrite documentation](https://render.com/docs/redirects-rewrites).

**Deploying code alone does not apply `render.yaml` to a manually created site.**
Either add the Dashboard rule above or link/sync the existing service through a
[Render Blueprint](https://render.com/docs/infrastructure-as-code). Keep the
existing `VITE_API_BASE_URL` set to the public backend root when building: Vite's
development proxy is not available on a Render Static Site.

After applying the rule, open `/album/00000000-0000-0000-0000-000000000001`
in a new tab and reload it. Both requests should return HTML with status 200 and
display the Album page; `/` should still display Home.

## Source structure

- `src/App.jsx`: route entry and shared stylesheet.
- `src/pages/HomePage.jsx`, `AlbumPage.jsx`: dedicated Home and album content.
- `src/components/MusicLayout.jsx`: shared library/player hooks and persistent player layout.
- `src/components/`: sidebar, highlights, track table, queue, player controls, and shared buttons/artwork.
- `src/hooks/useMusicLibrary.js`: list loading, local search/filter state, and persisted likes.
- `src/hooks/useAudioPlayer.js`: audio lifecycle, playback controls, and next-track selection.
- `src/lib/music-api.js`: backend requests and response handling.
- `src/lib/navigation.js`, `src/hooks/useRoute.js`: URL routing and browser history.
- `src/lib/tracks.js`, `format.js`: track identity, validation, filtering, and display formatting.
- `src/lib/audio-preload.js`: optional next-track preload and communication with the Service Worker.
- `public/audio-preload-worker.js`: cached byte ranges and signed URL renewal; served directly at the app root.

## Validation

```sh
npm run lint
npm test
npm run build
```

For isolated browser testing with sample track IDs and silent WAV audio:

```sh
node tests/fixture-server.mjs
```

In a second terminal, start Vite with `API_PROXY_TARGET=http://127.0.0.1:8081`
(for PowerShell: `$env:API_PROXY_TARGET='http://127.0.0.1:8081'; npm run dev`).
The fixture is only for testing and is never used by the default app configuration.

## Preload benchmark

With Vite running, open `http://localhost:5173/benchmarks/preload.html` to compare
native playback, a ready preload, and selection during an in-flight preload.
The page reports startup p50/p95, preparation time, cache hits, and observation
window stalls, and exports raw JSON. It supports the real backend/R2 and an
optional dev-only network fixture on the same port. See
[benchmark methodology](benchmarks/README.md) for controls and limitations.

## Styling and icons

Tailwind utilities and daisyUI classes can be used directly in JSX. Import icons
individually, for example `import { Play } from 'lucide-react'`.

Documentation: [Tailwind CSS](https://tailwindcss.com/docs/installation/using-vite),
[daisyUI](https://daisyui.com/docs/install/vite/),
and [Lucide React](https://lucide.dev/guide/react).
