<div align="center">
  <img src="build-resources/icon.png" width="72" alt="Yami" />
  <h1>Yami</h1>
  <p><strong>Free, open-source desktop music player.</strong><br/>Stream any song. No account. No subscription.</p>

  <p>
    <img src="https://img.shields.io/github/v/release/Yami-20/yami-app?style=flat-square&color=9b59f5&label=version" />
    <img src="https://img.shields.io/badge/platform-Linux%20%7C%20Windows%20%7C%20Android-blue?style=flat-square" />
    <img src="https://img.shields.io/github/license/Yami-20/yami-app?style=flat-square&color=aaa" />
  </p>
</div>

---

## Features

- **Stream any song** — powered by iTunes + yt-dlp, no sign-in required
- **Smart radio** — multi-source suggestion engine, never repeats, no same-artist clustering
- **Playlist import** — paste a public Spotify, YouTube Music, or Apple Music playlist link to import it
- **Synced lyrics**, **listening stats**, **drag-to-reorder queue**
- **Media key support** — physical ⏮ ⏯ ⏭ keys control playback
- **Auto-updater** — notified when a new version is ready

---

## Install

Download the latest build for your platform from https://yami-app.netlify.app/

OR YOU CAN DOWNLOAD IT FROM RELEASES TOO.

- **Linux** — `yami_<version>_amd64.deb` → `sudo dpkg -i yami_*.deb`
- **Windows** — `yami-Setup-<version>.exe` (installer) or portable `.exe`
- **Android** — `app-debug.apk` (enable "Install unknown apps" for your browser/file manager)

---

## Build from source

```bash
git clone https://github.com/Yami-20/yami-app.git
cd yami-app
npm install --legacy-peer-deps

npm run electron:dev          # run in development
npm run electron:build:linux  # build Linux .deb
npm run electron:build:win    # build Windows .exe
npm run cap:build:android     # build Android .apk (requires Android SDK + JDK 21)
```

Requires Node.js 20+. See [DEPLOY.md](DEPLOY.md) for release instructions.

---

## Backend

Yami's streaming/search/import backend runs as a separate service on [Render](https://render.com) — see [server-deploy/README.md](server-deploy/README.md) to deploy your own. Set `REACT_APP_BACKEND_URL` to point the app at it.

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `Alt + →` / `Alt + ←` | Next / Previous |
| `M` | Mute |

---

## Tech stack

React 19 · Electron 33 · Capacitor 7 · Express · iTunes Search API · Last.fm API · yt-dlp

---

## License

MIT © 2026 Yami
