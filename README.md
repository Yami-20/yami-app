<div align="center">
  <img src="build-resources/icon.png" width="72" alt="Yami" />

  <h1>Yami</h1>
  <p><strong>Free, open-source desktop music player.</strong><br/>Stream any song. No subscription. No account.</p>

  <p>
    <img src="https://img.shields.io/github/v/release/Yami-20/yami-app?style=flat-square&color=00c9a7&label=version" />
    <img src="https://img.shields.io/badge/platform-Linux%20%7C%20Windows-blue?style=flat-square" />
    <img src="https://img.shields.io/badge/built_with-Electron_%2B_React-61dafb?style=flat-square" />
    <img src="https://img.shields.io/github/license/Yami-20/yami-app?style=flat-square&color=aaa" />
  </p>
</div>

---

## What is Yami?

Yami is a desktop music player that streams songs via the iTunes API — no account, no subscription, no ads. Connect Spotify to import your playlists and liked songs. Yami remembers what you've played and builds smart radio queues that stay fresh.

---

## Features

### Playback
- **Stream any song** — powered by iTunes + yt-dlp, no sign-in required
- **Smart skip** — ⏭ always plays a fresh, unheard track, never repeats
- **Radio mode** — auto-queues similar songs when your queue ends
- **5-source suggestion engine** — similar tracks, similar artists, genre pool, mood tags, all merged and artist-interleaved for variety
- **Repeat & shuffle** — repeat one, repeat all, shuffle queue
- **Media key support** — physical ⏮ ⏯ ⏭ keyboard keys control Yami

### Library
- **Liked Songs** — heart any track, play all or shuffle
- **Queue** — drag to reorder, remove individual tracks, clear all
- **Recently Played** — full history, searchable
- **Spotify import** — connect your account to browse playlists and liked songs

### Experience
- **Synced lyrics** — real-time word-highlighted lyrics via lrclib
- **Stats page** — minutes listened, top tracks, top artists
- **Now Playing panel** — full artwork, lyrics, queue in one view
- **Auto-updater** — notified when a new version is ready

### Desktop
- **Frameless Electron window** — custom title bar, native feel
- **Offline detection** — banner shown when connection drops
- **Error recovery** — backend auto-restarts on crash (up to 5×)
- **Media keys** — system-level play/pause/skip via `globalShortcut`

---

## Install

### Linux

Download `yami_1.5.0_amd64.deb` from [Releases](../../releases/latest) and install:

```bash
sudo dpkg -i yami_1.5.0_amd64.deb
```

Then launch from your app menu or run `yami`.

### Windows

Download from [Releases](../../releases/latest):

- `yami-Setup-1.5.0.exe` — standard installer
- `yami-1.5.0.exe` — portable, no install needed

---

## Build from source

**Requirements:** Node.js 20+, Git

```bash
git clone https://github.com/Yami-20/yami-app.git
cd yami-app
npm install --legacy-peer-deps
```

**Run in development:**

```bash
# Web only (React dev server)
npm start

# Full Electron app (dev mode)
npm run electron:dev
```

**Build for distribution:**

```bash
# Linux .deb
npm run electron:build:linux

# Windows .exe (run on Windows)
npm run electron:build:win
```

> yt-dlp is downloaded automatically by the CI workflow. For local builds, download it to `build-resources/yt-dlp` (Linux) or `build-resources/yt-dlp.exe` (Windows).

---

## Project structure

```
yami-app/
├── electron/           # Electron main process
│   ├── main.js         # Window, IPC, media keys, auto-updater, backend spawn
│   └── preload.js      # Context bridge — exposes APIs to renderer
├── src/
│   ├── api/            # itunes.js, lastfm.js, spotify.js
│   ├── assets/         # logo.png (imported as module)
│   ├── components/     # YamiPlayer, Sidebar, NowPlayingPanel, SongCard, Toast...
│   ├── context/        # YamiContext (playback, queue, suggestions), UserContext
│   ├── pages/          # Home, Search, Library, Liked, Lyrics, Stats, Settings...
│   └── styles/         # yami.css (single stylesheet, design system v5)
├── build-resources/    # icon.png, icon.ico (app icons for packaging)
├── server.js           # Express backend — iTunes proxy, yt-dlp stream, Spotify
└── package.json
```

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `Alt + →` | Next track |
| `Alt + ←` | Previous track |
| `M` | Toggle mute |
| Physical media keys | Play / Pause / Next / Prev |

---

## Releasing a new version

1. Make your changes and commit
2. Bump `version` in `package.json`
3. Push and tag:

```bash
git tag v1.x.x
git push origin v1.x.x
```

GitHub Actions builds Linux `.deb` and Windows `.exe` automatically and attaches them to the release. See [DEPLOY.md](DEPLOY.md) for details.

---

## Tech stack

| Layer | Tech |
|-------|------|
| UI framework | React 19 |
| Desktop shell | Electron 33 |
| Routing | React Router 7 |
| Music data | iTunes Search API |
| Suggestions | Last.fm API |
| Streaming | yt-dlp |
| Drag & drop | @dnd-kit |
| Backend | Express 5 (Node.js) |
| Build | react-scripts + esbuild + electron-builder |

---

## License

MIT © 2026 Yami
