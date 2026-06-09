# Deploying Yami — Desktop + Android

## Prerequisites
- Node.js 20+
- Git
- A GitHub account with this repo pushed

---

## Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "feat: initial yami release"
git remote add origin https://github.com/YOUR_USERNAME/yami-app.git
git push -u origin main
```

---

## Step 2 — Add your app icon

Put these two files in `build-resources/`:
- `icon.png` — 512×512 PNG (purple/pink gradient logo)
- `icon.ico` — Windows icon (convert from PNG at https://convertico.com)

---

## Step 3 — Trigger a build

Create a version tag to kick off GitHub Actions:

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions will automatically:
- Build the Linux .deb on Ubuntu
- Build the Windows .exe on Windows Server
- Build the Android .apk on Ubuntu with Android SDK

Watch progress at: https://github.com/YOUR_USERNAME/yami-app/actions

---

## Step 4 — Download the builds

After ~8-12 minutes, go to:
  https://github.com/YOUR_USERNAME/yami-app/releases

All three files will be attached to the v1.0.0 release automatically.

Or download from the Actions > build run > Artifacts section if you just want to test.

---

## Local development

### Run as web app (React only)
```bash
npm install
npm start
# Open http://localhost:3000
```

### Run as desktop app (Electron dev mode)
```bash
npm install
node server.js &     # start streaming backend
npm run electron:dev
```

### Build desktop locally
```bash
# Linux .deb
npm run electron:build:linux

# Windows .exe (run on Windows or with Wine)
npm run electron:build:win
```

### Android (needs Android Studio)
```bash
npm run build
npm run cap:init       # first time only
npm run cap:add:android  # first time only
npm run cap:sync
npm run cap:open       # opens Android Studio → Run on device/emulator
```

---

## yt-dlp dependency

The streaming backend uses yt-dlp to fetch audio streams.
Users need it installed:

**Linux:**
```bash
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

**Windows:**
Download yt-dlp.exe from https://github.com/yt-dlp/yt-dlp/releases
and place it in a folder that's in your PATH (e.g. C:\Windows\).

**Note:** A future version can bundle yt-dlp inside the app package using
`extraResources` in electron-builder so users don't need to install it.

---

## Signing (optional but recommended)

### Windows
Get a code signing certificate (Sectigo/DigiCert ~$100/yr) and add to GitHub Secrets:
- `WIN_CSC_LINK` — base64-encoded .pfx file
- `WIN_CSC_KEY_PASSWORD` — certificate password

### Android (release APK for Play Store)
Generate a keystore:
```bash
keytool -genkey -v -keystore yami.keystore -alias yami -keyalg RSA -keysize 2048 -validity 10000
```
Add to GitHub Secrets:
- `ANDROID_KEYSTORE_BASE64` — base64 of yami.keystore
- `ANDROID_KEY_ALIAS` — yami
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_PASSWORD`
