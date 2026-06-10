# Deploying Yami — Desktop (Linux + Windows)

## Prerequisites
- Node.js 20+
- Git
- GitHub account with this repo

---

## Trigger a build via tag

Create a version tag to kick off GitHub Actions:

```bash
git tag v1.1.0
git push origin v1.1.0
```

GitHub Actions will automatically:
- Build the Linux `.deb` on Ubuntu
- Build the Windows `.exe` + portable on Windows

Watch progress at: https://github.com/Yami-20/yami-app/actions

Downloads appear at: https://github.com/Yami-20/yami-app/releases

---

## Local development

### Web app (React only)
```bash
npm install --legacy-peer-deps
npm start
# Open http://localhost:3000
```

### Desktop app (Electron dev mode)
```bash
npm install --legacy-peer-deps
node server.js &
npm run electron:dev
```

### Build locally

```bash
# Linux .deb
npm run electron:build:linux

# Windows .exe (run on Windows)
npm run electron:build:win
```

---

## yt-dlp (required for streaming)

The CI workflow downloads yt-dlp automatically. For local builds:

**Linux:**
```bash
mkdir -p build-resources
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o build-resources/yt-dlp
chmod a+rx build-resources/yt-dlp
```

**Windows:**
```powershell
Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile "build-resources/yt-dlp.exe"
```

---

## Versioning

Bump `version` in `package.json`, then tag:

```bash
# patch: bug fixes       → 1.1.0 → 1.1.1
# minor: new features    → 1.1.0 → 1.2.0
# major: breaking change → 1.1.0 → 2.0.0

git tag v1.x.x
git push origin v1.x.x
```

---

## Signing (optional)

### Windows code signing
Add to GitHub Secrets:
- `WIN_CSC_LINK` — base64-encoded `.pfx` file
- `WIN_CSC_KEY_PASSWORD` — certificate password

### Self-signed (dev only)
No config needed — the build works unsigned for testing.
