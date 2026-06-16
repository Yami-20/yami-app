const { app, BrowserWindow, ipcMain, globalShortcut, nativeImage } = require('electron');
const path    = require('path');
const { spawn } = require('child_process');

app.commandLine.appendSwitch('no-sandbox');

const isDev = !app.isPackaged;

let mainWindow;
let backendProcess;
let backendRestarts = 0;
const MAX_BACKEND_RESTARTS = 5;

// ── Backend ───────────────────────────────────────────────────────────────────
function startBackend(notifyWindow = false) {
  const serverPath = isDev
    ? path.join(__dirname, '..', 'server.js')
    : path.join(process.resourcesPath, 'server.bundle.js');

  const ytDlpPath = isDev
    ? (process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp')
    : path.join(process.resourcesPath, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

  backendProcess = spawn(process.execPath, [serverPath], {
    env: { ...process.env, PORT: '3001', YTDLP_PATH: ytDlpPath, ELECTRON_RUN_AS_NODE: '1' },
    stdio: 'inherit',
    ...(process.platform === 'win32' ? { windowsHide: true } : {}),
  });

  backendProcess.on('error', (err) => {
    console.error('Backend error:', err);
    if (mainWindow) mainWindow.webContents.send('backend-status', { ok: false, error: err.message });
  });

  backendProcess.on('exit', (code) => {
    if (code === 0 || backendRestarts >= MAX_BACKEND_RESTARTS) return;
    backendRestarts++;
    console.warn(`Backend exited (code ${code}), restarting (${backendRestarts}/${MAX_BACKEND_RESTARTS})…`);
    if (mainWindow) mainWindow.webContents.send('backend-status', { ok: false, restarting: true });
    setTimeout(() => {
      startBackend(true);
    }, 1500 * backendRestarts); // exponential-ish backoff
  });

  if (notifyWindow && mainWindow) {
    setTimeout(() => mainWindow.webContents.send('backend-status', { ok: true }), 2000);
  }
}

// ── Media keys (global shortcuts) ─────────────────────────────────────────────
function registerMediaKeys() {
  const send = (ch) => { if (mainWindow) mainWindow.webContents.send(ch); };
  globalShortcut.register('MediaPlayPause',   () => send('media-play-pause'));
  globalShortcut.register('MediaNextTrack',   () => send('media-next'));
  globalShortcut.register('MediaPreviousTrack', () => send('media-prev'));
  globalShortcut.register('MediaStop',        () => send('media-stop'));
}

// ── IPC handlers ──────────────────────────────────────────────────────────────
ipcMain.on('window-minimize',    () => mainWindow?.minimize());
ipcMain.on('window-maximize',    () => { if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize(); });
ipcMain.on('window-close',       () => mainWindow?.close());
ipcMain.on('backend-restarted',  () => { backendRestarts = 0; });

// ── Window ─────────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 760, minWidth: 800, minHeight: 560,
    backgroundColor: '#080810',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
    },
    icon: path.join(__dirname, '..', 'build-resources', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
  });

  mainWindow.setMenuBarVisibility(false);

  const url = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '..', 'build', 'index.html')}`;
  setTimeout(() => mainWindow.loadURL(url), isDev ? 0 : 1200);

  // Inject CSS after page loads to guarantee inputs are always focusable/typeable
  // Electron sometimes inherits -webkit-user-select:none from OS-level drag regions
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      input, textarea, [contenteditable] {
        -webkit-user-select: text !important;
        user-select: text !important;
        -webkit-app-region: no-drag !important;
      }
    `);
  });
  mainWindow.on('closed', () => { mainWindow = null; });

  // Windows taskbar thumbnail buttons (play/skip controls)
  if (process.platform === 'win32') {
    mainWindow.setThumbarButtons([
      {
        tooltip: 'Previous',
        icon: nativeImage.createFromPath(path.join(__dirname, '..', 'build-resources', 'icon.png')),
        click() { mainWindow?.webContents.send('media-prev'); },
      },
      {
        tooltip: 'Play / Pause',
        icon: nativeImage.createFromPath(path.join(__dirname, '..', 'build-resources', 'icon.png')),
        click() { mainWindow?.webContents.send('media-play-pause'); },
      },
      {
        tooltip: 'Next',
        icon: nativeImage.createFromPath(path.join(__dirname, '..', 'build-resources', 'icon.png')),
        click() { mainWindow?.webContents.send('media-next'); },
      },
    ]);
  }
}

// ── Auto-updater ───────────────────────────────────────────────────────────────
function setupAutoUpdater() {
  if (isDev) return;
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-downloaded', (info) => {
      if (mainWindow) mainWindow.webContents.send('update-downloaded', { version: info.version });
    });
    autoUpdater.on('error', (err) => console.error('Auto-updater error:', err.message));
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 10000);
  } catch { /* electron-updater not available */ }
}

// ── App lifecycle ──────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  startBackend();
  createWindow();
  registerMediaKeys();
  setupAutoUpdater();
  app.on('activate', () => { if (!mainWindow) createWindow(); });
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
  if (backendProcess) backendProcess.kill();
});
