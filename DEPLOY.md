# Deploying Yami

Yami ships to three platforms from one codebase: Linux/Windows via Electron, and Android via Capacitor. All three talk to the same hosted backend on Render — there's no local server to spawn.

## Prerequisites
- Node.js 20+
- For Android: JDK 21, Android SDK (or just let CI build it)

---

## Backend (deploy once)

See [server-deploy/README.md](server-deploy/README.md). Once live, set the URL in `.github/workflows/build.yml` under `env.REACT_APP_BACKEND_URL` — all three CI build jobs read from there.

---

## Trigger a release build

```bash
git tag v1.x.x
git push origin v1.x.x
```

GitHub Actions builds and attaches to the release automatically:
- Linux `.deb`
- Windows `.exe` (installer + portable)
- Android `.apk` (debug-signed)

Watch progress: https://github.com/Yami-20/yami-app/actions

---

## Local development

```bash
npm install --legacy-peer-deps

npm start              # React dev server only, http://localhost:3000
npm run electron:dev   # Electron desktop app
npm run server:dev     # run the backend locally (optional — only if testing backend changes)
```

By default the app points at the production Render backend. To use a local backend instead:

```bash
REACT_APP_BACKEND_URL=http://localhost:3001 npm start
```

### Build locally

```bash
npm run electron:build:linux   # Linux .deb
npm run electron:build:win     # Windows .exe (run on Windows)
npm run cap:build:android      # Android .apk (requires Android SDK)
```

---

## Versioning

```bash
# patch: bug fixes       → 1.1.0 → 1.1.1
# minor: new features    → 1.1.0 → 1.2.0
# major: breaking change → 1.1.0 → 2.0.0

git tag v1.x.x
git push origin v1.x.x
```

---

## Signing (optional)

**Windows:** add `WIN_CSC_LINK` (base64 `.pfx`) and `WIN_CSC_KEY_PASSWORD` to GitHub Secrets.

**Android:** the CI build produces a debug-signed APK. For a Play Store release build, you'll need a release keystore — not currently wired into CI.
