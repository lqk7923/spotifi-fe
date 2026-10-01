# Spotifi

A React music home page at `/home`, based on the supplied Figma home design.
Built with Vite, Tailwind CSS, daisyUI, and Lucide React. No login is required.
The root URL redirects to `/home`.

## Run locally

```sh
npm install
npm run dev
```

Start the music backend on `http://localhost:8080`, then open
`http://localhost:5173/home` (use the port printed by Vite if 5173 is occupied).
Vite forwards `/api-test` requests to the backend during development and preview.
To change the backend address, copy `.env.example` to `.env.local` and set
`API_PROXY_TARGET`.

## Music API

- `GET /api-test/all`: JSON array of `{ bucketName, trackId }`.
- `GET /api-test/{bucket}/{trackId}`: plain-text signed audio URL, valid for two minutes.

The page uses real API responses. Since the API has no titles, artists, or artwork,
tracks are labeled using their IDs and use generated cover illustrations. Duration
appears after the audio metadata loads. An unavailable backend shows a retry state;
an empty database shows an empty library.

Playback supports play/pause, seeking, volume/mute, previous/next, shuffle, repeat,
and a queue. Each new track requests a fresh signed URL. Resuming after a long pause
refreshes the URL while preserving the playback position. Audio network/source errors
retry with one fresh URL before showing an error. Rapid track changes cancel earlier
requests so an older response cannot replace the selected track. Playback stops at
the end of the collection unless shuffle or repeat is enabled.

Search filters track IDs and collections locally. Likes are saved in browser storage;
they are not sent to the backend.

## Production

```sh
npm run build
npm run preview
```

Deploy `dist` with a fallback to `index.html` for `/home`. Configure a reverse proxy
for `/api-test`, or set `VITE_API_BASE_URL` to a full backend API prefix before building
and allow the frontend origin through backend CORS. The browser must be able to access
the signed R2 audio URL directly; the backend signing endpoint does not stream audio.

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
