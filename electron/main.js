const { app, BrowserWindow, ipcMain, globalShortcut, nativeImage } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('no-sandbox');

const isDev = !app.isPackaged;

let mainWindow;

// ── Media keys (global shortcuts) ─────────────────────────────────────────────
function registerMediaKeys() {
  const send = (ch) => { if (mainWindow) mainWindow.webContents.send(ch); };
  globalShortcut.register('MediaPlayPause',   () => send('media-play-pause'));
  globalShortcut.register('MediaNextTrack',   () => send('media-next'));
  globalShortcut.register('MediaPreviousTrack', () => send('media-prev'));
  globalShortcut.register('MediaStop',        () => send('media-stop'));
}

// ── IPC handlers ──────────────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => { if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize(); });
ipcMain.on('window-close',    () => mainWindow?.close());

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
    },
    icon: path.join(__dirname, '..', 'build-resources', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
  });

  mainWindow.setMenuBarVisibility(false);

  const url = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '..', 'build', 'index.html')}`;
  mainWindow.loadURL(url);

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
  createWindow();
  registerMediaKeys();
  setupAutoUpdater();
  app.on('activate', () => { if (!mainWindow) createWindow(); });
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
});
