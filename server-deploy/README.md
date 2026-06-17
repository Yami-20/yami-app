# Yami Backend — Render Deployment

This is the standalone backend that powers Yami's streaming, search, and playlist import. It runs independently of the Electron/Android client and is deployed to [Render](https://render.com) as a Docker web service.

## What it does

- Proxies and caches iTunes Search API calls
- Resolves audio stream URLs via `yt-dlp`
- Imports playlists from Spotify, YouTube Music, and Apple Music

## Deploy to Render

1. Push this repo to GitHub (already done if you're reading this from the repo)
2. In Render: **New → Blueprint** → connect this repo → Render reads `render.yaml` from the repo root automatically
3. Or manually: **New → Web Service** → Docker → set:
   - **Dockerfile path:** `server-deploy/Dockerfile`
   - **Docker context:** repo root (`.`)
   - **Health check path:** `/health`
4. Render builds the image (installs `yt-dlp` standalone binary + Node deps) and deploys
5. Copy the live URL (e.g. `https://yami-backend.onrender.com`)

## Point the app at your backend

Set `REACT_APP_BACKEND_URL` at build time:

```bash
REACT_APP_BACKEND_URL=https://your-backend.onrender.com npm run build
```

The CI workflow (`.github/workflows/build.yml`) already sets this for all three platform builds via the `env.REACT_APP_BACKEND_URL` key at the top of the file — update it there once your Render URL is live.

## Local development

You don't need Docker for local dev — just run the server directly:

```bash
npm run server:dev
```

This uses `server.js` at the repo root (kept in sync with `server-deploy/server.js`) with `cors`/`express` installed as devDependencies.

## Free tier notes

Render's free web services spin down after 15 minutes of inactivity and take ~30–50s to wake on the next request. The app's `/health` polling will show an "offline" banner briefly during cold starts — this is expected on the free tier, not a bug.
