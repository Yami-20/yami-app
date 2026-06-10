<div align="center">
  <img src="build-resources/logo.png" width="80" alt="Yami" />
  <h1>Yami</h1>
  <p>A dark, intelligent music player — powered by iTunes, Last.fm & Spotify</p>

  ![Version](https://img.shields.io/github/v/release/Yami-20/yami-app?style=flat-square&color=a78bfa)
  ![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Windows-blue?style=flat-square)
  ![License](https://img.shields.io/badge/license-MIT-pink?style=flat-square)
</div>

---

## What is Yami?

Yami is a free, open-source desktop music player built with Electron + React. It streams music using the iTunes API — no subscription, no account, no ads. Connect your Spotify account to import your playlists and liked songs directly into Yami.

---

## Features

- 🎵 **Instant music streaming** — search and play any song, no account needed
- 🧠 **Smart radio** — multi-source suggestion engine (Last.fm similar tracks + similar artists + genre + mood tags) that never repeats songs and avoids clustering same artists back-to-back
- 🟢 **Spotify import** — connect your Spotify account, browse playlists and Liked Songs
- ❤️ **Liked Songs** — like tracks and build your local library
- 📻 **Radio mode** — auto-queues similar songs when your queue ends, refills in the background
- 🕒 **Recently Played** — full playback history with stats
- 📊 **Stats page** — minutes listened, top tracks, top artists
- 🎤 **Synced lyrics** — real-time word-highlighted lyrics powered by lrclib
- 🎨 **Glassmorphism UI** — dark purple aesthetic, smooth animations
- ⌨️ **Keyboard shortcuts** — Space (play/pause), Alt+→ (next), Alt+← (prev), M (mute)
- 🔊 **Queue management** — reorder, remove, clear
- 🖥️ **Native Electron app** — custom titlebar, frameless window

---

## Installation

### Linux

1. Go to [Releases](../../releases/latest)
2. Download `yami_1.1.0_amd64.deb`
3. Install:
```bash
sudo dpkg -i yami_1.1.0_amd64.deb
```
4. Launch from your app menu or run `yami`

### Windows

1. Go to [Releases](../../releases/latest)
2. Download `yami-Setup-1.1.0.exe` (installer) or `yami-1.1.0-portable.exe` (no install needed)
3. Run the installer or portable exe

---

## Build from source

**Requirements:** Node.js 20+, yt-dlp

```bash
git clone https://github.com/Yami-20/yami-app.git
cd yami-app
npm install --legacy-peer-deps

# Linux .deb
npm run electron:build:linux

# Windows .exe
npm run electron:build:win
```

---

## yt-dlp dependency

The streaming backend uses yt-dlp to fetch audio streams. The build workflow downloads it automatically. For local dev:

**Linux:**
```bash
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

**Windows:** Download `yt-dlp.exe` from [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases) and place it in your PATH.

---

## Local development

```bash
npm install --legacy-peer-deps

# Web app (React only)
npm start

# Desktop (Electron dev mode)
node server.js &
npm run electron:dev
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `Alt + →` | Next track |
| `Alt + ←` | Previous track |
| `M` | Toggle mute |

---

## License

MIT © 2026 Yami
