# Spotifi

A React music home page at `/home`, based on the supplied Figma home design.
Built with Vite, Tailwind CSS, daisyUI, and Lucide React. No login is required.
The root URL redirects to `/home`.

Backend repository: [Spotifi backend](https://github.com/lqk7923/Spotifi.git).

## Run locally

```sh
npm install
npm run dev
```

Start the music backend on `http://localhost:8080`, then open
`http://localhost:5173/home` (use the port printed by Vite if 5173 is occupied).
Vite forwards `/track` requests to the backend during development and preview.
To change the backend address, copy `.env.example` to `.env.local` and set
`API_PROXY_TARGET`.

## Music API

- `GET /track/all`: direct JSON array of `{ bucketName, trackId, trackTitle, trackDuration, author }`. `trackDuration` is milliseconds (for example, `12000` means 12 seconds).
- `GET /track/{bucket}/{trackId}`: JSON `{ "trackPresignedLink": "https://..." }`, valid for two minutes. Both path parameters are URL-encoded.

The page uses real API titles, authors, and durations with generated cover illustrations.
Missing titles/authors fall back to IDs/collections. API durations are converted from
milliseconds to seconds for display and player controls; loaded audio metadata takes
precedence. An unavailable backend shows a retry state; an empty database shows an
empty library.

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

Deploy `dist` with a fallback to `index.html` for `/home`. Configure a reverse proxy
for `/track`, or set `VITE_API_BASE_URL` to a full backend API prefix before building
and allow the frontend origin through backend CORS. The browser must be able to access
the signed R2 audio URL directly; the backend signing endpoint does not stream audio.

## Source structure

- `src/App.jsx`: route entry and shared stylesheet.
- `src/pages/HomePage.jsx`: composes the home page and connects library/player hooks.
- `src/components/`: sidebar, highlights, track table, queue, player controls, and shared buttons/artwork.
- `src/hooks/useMusicLibrary.js`: list loading, local search/filter state, and persisted likes.
- `src/hooks/useAudioPlayer.js`: audio lifecycle, playback controls, and next-track selection.
- `src/lib/music-api.js`: backend requests and response handling.
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

## Styling and icons

Tailwind utilities and daisyUI classes can be used directly in JSX. Import icons
individually, for example `import { Play } from 'lucide-react'`.

Documentation: [Tailwind CSS](https://tailwindcss.com/docs/installation/using-vite),
[daisyUI](https://daisyui.com/docs/install/vite/),
and [Lucide React](https://lucide.dev/guide/react).
