<div align="center">
  <img src="build-resources/logo.png" width="80" alt="Yami" />
  <h1>Yami</h1>
  <p>A dark, fast, free music player — powered by iTunes & Spotify</p>

  ![Version](https://img.shields.io/github/v/release/Yami-20/yami-app?style=flat-square&color=a78bfa)
  ![Platform](https://img.shields.io/badge/platform-Linux-blue?style=flat-square)
  ![License](https://img.shields.io/badge/license-MIT-pink?style=flat-square)
</div>

---

## What is Yami?

Yami is a free, open-source desktop music player built with Electron + React. It streams music using the iTunes API — no subscription, no account, no ads. Connect your Spotify account to import your playlists and liked songs directly into Yami.

---

## Features

- 🎵 **Instant music streaming** — search and play any song, no account needed
- 🟢 **Spotify import** — connect your free Spotify account, browse your playlists and Liked Songs
- ❤️ **Liked Songs** — like tracks and build your local library
- 📻 **Radio mode** — auto-queues similar songs when your queue ends
- 🕒 **Recently Played** — full playback history
- 🎨 **Glassmorphism UI** — dark purple aesthetic with blur effects
- ⌨️ **Keyboard friendly** — search with Enter, control playback inline
- 🔊 **Queue management** — reorder, remove, clear
- 🖥️ **Native Electron app** — custom titlebar, frameless window

---

## Installation (Linux)

### Option 1 — Download (recommended)

1. Go to [Releases](../../releases/latest)
2. Download `yami_0.4.3_amd64.deb`
3. Install:
```bash
sudo dpkg -i yami_0.4.3_amd64.deb
```
4. Launch from your app menu or run `yami`

---

### Option 2 — Build from source

**Requirements:** Node.js 18+, yt-dlp

```bash
git clone https://github.com/Yami-20/yami-app.git
cd yami-app
npm install
npm run electron:build:linux
sudo dpkg -i dist/yami_*_amd64.deb
```

---

## Spotify Setup

Yami uses Spotify only as a **library browser** — it reads your playlists and matches songs via iTunes for playback. No Premium needed.

1. Go to the **Spotify** tab in Yami
2. Click **Log in with Spotify**
3. Authorize in your browser — you'll be redirected back automatically
4. Browse your playlists and click **Import** to add them to your queue

> Your Spotify credentials are never stored by Yami. Login uses OAuth PKCE — industry standard, no secrets involved.

---

## Tech Stack

| Layer | Tech |
|---|---|
| UI | React 19, React Router |
| Desktop | Electron 31 |
| Styling | CSS (glassmorphism, custom design system) |
| Music | iTunes Search API |
| Spotify | Spotify Web API (PKCE OAuth) |
| Streaming | yt-dlp + Express backend |
| Icons | React Icons (Remix) |
| Fonts | Syne, DM Sans, DM Mono |

---

## Project Structure

```
yami-app/
├── electron/          # Electron main process + preload
├── src/
│   ├── api/           # iTunes + Spotify API clients
│   ├── components/    # Sidebar, Player, NowPlaying, Toast
│   ├── context/       # Global state (YamiContext)
│   ├── pages/         # Home, Search, Library, Liked, History, Settings, Spotify
│   └── styles/        # yami.css — full design system
├── build-resources/   # App icons
└── server.js          # Local Express server for yt-dlp streaming
```

---

## Contributing

Pull requests are welcome. For major changes, open an issue first.

```bash
git clone https://github.com/Yami-20/yami-app.git
cd yami-app
npm install
npm run electron:dev   # Start in dev mode
```

---

## License

MIT © [Yami-20](https://github.com/Yami-20)
