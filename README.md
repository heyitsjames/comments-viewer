# Comments Viewer

Frontend-only YouTube comments viewer. Paste a video URL; comments stream in from the official YouTube Data API v3.

## Setup

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project, enable **YouTube Data API v3**, and create an API key.
2. Restrict the key to that API and HTTP referrers `http://localhost:5173/*`.
3. Copy `.env.example` to `.env.local` and set `VITE_YOUTUBE_API_KEY`. Restart the dev server after changing it.

## Scripts

```sh
npm install
npm run dev
```

Production build is a static bundle (`npm run build`) with the same client-side fetch code.
