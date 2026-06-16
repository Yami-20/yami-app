<div align="center">
  <img src="build-resources/icon.png" width="72" alt="Yami" />
  <h1>Yami</h1>
  <p><strong>Free, open-source desktop music player.</strong><br/>Stream any song. No account. No subscription.</p>

  <p>
    <img src="https://img.shields.io/github/v/release/Yami-20/yami-app?style=flat-square&color=9b59f5&label=version" />
    <img src="https://img.shields.io/badge/platform-Linux%20%7C%20Windows-blue?style=flat-square" />
    <img src="https://img.shields.io/github/license/Yami-20/yami-app?style=flat-square&color=aaa" />
  </p>
</div>

---

## Features

- **Stream any song** — powered by iTunes + yt-dlp, no sign-in required
- **Smart radio** — multi-source suggestion engine, never repeats, no same-artist clustering
- **Spotify import** — connect your account to browse playlists and liked songs
- **Synced lyrics**, **listening stats**, **drag-to-reorder queue**
- **Media key support** — physical ⏮ ⏯ ⏭ keys control playback
- **Auto-updater** — notified when a new version is ready

---

## Install

Download the latest build for your platform from [Releases](../../releases/latest):

- **Linux** — `yami_<version>_amd64.deb` → `sudo dpkg -i yami_*.deb`
- **Windows** — `yami-Setup-<version>.exe` (installer) or portable `.exe`

---

## Build from source

```bash
git clone https://github.com/Yami-20/yami-app.git
cd yami-app
npm install --legacy-peer-deps

npm run electron:dev          # run in development
npm run electron:build:linux  # build Linux .deb
npm run electron:build:win    # build Windows .exe
```

Requires Node.js 20+. See [DEPLOY.md](DEPLOY.md) for release instructions.

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `Alt + →` / `Alt + ←` | Next / Previous |
| `M` | Mute |

---

## Tech stack

React 19 · Electron 33 · Express · iTunes Search API · Last.fm API · yt-dlp

---

## License

MIT © 2026 Yami
